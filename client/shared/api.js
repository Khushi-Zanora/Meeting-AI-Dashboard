import { getAccessToken, setAccessToken } from './auth.js';
import { getVaultToken } from './vault.js';

const BASE = '/api';

const AUTH_FAILURE_CODES = ['AUTH_REQUIRED', 'TOKEN_EXPIRED', 'TOKEN_INVALID'];

// A 401 only means "refresh your login" when it came from the auth middleware.
// A wrong vault PIN is also a 401 and must NOT trigger refresh-and-retry,
// because the retry would count as a second failed PIN attempt.
const isAuthFailure = async (res) => {
  if (res.status !== 401) return false;
  const body = await res.clone().json().catch(() => ({}));
  return AUTH_FAILURE_CODES.includes(body.code);
};

// Pass { vaultMeetingId } to attach that meeting's vault token (if we hold a valid one)
export const apiFetch = async (path, options = {}) => {
  const { vaultMeetingId, ...fetchOptions } = options;
  const isFormData = fetchOptions.body instanceof FormData;
  const vaultToken = vaultMeetingId ? getVaultToken(vaultMeetingId) : null;

  const request = (token) => fetch(BASE + path, {
    ...fetchOptions,
    headers: {
      ...(fetchOptions.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(vaultToken ? { 'X-Vault-Token': vaultToken } : {}),
      ...fetchOptions.headers
    },
    credentials: 'include'
  });

  let res = await request(getAccessToken());

  if (await isAuthFailure(res)) {
    const refreshRes = await fetch(BASE + '/auth/refresh', { method: 'POST', credentials: 'include' });
    if (refreshRes.ok) {
      const { accessToken } = await refreshRes.json();
      setAccessToken(accessToken);
      res = await request(accessToken);
    }
  }

  return res;
};
