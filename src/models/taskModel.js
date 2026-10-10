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

// Global list: tasks from meetings I own, vaulted ones excluded
export const getAllTasks = (userId, { status, priority, search } = {}) => {
  let query = 'SELECT * FROM tasks WHERE user_id = ? AND meeting_id NOT IN (SELECT id FROM meetings WHERE is_vaulted = 1)';
  const params = [userId];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  if (search) { query += ' AND title LIKE ?'; params.push('%' + search + '%'); }

  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(...params);
};

// Tasks inside ONE meeting. The caller must already have verified access.
export const getTasksByMeeting = (meetingId, { status, priority, search } = {}) => {
  let query = 'SELECT * FROM tasks WHERE meeting_id = ?';
  const params = [meetingId];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  if (search) { query += ' AND title LIKE ?'; params.push('%' + search + '%'); }

  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(...params);
};

// Just enough to find which meeting a task belongs to, so the controller can check access to it
export const getTaskContext = (id) => {
  return db.prepare('SELECT id, meeting_id FROM tasks WHERE id = ?').get(id);
};

export const updateTask = (id, meetingId, fields) => {
  const allowed = ['title', 'description', 'assignee', 'deadline', 'priority', 'status'];
  const updates = [];
  const params = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(key + ' = ?');
      params.push(fields[key]);
    }
  }

  if (fields.status !== undefined) {
    updates.push('completed_at = ?');
    params.push(fields.status === 'done' ? new Date().toISOString() : null);
  }

  if (updates.length === 0) return false;

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id, meetingId);

  const stmt = db.prepare('UPDATE tasks SET ' + updates.join(', ') + ' WHERE id = ? AND meeting_id = ?');
  return stmt.run(...params).changes > 0;
};

export const deleteTask = (id, meetingId) => {
  return db.prepare('DELETE FROM tasks WHERE id = ? AND meeting_id = ?').run(id, meetingId).changes > 0;
};
