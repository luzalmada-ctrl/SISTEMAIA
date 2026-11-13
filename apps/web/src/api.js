// Detectar si estamos en Vercel producción
const isVercel = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// En Vercel producción, usa rutas relativas (/api/...)
// En desarrollo local, usa VITE_API_URL (ej: http://localhost:3001)
const API_BASE = (isVercel ? '' : (import.meta.env.VITE_API_URL || '')).replace(/\/$/, '');
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

  // En producción Vercel (API_BASE vacío), usa ruta relativa: /api/...
  // En desarrollo local (API_BASE seteado), usa URL completa: http://localhost:3001/api/...
  const url = API_BASE ? `${API_BASE}/api${path}` : `/api${path}`;

  const res = await fetch(url, {
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
