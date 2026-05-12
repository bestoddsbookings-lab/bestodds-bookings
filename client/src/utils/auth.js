export function getToken() {
  // prefer sessionStorage (per-tab) and fallback to localStorage for backwards compatibility
  try {
    const s = sessionStorage.getItem('token');
    if (s) return s;
  } catch (e) { /* ignore */ }
  try {
    return localStorage.getItem('token');
  } catch (e) { return null; }
}

export function setToken(t) {
  try { sessionStorage.setItem('token', t); } catch (e) { localStorage.setItem('token', t); }
}

export function clearToken() {
  try { sessionStorage.removeItem('token'); } catch (e) { /* ignore */ }
}

export function parseJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

export function getUserFromToken() {
  const t = getToken();
  if (!t) return null;
  const p = parseJwt(t);
  return p ? { id: p.userId } : null;
}
