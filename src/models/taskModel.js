import db from '../config/db.js';

export const createTasksForMeeting = (meetingId, tasks) => {
  const insert = db.prepare(`
    INSERT INTO tasks (meeting_id, task, owner, deadline, priority)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Wrap in a transaction — either all tasks save, or none do
  const insertMany = db.transaction((tasks) => {
    for (const t of tasks) {
      insert.run(meetingId, t.task, t.owner || '', t.deadline || '', t.priority || 'medium');
    }
  });

  insertMany(tasks);
};

export const getAllTasks = ({ status, priority } = {}) => {
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (priority) {
    query += ' AND priority = ?';
    params.push(priority);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  return stmt.all(...params);
};

export const updateTaskStatus = (id, status) => {
  const stmt = db.prepare(`UPDATE tasks SET status = ? WHERE id = ?`);
  const result = stmt.run(status, id);
  return result.changes > 0; // true only if a row actually existed and changed
};