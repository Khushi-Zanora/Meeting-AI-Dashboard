import { getMeetingAccess } from '../models/meetingModel.js';
import { hasVaultAccess } from '../utils/vaultToken.js';

const RANK = { viewer: 1, editor: 2, owner: 3 };

const NOT_FOUND = { ok: false, status: 404, code: 'NOT_FOUND', message: 'Meeting not found' };

// The one place that decides "may this user do this to this meeting?".
// Returns { ok: true, meeting, role } or { ok: false, status, code, message }.
export const checkMeetingAccess = (req, meetingId, minRole = 'viewer') => {
  const meeting = getMeetingAccess(meetingId, req.user.id);
  if (!meeting) return NOT_FOUND;

  if (meeting.is_vaulted) {
    // Only the owner can ever see inside a vaulted meeting. For everyone else it does not exist.
    if (meeting.access_role !== 'owner') return NOT_FOUND;

    if (!hasVaultAccess(req, meeting.id)) {
      return {
        ok: false,
        status: 403,
        code: 'VAULT_LOCKED',
        message: 'This meeting is in the vault. Enter your PIN to unlock it.'
      };
    }
  }

  // Written as a negated >= so an unknown role fails closed instead of slipping through
  if (!(RANK[meeting.access_role] >= RANK[minRole])) {
    return { ok: false, status: 403, code: 'FORBIDDEN', message: 'You do not have permission to do that.' };
  }

  return { ok: true, meeting, role: meeting.access_role };
};
