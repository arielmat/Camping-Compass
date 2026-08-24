/*
 * server.mjs — The Adopt a Porta-Potty initiative
 *
 * A dependency-free Node server (Node 22+) that serves the static site AND
 * a small JSON API backed by SQLite (node:sqlite) with:
 *   - user accounts (register / login / logout), scrypt-hashed passwords
 *   - projects created by logged-in users (photo uploaded to /uploads)
 *   - one rating per user per project, and comments
 *
 * Everything is stored server-side so it's shared across all visitors.
 *
 *   npm start   →   http://localhost:8080
 */
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import {
  randomUUID, randomBytes, scryptSync, timingSafeEqual, createHmac,
} from 'node:crypto';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || join(ROOT, 'data.sqlite');
const UPLOAD_DIR = join(ROOT, 'uploads');
const MAX_BODY = 12 * 1024 * 1024; // 12 MB (base64 photos)
const SESSION_DAYS = 30;

await mkdir(UPLOAD_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* Database                                                            */
/* ------------------------------------------------------------------ */
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    pass TEXT NOT NULL, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, user_id TEXT, author TEXT, title TEXT NOT NULL,
    camp TEXT, artists TEXT, theme TEXT, year INTEGER, descr TEXT,
    image TEXT NOT NULL, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS ratings (
    project_id TEXT NOT NULL, user_id TEXT NOT NULL, stars INTEGER NOT NULL,
    created INTEGER NOT NULL, PRIMARY KEY (project_id, user_id));
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id TEXT,
    who TEXT NOT NULL, text TEXT NOT NULL, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
`);

/* A persistent secret for signing session tokens. */
function getSecret() {
  const row = db.prepare('SELECT v FROM meta WHERE k = ?').get('secret');
  if (row) return row.v;
  const v = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO meta (k, v) VALUES (?, ?)').run('secret', v);
  return v;
}
const SECRET = process.env.SESSION_SECRET || getSecret();

/* ------------------------------------------------------------------ */
/* Seed builds (only if the projects table is empty)                   */
/* ------------------------------------------------------------------ */
function seed() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM projects').get().n;
  if (count > 0) return;
  const SEED = [
    {
      id: 'seed-porta-disco-throne', author: 'Ariel & Tal',
      title: 'Porta Disco: Your Groovy Private Throne',
      camp: 'Comfort & Joy — 7E', artists: 'Ariel & Tal', theme: 'disco', year: 2025,
      image: 'images/porta-disco-throne.jpg',
      descr: 'A full mirror-ball makeover with streamers, fairy lights and a rules card that keeps the groove respectful. Get down while you drop it — respect the groove, leave no trace, keep it shiny.',
      ratings: [5, 5, 5, 4, 5],
      comments: [
        ['Dusty Dancer', 'Walked in at 3am and found a whole nightclub. Absolute legend of a build.', '2025-08-28'],
        ['MOOP Fairy', 'Spotless every morning and the lights were still working all week. Great stewardship.', '2025-08-29'],
      ],
    },
    {
      id: 'seed-nature-is-calling', author: 'Jungle Crew',
      title: 'Nature Is Calling', camp: 'Deep Playa Collective', artists: 'Jungle Crew',
      theme: 'jungle', year: 2024, image: 'images/nature-is-calling.png',
      descr: "Vintage-sign lettering wrapped in living-green monstera leaves and warm string lights. 'Knock before you enter' — a calm oasis in the dust.",
      ratings: [5, 4, 5, 5],
      comments: [['Green Thumb', 'The faux foliage held up in 40mph winds. Chef\'s kiss.', '2024-09-01']],
    },
    {
      id: 'seed-the-porta-disco', author: 'Ariel & Tal',
      title: "The Porta-Disco — World's Funkiest (and Smallest) Nightclub",
      camp: 'Comfort & Joy — 7E', artists: 'Ariel & Tal', theme: 'disco', year: 2025,
      image: 'images/the-porta-disco.jpg',
      descr: 'The signage edition: a giant playa sunset disco ball, velvet drapes and a wink — no ID required here. Brought to you by the Adopt-a-Porta-Potty initiative.',
      ratings: [5, 5, 5, 5, 4, 5],
      comments: [['Ranger Larry', 'Best-signed potty on the playa. People lined up just to take photos.', '2025-08-30']],
    },
    {
      id: 'seed-enter-the-wild', author: 'Ariel & Tal',
      title: 'Enter The Wild', camp: 'Comfort & Joy — 7E', artists: 'Ariel & Tal',
      theme: 'jungle', year: 2024, image: 'images/enter-the-wild.png',
      descr: 'Leave the playa behind. Breathe. Listen to the jungle. A lush toucan-and-hibiscus retreat that asks you to respect the wildlife and let nature take its course.',
      ratings: [5, 5, 4, 5, 5],
      comments: [
        ['Toucan Sam', "Genuinely relaxing. Didn't want to leave (but I did, promptly).", '2024-08-31'],
        ['Playa Mom', 'My kids adored the animals. Kept it clean all burn — thank you!', '2024-09-02'],
      ],
    },
  ];
  const insP = db.prepare(`INSERT INTO projects
    (id,user_id,author,title,camp,artists,theme,year,descr,image,created)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const insR = db.prepare('INSERT INTO ratings (project_id,user_id,stars,created) VALUES (?,?,?,?)');
  const insC = db.prepare('INSERT INTO comments (id,project_id,user_id,who,text,created) VALUES (?,?,?,?,?,?)');
  const base = Date.now();
  SEED.forEach((s, i) => {
    insP.run(s.id, null, s.author, s.title, s.camp, s.artists, s.theme, s.year, s.descr, s.image, base + i);
    s.ratings.forEach((stars, j) => insR.run(s.id, `seed-rater-${s.id}-${j}`, stars, base));
    s.comments.forEach((c) => insC.run(randomUUID(), s.id, null, c[0], c[1], new Date(c[2]).getTime()));
  });
  console.log('Seeded', SEED.length, 'builds.');
}
seed();

/* ------------------------------------------------------------------ */
/* Auth helpers                                                        */
/* ------------------------------------------------------------------ */
function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [saltHex, hashHex] = String(stored).split(':');
  if (!saltHex || !hashHex) return false;
  const hash = scryptSync(pw, Buffer.from(saltHex, 'hex'), 64);
  const target = Buffer.from(hashHex, 'hex');
  return hash.length === target.length && timingSafeEqual(hash, target);
}
function sign(userId) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const payload = `${userId}.${exp}`;
  const mac = createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${mac}`).toString('base64url');
}
function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const idx = decoded.lastIndexOf('.');
    const payload = decoded.slice(0, idx);
    const mac = decoded.slice(idx + 1);
    const expect = createHmac('sha256', SECRET).update(payload).digest('hex');
    const a = Buffer.from(mac); const b = Buffer.from(expect);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const [userId, exp] = payload.split('.');
    if (Date.now() > Number(exp)) return null;
    return userId;
  } catch { return null; }
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function currentUser(req) {
  const token = parseCookies(req).app_session;
  if (!token) return null;
  const uid = verifyToken(token);
  if (!uid) return null;
  return db.prepare('SELECT id,name,email FROM users WHERE id = ?').get(uid) || null;
}
function setSessionCookie(res, req, userId) {
  const secure = (req.headers['x-forwarded-proto'] === 'https') ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `app_session=${sign(userId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'app_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}

/* ------------------------------------------------------------------ */
/* Project serialization                                               */
/* ------------------------------------------------------------------ */
function projectRow(row, viewerId) {
  const agg = db.prepare(
    'SELECT COUNT(*) AS n, AVG(stars) AS avg FROM ratings WHERE project_id = ?').get(row.id);
  const cc = db.prepare(
    'SELECT COUNT(*) AS n FROM comments WHERE project_id = ?').get(row.id).n;
  let mine = null;
  if (viewerId) {
    const r = db.prepare(
      'SELECT stars FROM ratings WHERE project_id = ? AND user_id = ?').get(row.id, viewerId);
    if (r) mine = r.stars;
  }
  return {
    id: row.id, title: row.title, camp: row.camp, artists: row.artists,
    theme: row.theme, year: row.year, desc: row.descr, image: row.image,
    author: row.author, created: row.created,
    avg: agg.avg || 0, ratingCount: agg.n, commentCount: cc, myRating: mine,
  };
}

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                        */
/* ------------------------------------------------------------------ */
function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));
const clean = (s, max) => String(s == null ? '' : s).trim().slice(0, max);

/* Save a base64 data-URL image to /uploads and return its relative path. */
async function saveImage(dataUrl) {
  const m = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_BODY) return null;
  const name = `${randomUUID()}.${ext}`;
  await writeFile(join(UPLOAD_DIR, name), buf);
  return `uploads/${name}`;
}

/* ------------------------------------------------------------------ */
/* API router                                                          */
/* ------------------------------------------------------------------ */
async function api(req, res, path) {
  const method = req.method;
  const me = currentUser(req);

  // ---- Auth ----
  if (path === '/api/register' && method === 'POST') {
    const b = await readBody(req);
    const name = clean(b.name, 60), email = clean(b.email, 120).toLowerCase(), pw = String(b.password || '');
    if (!name || !isEmail(email) || pw.length < 6)
      return json(res, 400, { error: 'Name, a valid email and a 6+ character password are required.' });
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email))
      return json(res, 409, { error: 'An account with that email already exists.' });
    const id = randomUUID();
    db.prepare('INSERT INTO users (id,name,email,pass,created) VALUES (?,?,?,?,?)')
      .run(id, name, email, hashPassword(pw), Date.now());
    setSessionCookie(res, req, id);
    return json(res, 200, { user: { id, name, email } });
  }

  if (path === '/api/login' && method === 'POST') {
    const b = await readBody(req);
    const email = clean(b.email, 120).toLowerCase(), pw = String(b.password || '');
    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!u || !verifyPassword(pw, u.pass))
      return json(res, 401, { error: 'Wrong email or password.' });
    setSessionCookie(res, req, u.id);
    return json(res, 200, { user: { id: u.id, name: u.name, email: u.email } });
  }

  if (path === '/api/logout' && method === 'POST') {
    clearSessionCookie(res);
    return json(res, 200, { ok: true });
  }

  if (path === '/api/me' && method === 'GET') {
    return json(res, 200, { user: me });
  }

  // ---- Projects ----
  if (path === '/api/projects' && method === 'GET') {
    const rows = db.prepare('SELECT * FROM projects').all();
    return json(res, 200, { projects: rows.map((r) => projectRow(r, me && me.id)) });
  }

  if (path === '/api/projects' && method === 'POST') {
    if (!me) return json(res, 401, { error: 'Please sign in to share a build.' });
    const b = await readBody(req);
    const title = clean(b.title, 100);
    if (!title) return json(res, 400, { error: 'A title is required.' });
    const image = await saveImage(b.image);
    if (!image) return json(res, 400, { error: 'A valid photo (PNG/JPG/WebP) is required.' });
    const id = randomUUID();
    db.prepare(`INSERT INTO projects
      (id,user_id,author,title,camp,artists,theme,year,descr,image,created)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, me.id, me.name, title, clean(b.camp, 100), clean(b.artists, 100),
      clean(b.theme, 20) || 'other', Number(b.year) || new Date().getFullYear(),
      clean(b.desc, 800), image, Date.now());
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    return json(res, 200, { project: projectRow(row, me.id) });
  }

  const detail = path.match(/^\/api\/projects\/([\w-]+)$/);
  if (detail && method === 'GET') {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(detail[1]);
    if (!row) return json(res, 404, { error: 'Not found.' });
    const comments = db.prepare(
      'SELECT who,text,created FROM comments WHERE project_id = ? ORDER BY created ASC').all(detail[1]);
    return json(res, 200, { project: projectRow(row, me && me.id), comments });
  }

  const rate = path.match(/^\/api\/projects\/([\w-]+)\/rate$/);
  if (rate && method === 'POST') {
    if (!me) return json(res, 401, { error: 'Please sign in to rate.' });
    const row = db.prepare('SELECT id FROM projects WHERE id = ?').get(rate[1]);
    if (!row) return json(res, 404, { error: 'Not found.' });
    const b = await readBody(req);
    const stars = Math.max(1, Math.min(5, Math.round(Number(b.stars))));
    if (!stars) return json(res, 400, { error: 'Rating must be 1–5.' });
    db.prepare(`INSERT INTO ratings (project_id,user_id,stars,created) VALUES (?,?,?,?)
      ON CONFLICT(project_id,user_id) DO UPDATE SET stars = excluded.stars, created = excluded.created`)
      .run(rate[1], me.id, stars, Date.now());
    const fresh = db.prepare('SELECT * FROM projects WHERE id = ?').get(rate[1]);
    return json(res, 200, { project: projectRow(fresh, me.id) });
  }

  const comment = path.match(/^\/api\/projects\/([\w-]+)\/comments$/);
  if (comment && method === 'POST') {
    if (!me) return json(res, 401, { error: 'Please sign in to comment.' });
    const row = db.prepare('SELECT id FROM projects WHERE id = ?').get(comment[1]);
    if (!row) return json(res, 404, { error: 'Not found.' });
    const b = await readBody(req);
    const text = clean(b.text, 600);
    if (!text) return json(res, 400, { error: 'Write something first.' });
    db.prepare('INSERT INTO comments (id,project_id,user_id,who,text,created) VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), comment[1], me.id, me.name, text, Date.now());
    const comments = db.prepare(
      'SELECT who,text,created FROM comments WHERE project_id = ? ORDER BY created ASC').all(comment[1]);
    const fresh = db.prepare('SELECT * FROM projects WHERE id = ?').get(comment[1]);
    return json(res, 200, { project: projectRow(fresh, me.id), comments });
  }

  return json(res, 404, { error: 'Unknown endpoint.' });
}

/* ------------------------------------------------------------------ */
/* Static files                                                        */
/* ------------------------------------------------------------------ */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};
async function serveStatic(req, res, path) {
  if (path === '/') path = '/index.html';
  const filePath = normalize(join(ROOT, path));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) throw new Error('is dir');
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}

/* ------------------------------------------------------------------ */
const server = createServer(async (req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }

  if (path.startsWith('/api/')) {
    try { await api(req, res, path); }
    catch (e) {
      if (!res.headersSent) json(res, e.message === 'too large' ? 413 : 400, { error: 'Request failed.' });
    }
    return;
  }
  await serveStatic(req, res, path);
});

server.listen(PORT, () => {
  console.log(`The Adopt a Porta-Potty initiative → http://localhost:${PORT}`);
});
