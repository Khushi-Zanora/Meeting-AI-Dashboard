import { getAllTasks, updateTaskStatus } from '../models/taskModel.js';
import { getAllMeetings } from '../models/meetingModel.js';
import { TASK_STATUS } from '../constants.js';

export const getTasks = (req, res) => {
  const { status, priority } = req.query;
  const tasks = getAllTasks({ status, priority });
  res.json(tasks);
};

export const updateTask = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (![TASK_STATUS.PENDING, TASK_STATUS.DONE].includes(status)) {
    return res.status(400).json({
      error: `status must be '${TASK_STATUS.PENDING}' or '${TASK_STATUS.DONE}'`
    });
  }

  const updated = updateTaskStatus(id, status);

  if (!updated) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ message: 'Task updated', id, status });
};

export const getMeetings = (req, res) => {
  res.json(getAllMeetings());
};