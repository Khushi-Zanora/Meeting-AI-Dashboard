import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../models/userModel.js';
import { createSession } from '../models/sessionModel.js';
import { validateSignupInput, validateLoginInput } from '../validators/authValidators.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/tokenUtils.js';

const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const signup = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  const { valid, errors } = validateSignupInput({ name, email, password, confirmPassword });
  if (!valid) {
    return res.status(422).json({ success: false, message: errors[0], errors });
  }

  const existingUser = findUserByEmail(email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = createUser(name.trim(), email.toLowerCase(), passwordHash);

  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS).toISOString();
  createSession(userId, hashToken(refreshToken), expiresAt);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS
  });

  return res.status(201).json({
    success: true,
    message: 'Account created successfully',
    accessToken,
    user: { id: userId, name: name.trim(), email: email.toLowerCase() }
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const { valid, errors } = validateLoginInput({ email, password });
  if (!valid) {
    return res.status(422).json({ success: false, message: errors[0], errors });
  }

  const user = findUserByEmail(email.toLowerCase().trim());

  // Deliberately vague error — never reveal whether the email itself exists
  const invalidCredsResponse = () =>
    res.status(401).json({ success: false, message: 'Invalid email or password' });

  if (!user) return invalidCredsResponse();

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) return invalidCredsResponse();

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS).toISOString();
  createSession(user.id, hashToken(refreshToken), expiresAt);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS
  });

  return res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    accessToken,
    user: { id: user.id, name: user.name, email: user.email }
  });
};

import jwt from 'jsonwebtoken';
import { findSessionByUserAndHash, deleteSessionByHash } from '../models/sessionModel.js';

export const refresh = (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ success: false, message: 'No refresh token provided' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
  }

  const session = findSessionByUserAndHash(decoded.userId, hashToken(token));
  if (!session) {
    return res.status(401).json({ success: false, message: 'Session not recognized, please log in again' });
  }

  return res.json({ success: true, accessToken: generateAccessToken(decoded.userId) });
};

export const logout = (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) deleteSessionByHash(hashToken(token));
  res.clearCookie('refreshToken');
  return res.json({ success: true, message: 'Logged out' });
};