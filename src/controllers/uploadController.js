import { transcribeAudio } from '../services/transcribeService.js';
import { extractTasks } from '../services/extractTasksService.js';
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

    const { meetingId, meetingCode } = createMeeting(userId, {
      audioPath, transcript, title, date, participants, description
    });

    const rawTasks = await extractTasks(transcript);
    const mappedTasks = rawTasks.map((t) => ({
      title: t.task, description: null, assignee: t.owner, deadline: t.deadline, priority: t.priority
    }));

    if (mappedTasks.length > 0) {
      createTasksForMeeting(userId, meetingId, mappedTasks);
    }

    return res.status(201).json({
      message: 'Meeting processed successfully',
      meetingId,
      meetingCode,
      tasksExtracted: mappedTasks.length,
      tasks: mappedTasks
    });

  } catch (err) {
    console.error('Upload processing failed:', err);
    return res.status(500).json({ error: 'Failed to process meeting', details: err.message });
  }
};