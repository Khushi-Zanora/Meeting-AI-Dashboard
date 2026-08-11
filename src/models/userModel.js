import db from '../config/db.js';

export const createUser = (name, email, passwordHash) => {
  const stmt = db.prepare(`
    INSERT INTO users (name, email, password_hash)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(name, email, passwordHash);
  return result.lastInsertRowid;
};

export const findUserByEmail = (email) => {
  const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
  return stmt.get(email);
};

// Deliberately excludes password_hash — this is what the frontend/response ever sees
// export const findUserById = (id) => {
//   const stmt = db.prepare(`SELECT id, name, email, phone, profile_image, created_at FROM users WHERE id = ?`);
//   return stmt.get(id);
// };