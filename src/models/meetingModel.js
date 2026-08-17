import db from '../config/db.js';

export const createMeeting = (userId, filename, transcript) => {
  const stmt = db.prepare(`
    INSERT INTO meetings (user_id, filename, transcript)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(userId, filename, transcript);
  return result.lastInsertRowid;
};

export const getAllMeetings = (userId) => {
  const stmt = db.prepare(`
    SELECT * FROM meetings
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(userId);
};