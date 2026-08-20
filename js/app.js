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

const $ = (id) => document.getElementById(id);

const els = {
  compass: $('compass'),
  dial: $('dial'),
  ticks: $('ticks'),
  sunMarker: $('sunMarker'),
  hubHeading: $('hubHeading'),
  alignHint: $('alignHint'),
  riseTime: $('riseTime'),
  riseDir: $('riseDir'),
  riseBearing: $('riseBearing'),
  countdown: $('countdown'),
  place: $('place'),
  gate: $('gate'),
  enableBtn: $('enableBtn'),
  gateNote: $('gateNote'),
  footnote: $('footnote'),
  manual: $('manual'),
  latIn: $('latIn'),
  lonIn: $('lonIn'),
  applyManual: $('applyManual'),
};

const state = {
  lat: null,
  lon: null,
  heading: null, // degrees, 0 = north, clockwise
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
    els.riseDir.textContent = '—';
    els.riseBearing.textContent = r.polarDay ? 'midnight sun' : 'polar night';
    els.countdown.textContent = '—';
    els.alignHint.textContent = r.polarDay
      ? 'The sun stays up all day here right now'
      : 'The sun stays below the horizon here right now';
    els.sunMarker.style.opacity = '0';
    return;
  }

  els.sunMarker.style.opacity = '1';
  els.riseTime.textContent = fmtTime(r.time);
  els.riseDir.textContent = r.cardinal;
  els.riseBearing.textContent = `${Math.round(r.bearing)}° · ${fmtDayLabel(r.time)}`;
  updateMarker();
  updateCountdown();
}

function updateCountdown() {
  if (!state.sunrise || !state.sunrise.time) return;
  const ms = state.sunrise.time.getTime() - Date.now();
  if (ms <= 0) {
    // Sunrise just passed — advance to the following one.
    computeSunrise();
    return;
  }
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  els.countdown.textContent = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

// Rotate the dial so the current heading sits at the top, and place the
// sunrise marker at its true bearing within the dial.
function updateMarker() {
  if (state.sunrise && state.sunrise.bearing != null) {
    els.sunMarker.style.setProperty('--rise', state.sunrise.bearing + 'deg');
  }

  if (state.heading == null) {
    els.hubHeading.textContent = '--°';
    return;
  }
  // Rotating the whole dial by -heading puts whatever the phone points at
  // (the top needle) at the top of the compass.
  els.dial.style.transform = `rotate(${-state.heading}deg)`;
  els.hubHeading.textContent = `${Math.round(state.heading)}°`;

  // Alignment feedback: are we facing the sunrise?
  if (state.sunrise && state.sunrise.bearing != null) {
    let diff = Math.abs(((state.sunrise.bearing - state.heading + 540) % 360) - 180);
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
  const delta = ((s.sunrise.bearing - s.heading + 540) % 360) - 180;
  return delta > 0 ? `right ${Math.round(Math.abs(delta))}°` : `left ${Math.round(Math.abs(delta))}°`;
}

// ---------------------------------------------------------------- location
function setLocation(lat, lon, label) {
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
    toast('Geolocation unavailable — set your location manually below.');
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
          ? 'Location permission denied — enter it manually below.'
          : 'Could not get location — enter it manually below.'
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

  state.heading = heading;
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
  if (state.locReady && state.heading == null) {
    els.footnote.textContent = 'Location set · point your phone to read the heading';
  } else {
    els.footnote.textContent = DEFAULT_FOOTNOTE;
  }
}

// ---------------------------------------------------------------- wiring
els.enableBtn.addEventListener('click', enableSensors);

els.applyManual.addEventListener('click', () => {
  const lat = parseFloat(els.latIn.value);
  const lon = parseFloat(els.lonIn.value);
  if (Number.isNaN(lat) || Number.isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    toast('Enter a valid latitude (−90…90) and longitude (−180…180).');
    return;
  }
  setLocation(lat, lon, `📍 manual · ${lat.toFixed(3)}, ${lon.toFixed(3)}`);
  // If the compass never started (e.g. desktop), try it now.
  if (!state.headingReady) startCompass();
  toast('Location set.');
});

// Keep countdown and heading feeling live.
setInterval(updateCountdown, 1000 * 30);
setInterval(computeSunrise, 1000 * 60 * 5); // refresh math periodically

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
