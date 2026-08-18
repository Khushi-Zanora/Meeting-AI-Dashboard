import db from '../config/db.js';

export const createNote = (userId, meetingId, content) => {
  const stmt = db.prepare(`
    INSERT INTO notes (user_id, meeting_id, content)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(userId, meetingId, content);
  return result.lastInsertRowid;
};

export const getNotesByMeeting = (meetingId, userId) => {
  return db.prepare(`
    SELECT * FROM notes
    WHERE meeting_id = ? AND user_id = ?
    ORDER BY is_pinned DESC, created_at DESC
  `).all(meetingId, userId);
};

export const getAllNotesForUser = (userId, search) => {
  let query = 'SELECT * FROM notes WHERE user_id = ?';
  const params = [userId];

  if (search) {
    query += ' AND content LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY is_pinned DESC, created_at DESC';
  return db.prepare(query).all(...params);
};

export const updateNote = (id, userId, { content, isPinned }) => {
  const updates = [];
  const params = [];

  if (content !== undefined) {
    updates.push('content = ?');
    params.push(content);
  }
  if (isPinned !== undefined) {
    updates.push('is_pinned = ?');
    params.push(isPinned ? 1 : 0);
  }

  if (updates.length === 0) return false;

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id, userId);

  const stmt = db.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`);
  return stmt.run(...params).changes > 0;
};

export const deleteNote = (id, userId) => {
  return db.prepare(`DELETE FROM notes WHERE id = ? AND user_id = ?`).run(id, userId).changes > 0;
};