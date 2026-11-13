const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'sistemaia_token';
const USER_KEY = 'sistemaia_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function isLoggedIn() {
  return !!getToken();
}

export async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (res.status === 401) {
    clearSession();
    location.hash = '#/login';
    throw new Error('Sesión expirada');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-MX') : '—');
export const fmtPct = (score, max) =>
  max ? `${Math.round((score / max) * 100)}%` : '—';
