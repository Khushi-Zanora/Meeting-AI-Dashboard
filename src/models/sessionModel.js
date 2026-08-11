import db from '../config/db.js';

export const createSession = (userId, refreshTokenHash, expiresAt) => {
  const stmt = db.prepare(`
    INSERT INTO sessions (user_id, refresh_token_hash, expires_at)
    VALUES (?, ?, ?)
  `);
  stmt.run(userId, refreshTokenHash, expiresAt);
};