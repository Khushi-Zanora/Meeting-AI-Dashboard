import db from '../config/db.js';

// userId here is the AUTHOR of the note
export const createNote = (userId, meetingId, content) => {
  const stmt = db.prepare(`
    INSERT INTO notes (user_id, meeting_id, content)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(userId, meetingId, content);
  return result.lastInsertRowid;
};

// Notes inside ONE meeting, from every author. The caller must already have verified access.
export const getNotesByMeeting = (meetingId, { search } = {}) => {
  let query = `
    SELECT n.*, u.name AS author_name
    FROM notes n
    JOIN users u ON u.id = n.user_id
    WHERE n.meeting_id = ?
  `;
  const params = [meetingId];

  if (search) { query += ' AND n.content LIKE ?'; params.push('%' + search + '%'); }

  query += ' ORDER BY n.is_pinned DESC, n.created_at DESC';
  return db.prepare(query).all(...params);
};

// Global list: notes (any author) in meetings I own, vaulted ones excluded
export const getAllNotesForUser = (userId, { search } = {}) => {
  let query = `
    SELECT n.*, u.name AS author_name
    FROM notes n
    JOIN users u ON u.id = n.user_id
    JOIN meetings m ON m.id = n.meeting_id
    WHERE m.user_id = ? AND COALESCE(m.is_vaulted, 0) = 0
  `;
  const params = [userId];

  if (search) { query += ' AND n.content LIKE ?'; params.push('%' + search + '%'); }

  query += ' ORDER BY n.is_pinned DESC, n.created_at DESC';
  return db.prepare(query).all(...params);
};

// Author and meeting of a note, so the controller can check both
export const getNoteContext = (id) => {
  return db.prepare('SELECT id, meeting_id, user_id FROM notes WHERE id = ?').get(id);
};

export const updateNote = (id, meetingId, { content, isPinned }) => {
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
  params.push(id, meetingId);

  const stmt = db.prepare('UPDATE notes SET ' + updates.join(', ') + ' WHERE id = ? AND meeting_id = ?');
  return stmt.run(...params).changes > 0;
};

export const deleteNote = (id, meetingId) => {
  return db.prepare('DELETE FROM notes WHERE id = ? AND meeting_id = ?').run(id, meetingId).changes > 0;
};
