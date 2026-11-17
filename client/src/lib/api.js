// Uses VITE_API_URL when set; otherwise the live Render API (so production works even if the variable is missing).
const BASE = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://kabaleeti-1.onrender.com/api'
);

export const getToken = () => localStorage.getItem('kaah_token');
export const setToken = (t) => (t ? localStorage.setItem('kaah_token', t) : localStorage.removeItem('kaah_token'));

// Single fetch wrapper: adds the JWT, parses JSON, throws readable errors.
export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    setToken(null);
    window.dispatchEvent(new Event('kaah:logout'));
  }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
