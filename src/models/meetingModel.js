import db from '../config/db.js';

const generateMeetingCode = () => {
  const year = new Date().getFullYear();
  const { count } = db.prepare(`
    SELECT COUNT(*) as count FROM meetings WHERE meeting_code LIKE ?
  `).get(`MTG-${year}-%`);
  const nextNumber = String(count + 1).padStart(4, '0');
  return `MTG-${year}-${nextNumber}`;
};

export const createMeeting = (userId, { audioPath, transcript, title, date, participants, description, summary, keyPoints, decisions }) => {
  const meetingCode = generateMeetingCode();

  const stmt = db.prepare(`
    INSERT INTO meetings (user_id, meeting_code, title, date, participants, description, audio_path, transcript, summary, key_points, decisions, processing_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
  `);

  const result = stmt.run(
    userId,
    meetingCode,
    title || `Meeting ${meetingCode}`,
    date || new Date().toISOString(),
    participants || null,
    description || null,
    audioPath,
    transcript,
    summary || null,
    JSON.stringify(keyPoints || []),
    JSON.stringify(decisions || [])
  );

  return { meetingId: result.lastInsertRowid, meetingCode };
};

export const getAllMeetings = (userId, { search, archived } = {}) => {
  let query = 'SELECT * FROM meetings WHERE user_id = ?';
  const params = [userId];

  if (archived === 'true') {
    query += ' AND archived_at IS NOT NULL';
  } else if (archived !== 'all') {
    query += ' AND archived_at IS NULL'; // default: hide archived
  }

  if (search) {
    query += ' AND (title LIKE ? OR meeting_code LIKE ? OR participants LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(...params).map(parseMeetingRow);
};

export const getMeetingById = (id, userId) => {
  const meeting = db.prepare(`SELECT * FROM meetings WHERE id = ? AND user_id = ?`).get(id, userId);
  return parseMeetingRow(meeting);
};

export const updateMeeting = (id, userId, fields) => {
  const allowed = ['title', 'date', 'participants', 'description'];
  const updates = [];
  const params = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }

  if (updates.length === 0) return false;

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id, userId);

  const stmt = db.prepare(`UPDATE meetings SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`);
  return stmt.run(...params).changes > 0;
};

export const deleteMeeting = (id, userId) => {
  return db.prepare(`DELETE FROM meetings WHERE id = ? AND user_id = ?`).run(id, userId).changes > 0;
};

export const archiveMeeting = (id, userId) => {
  return db.prepare(`
    UPDATE meetings SET archived_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ? AND archived_at IS NULL
  `).run(id, userId).changes > 0;
};

export const restoreMeeting = (id, userId) => {
  return db.prepare(`
    UPDATE meetings SET archived_at = NULL
    WHERE id = ? AND user_id = ? AND archived_at IS NOT NULL
  `).run(id, userId).changes > 0;
};

const parseMeetingRow = (meeting) => {
  if (!meeting) return meeting;
  return {
    ...meeting,
    key_points: meeting.key_points ? JSON.parse(meeting.key_points) : [],
    decisions: meeting.decisions ? JSON.parse(meeting.decisions) : []
  };
};