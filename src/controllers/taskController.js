import { getAllTasks, updateTask, deleteTask } from '../models/taskModel.js';
import { TASK_STATUS } from '../constants.js';

export const getTasks = (req, res) => {
  const { status, priority, meetingId, search } = req.query;
  res.json(getAllTasks(req.user.id, { status, priority, meetingId, search }));
};

export const patchTask = (req, res) => {
  const { title, description, assignee, deadline, priority, status } = req.body;

  if (status !== undefined && ![TASK_STATUS.PENDING, TASK_STATUS.DONE].includes(status)) {
    return res.status(400).json({ error: `status must be '${TASK_STATUS.PENDING}' or '${TASK_STATUS.DONE}'` });
  }

  const updated = updateTask(req.params.id, req.user.id, { title, description, assignee, deadline, priority, status });
  if (!updated) return res.status(404).json({ error: 'Task not found or no changes provided' });

  res.json({ message: 'Task updated' });
};

export const removeTask = (req, res) => {
  const deleted = deleteTask(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task deleted' });
};