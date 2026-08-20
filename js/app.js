/*
 * app.js — Camping Sunrise UI controller.
 *
 * Ties together three things:
 *   1. Geolocation  -> where you are
 *   2. Solar math   -> when & at what bearing the sun rises next
 *   3. Device compass -> which way the phone is pointing right now
 * and renders a live compass whose ☀ marker sits on the real sunrise bearing.
 */
import { nextSunrise, toCardinal } from './solar.js';
import { CITIES, findCity } from './cities.js';
import { fetchSunriseWeather } from './weather.js';

const $ = (id) => document.getElementById(id);

const els = {
  compass: $('compass'),
  dial: $('dial'),
  ticks: $('ticks'),
  sunMarker: $('sunMarker'),
  hubDir: $('hubDir'),
  alignHint: $('alignHint'),
  riseTime: $('riseTime'),
  riseDayKey: $('riseDayKey'),
  wxIcon: $('wxIcon'),
  wxTemp: $('wxTemp'),
  wxLabel: $('wxLabel'),
  place: $('place'),
  gate: $('gate'),
  enableBtn: $('enableBtn'),
  gateNote: $('gateNote'),
  footnote: $('footnote'),
  manual: $('manual'),
  cityIn: $('cityIn'),
  cityList: $('cityList'),
  applyCity: $('applyCity'),
};

// How strongly to smooth the compass (0–1): higher = snappier but jumpier.
const HEADING_SMOOTH = 0.25;

const state = {
  lat: null,
  lon: null,
  rawHeading: null, // latest raw magnetometer reading, deg
  smHeading: null, // low-pass-filtered heading, deg
  heading: null, // = smHeading, exposed for alignment maths
  rot: 0, // continuous (unwrapped) dial rotation, deg
  sunrise: null, // { time, bearing, cardinal }
  headingReady: false,
  locReady: false,
};

// ---------------------------------------------------------------- ticks
// Build the compass tick marks once (every 5°, major every 45°).
(function buildTicks() {
  const frag = document.createDocumentFragment();
  for (let a = 0; a < 360; a += 5) {
    const t = document.createElement('div');
    t.className = 'tick' + (a % 45 === 0 ? ' major' : '');
    t.style.setProperty('--a', a + 'deg');
    frag.appendChild(t);
  }
  els.ticks.appendChild(frag);
})();

// ---------------------------------------------------------------- toast
let toastEl;
let toastTimer;
function toast(msg) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

// ---------------------------------------------------------------- render
function fmtTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDayLabel(date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - startOfToday) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function computeSunrise() {
  if (state.lat == null || state.lon == null) return;
  const r = nextSunrise(state.lat, state.lon, new Date());
  state.sunrise = r;

  if (!r.time) {
    els.riseTime.textContent = r.polarDay ? '24h sun' : 'polar';
    els.riseDayKey.textContent = r.polarDay ? 'midnight sun' : 'polar night';
    setWeather(null);
    els.alignHint.textContent = r.polarDay
      ? 'The sun stays up all day here right now'
      : 'The sun stays below the horizon here right now';
    els.sunMarker.style.opacity = '0';
    updateMarker();
    return;
  }

  els.sunMarker.style.opacity = '1';
  els.riseTime.textContent = fmtTime(r.time);
  els.riseDayKey.textContent = `sunrise · ${fmtDayLabel(r.time)}`;
  updateMarker();
  loadWeather();
}

// ---------------------------------------------------------------- weather
let weatherReqId = 0;

// Render the weather card. `info` = {icon,label,tempC}, or a status string
// ('loading' | 'offline'), or null to reset.
function setWeather(info) {
  const box = els.wxIcon.closest('.weather-value');
  box.classList.remove('loading');
  if (info === 'loading') {
    box.classList.add('loading');
    els.wxIcon.textContent = '🌡️';
    els.wxTemp.textContent = '';
    els.wxLabel.textContent = 'checking sky…';
  } else if (info === 'offline') {
    els.wxIcon.textContent = '📡';
    els.wxTemp.textContent = '–';
    els.wxLabel.textContent = 'weather offline';
  } else if (info && typeof info === 'object') {
    els.wxIcon.textContent = info.icon;
    els.wxTemp.textContent = `${Math.round(info.tempC)}°C`;
    els.wxLabel.textContent = info.label;
  } else {
    els.wxIcon.textContent = '🌡️';
    els.wxTemp.textContent = '–';
    els.wxLabel.textContent = 'at sunrise';
  }
}

// Cached forecast so we don't refetch on every GPS tick / periodic recompute.
const wxCache = { at: 0, lat: null, lon: null, data: null };
const WX_MAX_AGE = 15 * 60 * 1000; // refresh a forecast at most every 15 min
const WX_MOVE_DEG = 0.05; // ~5 km — refetch only after a real move

async function loadWeather(force = false) {
  const s = state.sunrise;
  if (!s || !s.time || state.lat == null) return;

  const moved =
    wxCache.lat == null ||
    Math.abs(state.lat - wxCache.lat) > WX_MOVE_DEG ||
    Math.abs(state.lon - wxCache.lon) > WX_MOVE_DEG;
  const stale = Date.now() - wxCache.at > WX_MAX_AGE;

  // Nothing changed enough to warrant a network call — just re-render what we
  // have (prevents the card flickering to "checking sky…" on every GPS update).
  if (!force && !moved && !stale && wxCache.data) {
    setWeather(wxCache.data);
    return;
  }

  const id = ++weatherReqId;
  // Only show the loading state when we have nothing to display yet; background
  // refreshes update silently.
  if (!wxCache.data || moved) setWeather('loading');

  const info = await fetchSunriseWeather(state.lat, state.lon, s.time);
  if (id !== weatherReqId) return; // a newer request superseded this one

  if (info) {
    wxCache.at = Date.now();
    wxCache.lat = state.lat;
    wxCache.lon = state.lon;
    wxCache.data = info;
    setWeather(info);
  } else if (!wxCache.data) {
    setWeather('offline');
  } // else: refresh failed but keep showing the last good reading
}

// Smallest signed angle (deg) to rotate from `current` to `target`, in
// [-180, 180]. This is the key to a jump-free compass: we always take the
// short way round instead of snapping across the 359°→0° seam. The double
// modulo keeps it correct even when target−current is a large negative value
// (JS's % preserves the sign of the dividend, so a single mod isn't enough).
function shortestDelta(target, current) {
  return ((((target - current) % 360) + 540) % 360) - 180;
}

// Rotate the dial so the current heading sits at the top, and place the
// sunrise marker at its true bearing within the dial.
function updateMarker() {
  if (state.sunrise && state.sunrise.bearing != null) {
    els.sunMarker.style.setProperty('--rise', state.sunrise.bearing + 'deg');
  }
  // Hub shows the (stable) sunrise direction rather than a twitchy heading.
  els.hubDir.textContent =
    state.sunrise && state.sunrise.cardinal ? state.sunrise.cardinal : '--';

  if (state.rawHeading == null) return;

  // 1) Low-pass filter the noisy magnetometer reading (along the short path).
  if (state.smHeading == null) {
    state.smHeading = state.rawHeading;
  } else {
    state.smHeading =
      (state.smHeading +
        shortestDelta(state.rawHeading, state.smHeading) * HEADING_SMOOTH +
        360) %
      360;
  }
  state.heading = state.smHeading;

  // 2) Accumulate a continuous, unwrapped rotation. Because we only ever add
  // small short-path deltas, the dial never spins the long way round.
  const target = -state.smHeading;
  const curNorm = ((state.rot % 360) + 360) % 360;
  state.rot += shortestDelta(target, curNorm);
  els.dial.style.transform = `rotate(${state.rot}deg)`;

  // Alignment feedback: are we facing the sunrise?
  if (state.sunrise && state.sunrise.bearing != null) {
    const diff = Math.abs(shortestDelta(state.sunrise.bearing, state.heading));
    const aligned = diff < 6;
    els.alignHint.classList.toggle('aligned', aligned);
    els.alignHint.textContent = aligned
      ? '✓ You are facing the sunrise'
      : diff < 45
      ? `Almost — turn ${nudge(diff, state)}`
      : 'Turn until the ☀ reaches the top';
  }
}

function nudge(diff, s) {
  // Which way to turn to reach the sunrise bearing.
  const delta = shortestDelta(s.sunrise.bearing, s.heading);
  return delta > 0 ? `right ${Math.round(Math.abs(delta))}°` : `left ${Math.round(Math.abs(delta))}°`;
}

// ---------------------------------------------------------------- location
function setLocation(lat, lon, label) {
  // Ignore GPS jitter: watchPosition can fire repeatedly with essentially the
  // same fix, and recomputing on each one made the weather card churn.
  const negligible =
    state.locReady &&
    !label &&
    Math.abs(lat - state.lat) < 1e-3 && // ~100 m
    Math.abs(lon - state.lon) < 1e-3;
  if (negligible) return;

  state.lat = lat;
  state.lon = lon;
  state.locReady = true;
  els.place.textContent =
    label || `📍 ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  computeSunrise();
  maybeHideGate();
}

function requestGeolocation() {
  if (!('geolocation' in navigator)) {
    toast('Geolocation unavailable — enter a city below.');
    els.manual.open = true;
    return;
  }
  els.place.textContent = 'Locating you…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setLocation(pos.coords.latitude, pos.coords.longitude);
      // Keep it fresh as the camper moves.
      navigator.geolocation.watchPosition(
        (p) => setLocation(p.coords.latitude, p.coords.longitude),
        () => {},
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 20000 }
      );
    },
    (err) => {
      els.place.textContent = 'Location unavailable';
      els.manual.open = true;
      toast(
        err.code === err.PERMISSION_DENIED
          ? 'Location permission denied — enter a city below.'
          : 'Could not get location — enter a city below.'
      );
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

// ---------------------------------------------------------------- compass
function onOrientation(e) {
  let heading = null;

  if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
    // iOS: already a true-ish compass heading, clockwise from north.
    heading = e.webkitCompassHeading;
  } else if (e.absolute === true && typeof e.alpha === 'number') {
    // Android absolute orientation: alpha is counter-clockwise from north.
    heading = (360 - e.alpha) % 360;
  } else if (typeof e.alpha === 'number') {
    // Relative orientation — better than nothing; still tracks turning.
    heading = (360 - e.alpha) % 360;
  }

  if (heading == null || Number.isNaN(heading)) return;

  // Compensate for screen rotation on devices that report it.
  const scr = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  heading = (heading + scr + 360) % 360;

  state.rawHeading = heading;
  if (!state.headingReady) {
    state.headingReady = true;
    maybeHideGate();
  }
  updateMarker();
}

function startCompass() {
  const absName = 'ondeviceorientationabsolute' in window
    ? 'deviceorientationabsolute'
    : 'deviceorientation';
  window.addEventListener(absName, onOrientation, true);
  // Also listen to the plain event as a fallback for the heading value.
  if (absName !== 'deviceorientation') {
    window.addEventListener('deviceorientation', onOrientation, true);
  }
}

// ---------------------------------------------------------------- permissions
async function enableSensors() {
  // iOS 13+ requires an explicit gesture-driven permission request.
  let orientationGranted = true;
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      const res = await DeviceOrientationEvent.requestPermission();
      orientationGranted = res === 'granted';
    }
  } catch {
    orientationGranted = false;
  }

  if (orientationGranted) {
    startCompass();
  } else {
    toast('Compass permission denied — heading will not update.');
    // Still show sunrise info; heading just stays blank.
    state.headingReady = true;
  }

  requestGeolocation();
  maybeHideGate();
}

const DEFAULT_FOOTNOTE = 'On‑device astronomy · no tracking';
function maybeHideGate() {
  // Hide the enable button once we have at least a location.
  if (state.locReady) {
    els.gate.classList.add('hidden');
  }
  if (state.locReady && state.rawHeading == null) {
    els.footnote.textContent = 'Location set · point your phone to read the heading';
  } else {
    els.footnote.textContent = DEFAULT_FOOTNOTE;
  }
}

// ---------------------------------------------------------------- city list
// Populate the <datalist> so the city box autocompletes as you type. Kept as
// a bundled table so it works fully offline — no geocoding service needed.
(function buildCityList() {
  if (!els.cityList) return;
  const frag = document.createDocumentFragment();
  for (const c of CITIES) {
    const opt = document.createElement('option');
    opt.value = `${c.n}, ${c.c}`;
    frag.appendChild(opt);
  }
  els.cityList.appendChild(frag);
})();

function applyCity() {
  const city = findCity(els.cityIn.value);
  if (!city) {
    toast('City not found — try a nearby major city.');
    return;
  }
  setLocation(city.lat, city.lon, `📍 ${city.n}, ${city.c}`);
  if (!state.headingReady) startCompass();
  toast(`Location set to ${city.n}.`);
}

// ---------------------------------------------------------------- wiring
els.enableBtn.addEventListener('click', enableSensors);

if (els.applyCity) {
  els.applyCity.addEventListener('click', applyCity);
  els.cityIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyCity();
  });
  // Picking straight from the autocomplete dropdown applies immediately.
  els.cityIn.addEventListener('change', () => {
    if (findCity(els.cityIn.value)) applyCity();
  });
}

// Keep countdown and heading feeling live.
// Refresh sunrise time, day label and weather periodically (also rolls over to
// the next morning once a sunrise passes).
setInterval(computeSunrise, 1000 * 60 * 5);

// On non-iOS (no permission prompt needed) we can start the compass eagerly,
// but geolocation still needs the button tap on most browsers, so the gate
// stays until the user opts in. We do a soft attempt so desktop shows motion.
if (!(typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function')) {
  startCompass();
}

// Register the service worker for installability / offline use.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// Expose a tiny hook for automated testing (headless browser).
window.__campingSunrise = { state, setLocation, computeSunrise, onOrientation };
