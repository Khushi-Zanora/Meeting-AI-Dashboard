import bcrypt from 'bcryptjs';
import {
  getAllMeetings, getMeetingById, getMeetingAccess, updateMeeting, deleteMeeting,
  archiveMeeting, restoreMeeting,
  getVaultRecord, setMeetingVault, removeMeetingVault
} from '../models/meetingModel.js';
import { generateVaultToken, VAULT_TOKEN_TTL_SECONDS } from '../utils/vaultToken.js';
import { lockoutRemainingMs, recordFailure, clearFailures } from '../utils/vaultAttempts.js';

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 32;

export const listMeetings = (req, res) => {
  const { search, archived, vaulted } = req.query;
  const meetings = getAllMeetings(req.user.id, { search, archived, vaulted });
  res.json({ success: true, meetings });
};

// requireVaultAccess has already loaded the meeting and confirmed access
export const getMeeting = (req, res) => {
  res.json({ success: true, meeting: req.meeting });
};

export const patchMeeting = (req, res) => {
  const { title, date, participants, description } = req.body;
  const updated = updateMeeting(req.meeting.id, { title, date, participants, description });
  if (!updated) return res.status(404).json({ success: false, message: 'Meeting not found or no changes provided' });
  res.json({ success: true, message: 'Meeting updated' });
};

// Deliberately NOT vault-guarded: a forgotten PIN should never make a meeting undeletable
export const removeMeeting = (req, res) => {
  const access = getMeetingAccess(req.params.id, req.user.id);
  if (!access) return res.status(404).json({ success: false, message: 'Meeting not found' });
  if (access.access_role !== 'owner') {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only the owner can delete a meeting.' });
  }

  const deleted = deleteMeeting(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ success: false, message: 'Meeting not found' });
  res.json({ success: true, message: 'Meeting deleted' });
};

export const archiveMeetingHandler = (req, res) => {
  const archived = archiveMeeting(req.params.id, req.user.id);
  if (!archived) return res.status(404).json({ success: false, message: 'Meeting not found or already archived' });
  res.json({ success: true, message: 'Meeting archived' });
};

export const restoreMeetingHandler = (req, res) => {
  const restored = restoreMeeting(req.params.id, req.user.id);
  if (!restored) return res.status(404).json({ success: false, message: 'Meeting not found or not archived' });
  res.json({ success: true, message: 'Meeting restored' });
};

// ---- Vault ----

export const lockInVault = async (req, res) => {
  const { pin } = req.body;

  if (typeof pin !== 'string' || pin.length < MIN_PIN_LENGTH || pin.length > MAX_PIN_LENGTH) {
    return res.status(422).json({
      success: false,
      message: 'PIN must be between ' + MIN_PIN_LENGTH + ' and ' + MAX_PIN_LENGTH + ' characters'
    });
  }

  const meeting = getMeetingById(req.params.id, req.user.id);
  if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
  if (meeting.is_vaulted) return res.status(409).json({ success: false, message: 'This meeting is already in the vault' });

  const pinHash = await bcrypt.hash(pin, 10);
  setMeetingVault(req.params.id, req.user.id, pinHash);

  res.json({ success: true, message: 'Meeting moved to the vault' });
};

// Shared PIN check for unlock and un-vault. Returns true on success;
// otherwise it has already sent the error response and returns false.
const verifyPin = async (req, res) => {
  const record = getVaultRecord(req.params.id, req.user.id);

  if (!record) {
    res.status(404).json({ success: false, message: 'Meeting not found' });
    return false;
  }
  if (!record.is_vaulted) {
    res.status(409).json({ success: false, message: 'This meeting is not in the vault' });
    return false;
  }

  const remainingMs = lockoutRemainingMs(req.user.id, req.params.id);
  if (remainingMs > 0) {
    res.status(429).json({
      success: false,
      message: 'Too many incorrect attempts. Try again in ' + Math.ceil(remainingMs / 60000) + ' minute(s).'
    });
    return false;
  }

  const { pin } = req.body;
  const correct = typeof pin === 'string' && (await bcrypt.compare(pin, record.vault_pin_hash));

  if (!correct) {
    recordFailure(req.user.id, req.params.id);
    res.status(401).json({ success: false, message: 'Incorrect PIN' });
    return false;
  }

  clearFailures(req.user.id, req.params.id);
  return true;
};

export const unlockVault = async (req, res) => {
  if (!(await verifyPin(req, res))) return;

  res.json({
    success: true,
    vaultToken: generateVaultToken(req.user.id, req.params.id),
    expiresInSeconds: VAULT_TOKEN_TTL_SECONDS
  });
};

export const removeFromVault = async (req, res) => {
  if (!(await verifyPin(req, res))) return;

  removeMeetingVault(req.params.id, req.user.id);
  res.json({ success: true, message: 'Meeting removed from the vault' });
};
