import jwt from 'jsonwebtoken';

// Signed with a DIFFERENT key than login tokens, so a vault token can never be
// accepted as a login token (and vice versa).
const vaultSecret = () => process.env.JWT_SECRET + ':vault';

export const VAULT_TOKEN_TTL_SECONDS = 600; // 10 minutes

export const generateVaultToken = (userId, meetingId) => {
  return jwt.sign(
    { userId, meetingId: Number(meetingId) },
    vaultSecret(),
    { expiresIn: VAULT_TOKEN_TTL_SECONDS }
  );
};

// True only if the request carries a valid, unexpired vault token
// issued to THIS user for THIS meeting.
export const hasVaultAccess = (req, meetingId) => {
  const token = req.headers['x-vault-token'];
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, vaultSecret());
    return decoded.userId === req.user.id && decoded.meetingId === Number(meetingId);
  } catch {
    return false;
  }
};
