import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const EXTRACTION_PROMPT = `You are analyzing a meeting transcript. Extract structured information and return ONLY valid JSON in exactly this shape:

{
  "summary": "",
  "key_points": [""],
  "decisions": [""],
  "action_items": [
    { "title": "", "description": "", "assignee": "", "deadline": "", "priority": "high|medium|low" }
  ]
}

Rules:
- "summary" is a 2-4 sentence overview of what the meeting was about.
- "key_points" is a list of the most important points discussed, as short strings.
- "decisions" is a list of concrete decisions that were made, as short strings.
- "action_items" includes every task mentioned or clearly implied, even if some fields are unclear.
- If no assignee is mentioned for a task, use "" — do not skip the task.
- If no deadline is mentioned, use "" — do not skip the task.
- If priority isn't stated, infer "medium" as the default.
- If there are no key points, decisions, or action items, return empty arrays for them — never omit the keys.
- Do not invent facts, deadlines, or participants that are not in the transcript.
- Return valid JSON only, no extra text, no markdown formatting.`;

export const extractMeetingData = async (transcriptText) => {
  const response = await groq.chat.completions.create({
    model: process.env.GROQ_LLM_MODEL,
    messages: [
      { role: 'system', content: EXTRACTION_PROMPT },
      { role: 'user', content: transcriptText }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });

  const rawContent = response.choices[0].message.content;
  return parseAndValidate(rawContent);
};

const parseAndValidate = (rawContent) => {
  let cleaned = rawContent.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('AI returned invalid JSON:', rawContent);
    throw new Error('AI returned malformed JSON');
  }

  // Defensive defaults — never trust the model produced every key correctly
  const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
  const keyPoints = Array.isArray(parsed.key_points) ? parsed.key_points : [];
  const decisions = Array.isArray(parsed.decisions) ? parsed.decisions : [];

  let actionItems = Array.isArray(parsed.action_items) ? parsed.action_items : [];

  // Filter out any malformed action items rather than failing the whole request
  actionItems = actionItems
    .filter((item) => item && typeof item.title === 'string' && item.title.trim().length > 0)
    .map((item) => ({
      title: item.title.trim(),
      description: typeof item.description === 'string' ? item.description : null,
      assignee: typeof item.assignee === 'string' ? item.assignee : '',
      deadline: typeof item.deadline === 'string' ? item.deadline : '',
      priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium'
    }));

  return { summary, keyPoints, decisions, actionItems };
};