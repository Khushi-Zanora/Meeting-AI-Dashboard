import { transcribeAudio } from '../services/transcribeService.js';
import { extractTasks } from '../services/extractTasksService.js';
import { createMeeting } from '../models/meetingModel.js';
import { createTasksForMeeting } from '../models/taskModel.js';

export const handleUpload = async (req, res) => {
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

    const meetingId = createMeeting(filename, transcript);
    const tasks = await extractTasks(transcript);

    if (tasks.length > 0) {
      createTasksForMeeting(meetingId, tasks);
    }

    return res.status(201).json({
      message: 'Meeting processed successfully',
      meetingId,
      tasksExtracted: tasks.length,
      tasks
    });

  } catch (err) {
    console.error('Upload processing failed:', err);
    return res.status(500).json({
      error: 'Failed to process meeting',
      details: err.message
    });
  }
};