// Vault tokens live in memory only (never localStorage/sessionStorage).
// Refreshing the page forgets them, so a vaulted meeting always needs the PIN again.
const tokens = new Map(); // meetingId -> { token, expiresAt }

export const setVaultToken = (meetingId, token, expiresInSeconds) => {
  tokens.set(String(meetingId), { token, expiresAt: Date.now() + expiresInSeconds * 1000 });
};

export const getVaultToken = (meetingId) => {
  const key = String(meetingId);
  const entry = tokens.get(key);
  if (!entry) return null;

  // Treat the token as expired 5 seconds early so a request never races the expiry
  if (Date.now() >= entry.expiresAt - 5000) {
    tokens.delete(key);
    return null;
  }
  return entry.token;
};

export const clearVaultToken = (meetingId) => { tokens.delete(String(meetingId)); };
export const clearAllVaultTokens = () => { tokens.clear(); };
