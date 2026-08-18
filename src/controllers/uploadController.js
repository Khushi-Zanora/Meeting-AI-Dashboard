import { transcribeAudio } from '../services/transcribeService.js';
import { extractMeetingData } from '../services/aiService.js';
import { createMeeting } from '../models/meetingModel.js';
import { createTasksForMeeting } from '../models/taskModel.js';

export const handleUpload = async (req, res) => {
  const userId = req.user.id;
  const { transcriptText, title, date, participants, description } = req.body;
  const audioFile = req.file;

  if (!audioFile && !transcriptText) {
    return res.status(400).json({ error: 'Provide either an audio file or transcriptText' });
  }

  try {
    let transcript;
    let audioPath = null;

    if (audioFile) {
      audioPath = audioFile.filename;
      transcript = await transcribeAudio(audioFile.path);
    } else {
      transcript = transcriptText;
    }

    const { summary, keyPoints, decisions, actionItems } = await extractMeetingData(transcript);

    const { meetingId, meetingCode } = createMeeting(userId, {
      audioPath, transcript, title, date, participants, description,
      summary, keyPoints, decisions
    });

    if (actionItems.length > 0) {
      createTasksForMeeting(userId, meetingId, actionItems); // no mapping needed — shapes already match
    }

    return res.status(201).json({
      message: 'Meeting processed successfully',
      meetingId,
      meetingCode,
      summary,
      keyPoints,
      decisions,
      tasksExtracted: actionItems.length,
      tasks: actionItems
    });

  } catch (err) {
    console.error('Upload processing failed:', err);
    return res.status(500).json({ error: 'Failed to process meeting', details: err.message });
  }
};