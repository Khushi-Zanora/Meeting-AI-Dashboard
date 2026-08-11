import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// Refresh tokens are high-entropy random strings (unlike passwords), so a fast
// cryptographic hash is the right tool here — not bcrypt, which is deliberately
// slow and meant for low-entropy human-chosen secrets.
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};