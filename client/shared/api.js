import { getAccessToken, setAccessToken } from './auth.js';

const BASE = '/api';

export const apiFetch = async (path, options = {}) => {
  const isFormData = options.body instanceof FormData;

  const request = (token) => fetch(BASE + path, {
    ...options,
    headers: {
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    credentials: 'include'
  });

  let res = await request(getAccessToken());

  if (res.status === 401) {
    const refreshRes = await fetch(BASE + '/auth/refresh', { method: 'POST', credentials: 'include' });
    if (refreshRes.ok) {
      const { accessToken } = await refreshRes.json();
      setAccessToken(accessToken);
      res = await request(accessToken);
    }
  }

  return res;
};