/* ============================================================
   store.js — client-side data layer for Potty Playa.

   This is a static site (no backend), so projects, ratings and
   comments live in the visitor's browser via localStorage.
   Seed projects ship with the site; anything a visitor uploads,
   rates or comments is saved locally on their own device.
   ============================================================ */

const KEY = "pottyplaya:v1";

/* Seed gallery — the community's showcase potties. */
const SEED = [
  {
    id: "seed-porta-disco-throne",
    title: "Porta Disco: Your Groovy Private Throne",
    camp: "Comfort & Joy — 7E",
    artists: "Ariel & Tal",
    theme: "disco",
    year: 2025,
    image: "images/porta-disco-throne.jpg",
    desc: "A full mirror-ball makeover with streamers, fairy lights and a rules card that keeps the groove respectful. Get down while you drop it — respect the groove, leave no trace, keep it shiny.",
    seedRatings: [5, 5, 5, 4, 5],
    seedComments: [
      { who: "Dusty Dancer", when: "2025-08-28", text: "Walked in at 3am and found a whole nightclub. Absolute legend of a build." },
      { who: "MOOP Fairy", when: "2025-08-29", text: "Spotless every morning and the lights were still working all week. Great stewardship." }
    ]
  },
  {
    id: "seed-nature-is-calling",
    title: "Nature Is Calling",
    camp: "Deep Playa Collective",
    artists: "Jungle Crew",
    theme: "jungle",
    year: 2024,
    image: "images/nature-is-calling.png",
    desc: "Vintage-sign lettering wrapped in living-green monstera leaves and warm string lights. 'Knock before you enter' — a calm oasis in the dust.",
    seedRatings: [5, 4, 5, 5],
    seedComments: [
      { who: "Green Thumb", when: "2024-09-01", text: "The faux foliage held up in 40mph winds. Chef's kiss." }
    ]
  },
  {
    id: "seed-the-porta-disco",
    title: "The Porta-Disco — World's Funkiest (and Smallest) Nightclub",
    camp: "Comfort & Joy — 7E",
    artists: "Ariel & Tal",
    theme: "disco",
    year: 2025,
    image: "images/the-porta-disco.jpg",
    desc: "The signage edition: a giant playa sunset disco ball, velvet drapes and a wink — no ID required here. Brought to you by the Adopt-a-Porta-Potty initiative.",
    seedRatings: [5, 5, 5, 5, 4, 5],
    seedComments: [
      { who: "Ranger Larry", when: "2025-08-30", text: "Best-signed potty on the playa. People lined up just to take photos." }
    ]
  },
  {
    id: "seed-enter-the-wild",
    title: "Enter The Wild",
    camp: "Comfort & Joy — 7E",
    artists: "Ariel & Tal",
    theme: "jungle",
    year: 2024,
    image: "images/enter-the-wild.png",
    desc: "Leave the playa behind. Breathe. Listen to the jungle. A lush toucan-and-hibiscus retreat that asks you to respect the wildlife and let nature take its course.",
    seedRatings: [5, 5, 4, 5, 5],
    seedComments: [
      { who: "Toucan Sam", when: "2024-08-31", text: "Genuinely relaxing. Didn't want to leave (but I did, promptly)." },
      { who: "Playa Mom", when: "2024-09-02", text: "My kids adored the animals. Kept it clean all burn — thank you!" }
    ]
  }
];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* storage unavailable or corrupt */ }
  return null;
}

function persist(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (_) { /* ignore quota / private mode */ }
}

/* Build initial state from seeds. */
function seedState() {
  const projects = SEED.map((s) => ({
    id: s.id,
    title: s.title,
    camp: s.camp,
    artists: s.artists,
    theme: s.theme,
    year: s.year,
    image: s.image,
    desc: s.desc,
    createdAt: Date.now(),
    ratings: (s.seedRatings || []).slice(),
    comments: (s.seedComments || []).map((c) => ({
      who: c.who, text: c.text, at: new Date(c.when).getTime()
    })),
    seed: true
  }));
  return { projects };
}

let state = load() || seedState();

/* Merge in any new seed projects added in later releases. */
(function mergeSeeds() {
  let changed = false;
  const have = new Set(state.projects.map((p) => p.id));
  for (const s of SEED) {
    if (!have.has(s.id)) {
      const fresh = seedState().projects.find((p) => p.id === s.id);
      if (fresh) { state.projects.push(fresh); changed = true; }
    }
  }
  if (changed) persist(state);
})();

/* ---------- Public API ---------- */
export const Store = {
  all() {
    return state.projects.slice().sort((a, b) => b.createdAt - a.createdAt);
  },

  get(id) {
    return state.projects.find((p) => p.id === id) || null;
  },

  avg(project) {
    if (!project.ratings.length) return 0;
    const sum = project.ratings.reduce((a, b) => a + b, 0);
    return sum / project.ratings.length;
  },

  add(project) {
    const p = {
      id: "user-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: project.title,
      camp: project.camp || "",
      artists: project.artists || "",
      theme: project.theme || "other",
      year: project.year || new Date().getFullYear(),
      image: project.image, // data URL
      desc: project.desc || "",
      createdAt: Date.now(),
      ratings: [],
      comments: [],
      seed: false
    };
    state.projects.push(p);
    persist(state);
    return p;
  },

  rate(id, stars) {
    const p = this.get(id);
    if (!p) return;
    p.ratings.push(Math.max(1, Math.min(5, Math.round(stars))));
    persist(state);
  },

  comment(id, who, text) {
    const p = this.get(id);
    if (!p) return;
    p.comments.push({ who: who || "Anonymous Burner", text, at: Date.now() });
    persist(state);
  }
};
