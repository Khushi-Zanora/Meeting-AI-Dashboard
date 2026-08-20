import db from '../config/db.js';

export const createSession = (userId, refreshTokenHash, expiresAt) => {
  const stmt = db.prepare(`
    INSERT INTO sessions (user_id, refresh_token_hash, expires_at)
    VALUES (?, ?, ?)
  `);
  stmt.run(userId, refreshTokenHash, expiresAt);
};

export const findSessionByUserAndHash = (userId, tokenHash) => {
  return db.prepare(`
    SELECT * FROM sessions WHERE user_id = ? AND refresh_token_hash = ? AND expires_at > CURRENT_TIMESTAMP
  `).get(userId, tokenHash);
};

export const deleteSessionByHash = (tokenHash) => {
  return db.prepare(`DELETE FROM sessions WHERE refresh_token_hash = ?`).run(tokenHash).changes > 0;
};