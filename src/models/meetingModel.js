import db from '../config/db.js';

// Uses the highest existing number, not a row count, so deleting an early
// meeting can never cause a duplicate code.
const generateMeetingCode = () => {
  const year = new Date().getFullYear();
  const prefix = 'MTG-' + year + '-';
  const row = db.prepare(
    'SELECT MAX(CAST(SUBSTR(meeting_code, ?) AS INTEGER)) AS maxNum FROM meetings WHERE meeting_code LIKE ?'
  ).get(prefix.length + 1, prefix + '%');
  const next = (row.maxNum || 0) + 1;
  return prefix + String(next).padStart(4, '0');
};

// vault_pin_hash is stripped here so it can never reach a client by accident
const parseMeetingRow = (meeting) => {
  if (!meeting) return meeting;
  const { vault_pin_hash, ...safe } = meeting;
  return {
    ...safe,
    key_points: safe.key_points ? JSON.parse(safe.key_points) : [],
    decisions: safe.decisions ? JSON.parse(safe.decisions) : []
  };
};

// What the vault list is allowed to reveal: that the meeting exists, nothing about its contents
const toVaultListItem = (m) => ({
  id: m.id,
  meeting_code: m.meeting_code,
  title: m.title,
  date: m.date,
  created_at: m.created_at,
  archived_at: m.archived_at,
  is_vaulted: 1
});

export const createMeeting = (userId, { audioPath, transcript, title, date, participants, description, summary, keyPoints, decisions }) => {
  const meetingCode = generateMeetingCode();

  const stmt = db.prepare(`
    INSERT INTO meetings (user_id, meeting_code, title, date, participants, description, audio_path, transcript, summary, key_points, decisions, processing_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
  `);

  const result = stmt.run(
    userId,
    meetingCode,
    title || 'Meeting ' + meetingCode,
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

export const getAllMeetings = (userId, { search, archived, vaulted } = {}) => {
  let query = 'SELECT * FROM meetings WHERE user_id = ?';
  const params = [userId];

  if (vaulted === 'true') {
    query += ' AND is_vaulted = 1';
  } else {
    query += ' AND COALESCE(is_vaulted, 0) = 0'; // default: vaulted meetings stay hidden
  }

  if (archived === 'true') {
    query += ' AND archived_at IS NOT NULL';
  } else if (archived !== 'all') {
    query += ' AND archived_at IS NULL';
  }

  if (search) {
    query += vaulted === 'true' ? ' AND (title LIKE ? OR meeting_code LIKE ?)' : ' AND (title LIKE ? OR meeting_code LIKE ? OR participants LIKE ?)';
    const term = '%' + search + '%';
    if (vaulted === 'true') params.push(term, term); else params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  const rows = db.prepare(query).all(...params);

  return vaulted === 'true' ? rows.map(toVaultListItem) : rows.map(parseMeetingRow);
};

export const getMeetingById = (id, userId) => {
  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ? AND user_id = ?').get(id, userId);
  return parseMeetingRow(meeting);
};

export const updateMeeting = (id, fields) => {
  const allowed = ['title', 'date', 'participants', 'description'];
  const updates = [];
  const params = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(key + ' = ?');
      params.push(fields[key]);
    }
  }

  if (updates.length === 0) return false;

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const stmt = db.prepare('UPDATE meetings SET ' + updates.join(', ') + ' WHERE id = ?');
  return stmt.run(...params).changes > 0;
};

export const deleteMeeting = (id, userId) => {
  return db.prepare('DELETE FROM meetings WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
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

// ---- Vault ----

// Raw row access: the only place the PIN hash is ever read
export const getVaultRecord = (id, userId) => {
  return db.prepare('SELECT is_vaulted, vault_pin_hash FROM meetings WHERE id = ? AND user_id = ?').get(id, userId);
};

export const setMeetingVault = (id, userId, pinHash) => {
  return db.prepare(`
    UPDATE meetings SET is_vaulted = 1, vault_pin_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ? AND COALESCE(is_vaulted, 0) = 0
  `).run(pinHash, id, userId).changes > 0;
};

export const removeMeetingVault = (id, userId) => {
  return db.prepare(`
    UPDATE meetings SET is_vaulted = 0, vault_pin_hash = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ? AND is_vaulted = 1
  `).run(id, userId).changes > 0;
};

// ---- Sharing ----

// Resolves what role (if any) a user has on a meeting. Returns nothing when the user is
// neither the owner nor a collaborator, which callers must treat as "not found".
export const getMeetingAccess = (meetingId, userId) => {
  const row = db.prepare(`
    SELECT m.*,
           CASE WHEN m.user_id = ? THEN 'owner' ELSE c.role END AS access_role,
           u.name AS owner_name
    FROM meetings m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN meeting_collaborators c ON c.meeting_id = m.id AND c.user_id = ?
    WHERE m.id = ? AND (m.user_id = ? OR c.user_id IS NOT NULL)
  `).get(userId, userId, meetingId, userId);

  return parseMeetingRow(row);
};
