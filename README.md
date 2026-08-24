# 🏜️ The Adopt a Porta-Potty initiative

**A home on the playa for burners who adopt, decorate and care for Burning Man
porta-potties.**

Camps and crews claim a bank of porta-potties, transform them into art — a disco, a
jungle, a spa — and become their stewards for the burn, keeping them clean, stocked and
MOOP-free. This site is where those builds live: browse the gallery, **create an account**,
**upload your own build**, and **rate and comment** on everyone else's — all shared across
visitors — plus the guidelines that keep decorating safe and Leave-No-Trace friendly.

Styled in a warm **playa / desert palette** (dust, sand, sunset, sage).

## Pages

- **Home** (`index.html`) — what the initiative is, plus featured builds.
- **Gallery** (`gallery.html`) — browse, filter and sort decorated potties; open any one
  to **rate it (★)** and **comment**; **upload your own** build with a photo.
- **Guidelines** (`guidelines.html`) — what's encouraged and what's off-limits when
  decorating and caring for a potty (safety, service access, Leave No Trace, inclusion).
- **Contact** (`contact.html`) — a form that composes an email to **kuks@arielmat.com**.

## Backend

Unlike a static site, this ships a small **backend** so projects, ratings and comments
are stored on the server and shared with every visitor. It's built on **Node's
built-in modules only — no external dependencies**:

- `node:http` — the web server + JSON API (`server.mjs`)
- `node:sqlite` — the database (a single `data.sqlite` file)
- `node:crypto` — scrypt password hashing and signed session cookies

### Accounts & data

- **Register / sign in** with email + password (passwords are scrypt-hashed). The
  session is kept in an `HttpOnly`, `SameSite=Lax` cookie.
- **Projects** are created by signed-in users; the uploaded photo is saved under
  `uploads/` and served by the app.
- **Ratings** are one per user per project (re-rating updates your score); **comments**
  are attributed to your display name.
- The database is **seeded** with four showcase builds the first time it starts.

### API (JSON)

```
POST /api/register    {name,email,password}      → {user}
POST /api/login       {email,password}           → {user}
POST /api/logout                                  → {ok}
GET  /api/me                                       → {user|null}
GET  /api/projects                                 → {projects[]}
POST /api/projects    {title,camp,artists,theme,year,desc,image(dataURL)}  → {project}   (auth)
GET  /api/projects/:id                             → {project, comments[]}
POST /api/projects/:id/rate     {stars:1..5}       → {project}              (auth)
POST /api/projects/:id/comments {text}             → {project, comments[]}  (auth)
```

## Running it

Requires **Node 22.5+** (for the built-in SQLite).

```bash
npm start          # → http://localhost:8080
```

The server creates `data.sqlite` and the `uploads/` folder on first run (both are
git-ignored). To reset all data, stop the server and delete `data.sqlite*`.

### Deploying

Run `node server.mjs` behind any Node host / reverse proxy (Fly.io, Render, a VPS,
etc.). Set `PORT` to change the port, `DB_PATH` to point the database at a persistent
volume, and optionally `SESSION_SECRET` to pin the cookie-signing key across restarts.
Serve it over **HTTPS** in production — the session cookie is marked `Secure`
automatically when it sees an `X-Forwarded-Proto: https` header.

## Project layout

```
index.html        Home
gallery.html      Gallery + upload + ratings/comments
guidelines.html   Decoration & care rules
contact.html      Contact form → kuks@arielmat.com
server.mjs        Node HTTP server + JSON API + SQLite + auth
css/styles.css    Shared desert / playa theme
js/api.js         Fetch client for the API
js/auth.js        Sign-in / register UI + session state
js/gallery.js     Gallery grid, modal, ratings, comments, upload
js/ui.js          Shared helpers (nav, stars, escaping, toast)
images/           Seed build photos
uploads/          User-uploaded photos (runtime, git-ignored)
```

## License

MIT
