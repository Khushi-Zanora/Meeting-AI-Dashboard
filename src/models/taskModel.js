import db from '../config/db.js';

export const createTasksForMeeting = (userId, meetingId, tasks) => {
  const insert = db.prepare(`
    INSERT INTO tasks (user_id, meeting_id, title, description, assignee, deadline, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((tasks) => {
    for (const t of tasks) {
      insert.run(userId, meetingId, t.title, t.description || null, t.assignee || '', t.deadline || '', t.priority || 'medium');
    }
  });

  insertMany(tasks);
};

export const getAllTasks = (userId, { status, priority, meetingId } = {}) => {
  let query = 'SELECT * FROM tasks WHERE user_id = ?';
  const params = [userId];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  if (meetingId) { query += ' AND meeting_id = ?'; params.push(meetingId); }

  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(...params);
};

export const updateTaskStatus = (id, userId, status) => {
  const completedAt = status === 'done' ? new Date().toISOString() : null;
  const stmt = db.prepare(`
    UPDATE tasks
    SET status = ?, completed_at = ?
    WHERE id = ? AND user_id = ?
  `);
  const result = stmt.run(status, completedAt, id, userId);
  return result.changes > 0;
};