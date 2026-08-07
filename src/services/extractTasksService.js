import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const EXTRACTION_PROMPT = `Extract action items from this meeting transcript.

Return ONLY valid JSON in exactly this shape, with no other wrapper:
{ "tasks": [{ "task": "", "owner": "", "deadline": "", "priority": "high|medium|low" }] }

Rules:
- Always use the key "tasks" for the array, even if there is only one task or zero tasks.
- Include every action item mentioned or clearly implied, even if owner or deadline is unclear.
- If no owner is mentioned, use an empty string "" for owner — do not skip the task.
- If no deadline is mentioned, use an empty string "" for deadline — do not skip the task.
- If priority isn't stated, infer "medium" as the default.
- If there are no action items at all, return { "tasks": [] }.
- Return valid JSON only, no extra text, no markdown formatting.`;

/**
 * Sends a transcript to the LLM and extracts structured action items.
 * @param {string} transcriptText
 * @returns {Promise<Array<{task: string, owner: string, deadline: string, priority: string}>>}
 */
export const extractTasks = async (transcriptText) => {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: EXTRACTION_PROMPT },
      { role: 'user', content: transcriptText }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });

  const rawContent = response.choices[0].message.content;

  return parseTasksSafely(rawContent);
};

/**
 * Defensive JSON parsing — LLMs sometimes wrap output in markdown fences
 * or return a single object instead of an array.
 */
const parseTasksSafely = (rawContent) => {
  let cleaned = rawContent.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse LLM response as JSON:', rawContent);
    throw new Error('AI returned malformed JSON');
  }

  // Shape 1: already an array
  if (Array.isArray(parsed)) return parsed;

  // Shape 2: { tasks: [...] }
  if (Array.isArray(parsed.tasks)) return parsed.tasks;

  // Shape 3: search one level deep for the first array value in the object
  // (covers "action_items", "result", or any other key name the model invents)
  const firstArrayValue = Object.values(parsed).find(v => Array.isArray(v));
  if (firstArrayValue) return firstArrayValue;

  // Shape 4: a single task object instead of an array — wrap it
  if (parsed.task && typeof parsed.task === 'string') {
    return [parsed];
  }

  console.error('Unrecognized AI response shape:', parsed);
  throw new Error('AI response was not in the expected array format');
};