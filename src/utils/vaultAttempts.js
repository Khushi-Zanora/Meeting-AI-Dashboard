const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

// In-memory only: counters reset when the server restarts. Fine for this project;
// a production system would keep these in Redis or the database.
const failures = new Map();

const keyFor = (userId, meetingId) => userId + ':' + Number(meetingId);

export const lockoutRemainingMs = (userId, meetingId) => {
  const key = keyFor(userId, meetingId);
  const entry = failures.get(key);
  if (!entry || !entry.lockedUntil) return 0;

  const remaining = entry.lockedUntil - Date.now();
  if (remaining <= 0) {
    failures.delete(key);
    return 0;
  }
  return remaining;
};

export const recordFailure = (userId, meetingId) => {
  const key = keyFor(userId, meetingId);
  const entry = failures.get(key) || { count: 0, lockedUntil: null };

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0;
  }
  failures.set(key, entry);
};

export const clearFailures = (userId, meetingId) => {
  failures.delete(keyFor(userId, meetingId));
};
