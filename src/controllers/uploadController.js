import { transcribeAudio } from '../services/transcribeService.js';
import { extractTasks } from '../services/extractTasksService.js';
import { createMeeting } from '../models/meetingModel.js';
import { createTasksForMeeting } from '../models/taskModel.js';

export const handleUpload = async (req, res) => {
  const userId = req.user.id;
  const { transcriptText } = req.body;
  const audioFile = req.file;

  if (!audioFile && !transcriptText) {
    return res.status(400).json({
      error: 'Provide either an audio file or transcriptText'
    });
  }

  try {
    let transcript;
    let filename = null;

    if (audioFile) {
      filename = audioFile.filename;
      transcript = await transcribeAudio(audioFile.path);
    } else {
      transcript = transcriptText;
    }

    const meetingId = createMeeting(userId, filename, transcript);
    const rawTasks = await extractTasks(transcript);

    // Temporary mapping — extractTasksService still returns the pre-Stage-8 shape.
    // Stage 8 will update the AI service itself to emit { title, description, assignee, ... }
    // directly, and this mapping step will be removed.
    const mappedTasks = rawTasks.map((t) => ({
      title: t.task,
      description: null,
      assignee: t.owner,
      deadline: t.deadline,
      priority: t.priority
    }));

    if (mappedTasks.length > 0) {
      createTasksForMeeting(userId, meetingId, mappedTasks);
    }

    return res.status(201).json({
      message: 'Meeting processed successfully',
      meetingId,
      tasksExtracted: mappedTasks.length,
      tasks: mappedTasks
    });

  } catch (err) {
    console.error('Upload processing failed:', err);
    return res.status(500).json({
      error: 'Failed to process meeting',
      details: err.message
    });
  }
};