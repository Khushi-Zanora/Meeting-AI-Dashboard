import db from '../config/db.js';

export const createMeeting = (filename, transcript) => {
  const stmt = db.prepare(`
    INSERT INTO meetings (filename, transcript)
    VALUES (?, ?)
  `);
  const result = stmt.run(filename, transcript);
  return result.lastInsertRowid; // the new meeting's id
};

export const getAllMeetings = () => {
  const stmt = db.prepare(`SELECT * FROM meetings ORDER BY created_at DESC`);
  return stmt.all();
};