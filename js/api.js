/* api.js — thin client for the server API. All data is stored server-side
   and shared across visitors; auth uses an HttpOnly session cookie. */

async function req(method, url, body) {
  const opts = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  let data = {};
  try { data = await res.json(); } catch (_) { /* no body */ }
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export const API = {
  // auth
  me:       () => req('GET', '/api/me'),
  register: (name, email, password) => req('POST', '/api/register', { name, email, password }),
  login:    (email, password) => req('POST', '/api/login', { email, password }),
  logout:   () => req('POST', '/api/logout'),

  // projects
  list:     () => req('GET', '/api/projects'),
  get:      (id) => req('GET', `/api/projects/${id}`),
  create:   (project) => req('POST', '/api/projects', project),
  rate:     (id, stars) => req('POST', `/api/projects/${id}/rate`, { stars }),
  comment:  (id, text) => req('POST', `/api/projects/${id}/comments`, { text }),
};
