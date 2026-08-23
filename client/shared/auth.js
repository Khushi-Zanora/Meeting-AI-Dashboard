let accessToken = null;
let currentUser = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => { accessToken = token; };
export const getCurrentUser = () => currentUser;
export const setCurrentUser = (user) => { currentUser = user; };
export const clearAuth = () => { accessToken = null; currentUser = null; };

// Called once when any page loads — silently exchanges the httpOnly refresh
// cookie for a fresh access token, so the user doesn't need to log in again
// just because they reloaded the page.
export const initAuth = async () => {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.accessToken);
    if (data.user) setCurrentUser(data.user);
    return true;
  } catch {
    return false;
  }
};