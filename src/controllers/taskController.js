import { getAllTasks, updateTaskStatus } from '../models/taskModel.js';
import { TASK_STATUS } from '../constants.js';

export const getTasks = (req, res) => {
  const { status, priority } = req.query;
  res.json(getAllTasks(req.user.id, { status, priority }));
};

export const updateTask = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (![TASK_STATUS.PENDING, TASK_STATUS.DONE].includes(status)) {
    return res.status(400).json({ error: `status must be '${TASK_STATUS.PENDING}' or '${TASK_STATUS.DONE}'` });
  }

  const updated = updateTaskStatus(id, req.user.id, status);
  if (!updated) return res.status(404).json({ error: 'Task not found' });

  res.json({ message: 'Task updated', id, status });
};