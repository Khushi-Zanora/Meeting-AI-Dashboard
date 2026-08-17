import db from '../config/db.js';

export const createMeeting = (userId, audioPath, transcript) => {
  const stmt = db.prepare(`
    INSERT INTO meetings (user_id, audio_path, transcript, processing_status)
    VALUES (?, ?, ?, 'completed')
  `);
  const result = stmt.run(userId, audioPath, transcript);
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