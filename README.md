# 🚽✨ Potty Playa

**A home on the playa for burners who adopt, decorate and care for Burning Man porta-potties.**

Part of the spirit of the *Adopt-a-Porta-Potty* initiative: camps and crews claim a
bank of porta-potties, transform them into art — a disco, a jungle, a spa — and become
their stewards for the burn, keeping them clean, stocked and MOOP-free.

This site is where those builds live: browse the gallery, rate each other's work, swap
tips in the comments, upload your own build, and learn the guidelines that keep
decorating safe and Leave-No-Trace friendly.

## Pages

- **Home** (`index.html`) — what Potty Playa is, plus featured builds.
- **Gallery** (`gallery.html`) — browse, filter and sort decorated potties; open any one
  to **rate it (★)** and **leave comments**; **upload your own** build with a photo.
- **Guidelines** (`guidelines.html`) — what's encouraged and what's off-limits when
  decorating and caring for a potty (safety, service access, Leave No Trace, inclusion).
- **Contact** (`contact.html`) — a form that composes an email to
  **kuks@arielmat.com** to feature your build or ask a question.

## How the community features work

This is a **static site with no backend**, so it's easy to host anywhere (GitHub Pages,
Netlify, any static host) and there are no servers or accounts to run. The interactive
features are implemented client-side:

- **Ratings & comments** are saved in the visitor's browser via `localStorage`.
- **Uploads** are read locally (as data URLs) so a contributor can preview how their
  build looks in the gallery on their own device.
- Because there's no shared database, uploads/ratings/comments live on each visitor's
  device. To feature a build on the *shared* site, contributors send photos through the
  **contact page** (→ `kuks@arielmat.com`), and seed builds are added to
  `js/store.js`.

If you later want ratings, comments and uploads shared across all visitors, swap the
`Store` module in `js/store.js` for a small backend or a hosted service (e.g. a
serverless function + database, or a form/comments provider) — the rest of the UI stays
the same.

## Running it locally

```bash
npm start          # → http://localhost:8080
```

It's just static files (`*.html`, `css/`, `js/`, `images/`, icons, manifest), so you can
also drop them on any static host with no build step.

## Project layout

```
index.html        Home
gallery.html      Gallery + upload + ratings/comments
guidelines.html   Decoration & care rules
contact.html      Contact form → kuks@arielmat.com
css/styles.css    Shared playa-disco theme
js/store.js       Data layer (seed builds + localStorage)
js/gallery.js     Gallery grid, modal, ratings, comments, upload
js/ui.js          Shared helpers (nav, stars, escaping, toast)
images/           Seed build photos
```

## License

MIT
