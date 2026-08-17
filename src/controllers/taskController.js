import { getAllTasks, updateTaskStatus } from '../models/taskModel.js';
import { getAllMeetings } from '../models/meetingModel.js';
import { TASK_STATUS } from '../constants.js';

export const getTasks = (req, res) => {
  const userId = req.user.id;
  const { status, priority } = req.query;
  const tasks = getAllTasks(userId, { status, priority });
  res.json(tasks);
};

export const updateTask = (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { status } = req.body;

  if (![TASK_STATUS.PENDING, TASK_STATUS.DONE].includes(status)) {
    return res.status(400).json({
      error: `status must be '${TASK_STATUS.PENDING}' or '${TASK_STATUS.DONE}'`
    });
  }

  const updated = updateTaskStatus(id, userId, status);

  if (!updated) {
    // Same 404 whether the task doesn't exist OR belongs to someone else —
    // never reveal that a task ID is "real but not yours"
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ message: 'Task updated', id, status });
};

export const getMeetings = (req, res) => {
  const userId = req.user.id;
  res.json(getAllMeetings(userId));
};