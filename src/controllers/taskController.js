import { getAllTasks, getTasksByMeeting, updateTask, deleteTask, getTaskContext } from '../models/taskModel.js';
import { checkMeetingAccess } from '../services/accessService.js';
import { TASK_STATUS } from '../constants.js';

const deny = (res, result) => res.status(result.status).json({ code: result.code, error: result.message });

export const getTasks = (req, res) => {
  const { status, priority, meetingId, search } = req.query;

  // Asking for one meeting's tasks goes through the shared access check (sharing + vault)
  if (meetingId) {
    const access = checkMeetingAccess(req, meetingId, 'viewer');
    if (!access.ok) return deny(res, access);
    return res.json(getTasksByMeeting(access.meeting.id, { status, priority, search }));
  }

  // Otherwise: tasks from meetings I own (vaulted ones excluded)
  res.json(getAllTasks(req.user.id, { status, priority, search }));
};

// Loads the task, then requires editor access on ITS meeting.
// Returns the task, or sends the error response and returns null.
const guardTask = (req, res) => {
  const task = getTaskContext(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return null;
  }

  const access = checkMeetingAccess(req, task.meeting_id, 'editor');
  if (!access.ok) {
    // No access to the meeting means the task must look like it does not exist
    if (access.status === 404) res.status(404).json({ error: 'Task not found' });
    else deny(res, access);
    return null;
  }

  return task;
};

export const patchTask = (req, res) => {
  const task = guardTask(req, res);
  if (!task) return;

  const { title, description, assignee, deadline, priority, status } = req.body;

  if (status !== undefined && ![TASK_STATUS.PENDING, TASK_STATUS.DONE].includes(status)) {
    return res.status(400).json({ error: "status must be '" + TASK_STATUS.PENDING + "' or '" + TASK_STATUS.DONE + "'" });
  }

  const updated = updateTask(task.id, task.meeting_id, { title, description, assignee, deadline, priority, status });
  if (!updated) return res.status(404).json({ error: 'Task not found or no changes provided' });

  res.json({ message: 'Task updated' });
};

export const removeTask = (req, res) => {
  const task = guardTask(req, res);
  if (!task) return;

  deleteTask(task.id, task.meeting_id);
  res.json({ message: 'Task deleted' });
};
