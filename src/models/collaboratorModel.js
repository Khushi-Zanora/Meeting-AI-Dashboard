import db from '../config/db.js';

export const addCollaborator = (meetingId, userId, role, invitedBy) => {
  db.prepare(`
    INSERT INTO meeting_collaborators (meeting_id, user_id, role, invited_by)
    VALUES (?, ?, ?, ?)
  `).run(meetingId, userId, role, invitedBy);
};

export const findCollaborator = (meetingId, userId) => {
  return db.prepare('SELECT * FROM meeting_collaborators WHERE meeting_id = ? AND user_id = ?').get(meetingId, userId);
};

export const listCollaborators = (meetingId) => {
  return db.prepare(`
    SELECT c.user_id, u.name, u.email, c.role, c.created_at
    FROM meeting_collaborators c
    JOIN users u ON u.id = c.user_id
    WHERE c.meeting_id = ?
    ORDER BY c.created_at ASC
  `).all(meetingId);
};

export const updateCollaboratorRole = (meetingId, userId, role) => {
  return db.prepare('UPDATE meeting_collaborators SET role = ? WHERE meeting_id = ? AND user_id = ?')
    .run(role, meetingId, userId).changes > 0;
};

export const removeCollaborator = (meetingId, userId) => {
  return db.prepare('DELETE FROM meeting_collaborators WHERE meeting_id = ? AND user_id = ?')
    .run(meetingId, userId).changes > 0;
};

// Meetings other people shared with me. Vaulted and archived ones are hidden.
export const getSharedMeetings = (userId) => {
  return db.prepare(`
    SELECT m.id, m.meeting_code, m.title, m.date, m.created_at,
           c.role AS access_role, u.name AS owner_name
    FROM meeting_collaborators c
    JOIN meetings m ON m.id = c.meeting_id
    JOIN users u ON u.id = m.user_id
    WHERE c.user_id = ? AND COALESCE(m.is_vaulted, 0) = 0 AND m.archived_at IS NULL
    ORDER BY c.created_at DESC
  `).all(userId);
};
