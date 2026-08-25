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

export const getAllTasks = (userId, { status, priority, meetingId, search } = {}) => {
  let query = 'SELECT * FROM tasks WHERE user_id = ?';
  const params = [userId];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  if (meetingId) { query += ' AND meeting_id = ?'; params.push(meetingId); }
  if (search) { query += ' AND title LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(...params);
};

export const updateTask = (id, userId, fields) => {
  const allowed = ['title', 'description', 'assignee', 'deadline', 'priority', 'status'];
  const updates = [];
  const params = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }

  // completed_at tracks status changes specifically, so it's handled separately
  // from the generic loop above rather than being a directly-settable field
  if (fields.status !== undefined) {
    updates.push('completed_at = ?');
    params.push(fields.status === 'done' ? new Date().toISOString() : null);
  }

  if (updates.length === 0) return false;

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id, userId);

  const stmt = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`);
  return stmt.run(...params).changes > 0;
};

export const deleteTask = (id, userId) => {
  return db.prepare(`DELETE FROM tasks WHERE id = ? AND user_id = ?`).run(id, userId).changes > 0;
};