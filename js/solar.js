/*
 * solar.js — Sun position & sunrise calculations for Camping Sunrise.
 *
 * Pure, dependency-free astronomy math. Works both in the browser
 * (as an ES module) and in Node (for the test suite).
 *
 * The algorithm is the well-established one popularised by SunCalc
 * (Vladimir Agafonkin, BSD-2), itself based on the formulas from
 * Astronomy Answers (Aa.quae.nl "position of the sun"). Accuracy is
 * ~1 minute for sunrise time and a fraction of a degree for azimuth,
 * which is well beyond what a phone compass can resolve.
 */

const RAD = Math.PI / 180;
const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;

// Obliquity of the ecliptic.
const OBLIQUITY = RAD * 23.4397;

// Sun altitude at the moment of sunrise / sunset: the geometric centre of
// the sun sits 0.833° below the horizon (34' refraction + 16' semidiameter).
const SUNRISE_ALTITUDE = -0.833 * RAD;

// ----- date <-> Julian helpers ------------------------------------------

function toJulian(date) {
  return date.valueOf() / DAY_MS - 0.5 + J1970;
}

function fromJulian(j) {
  return new Date((j + 0.5 - J1970) * DAY_MS);
}

function toDays(date) {
  return toJulian(date) - J2000;
}

// ----- general sun position ---------------------------------------------

function rightAscension(l, b) {
  return Math.atan2(
    Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY),
    Math.cos(l)
  );
}

function declination(l, b) {
  return Math.asin(
    Math.sin(b) * Math.cos(OBLIQUITY) +
      Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l)
  );
}

// Azimuth measured from due south, turning towards the west.
function azimuthFromSouth(H, phi, dec) {
  return Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)
  );
}

function altitude(H, phi, dec) {
  return Math.asin(
    Math.sin(phi) * Math.sin(dec) +
      Math.cos(phi) * Math.cos(dec) * Math.cos(H)
  );
}

function siderealTime(d, lw) {
  return RAD * (280.16 + 360.9856235 * d) - lw;
}

function solarMeanAnomaly(d) {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M) {
  // Equation of the centre.
  const C =
    RAD *
    (1.9148 * Math.sin(M) +
      0.02 * Math.sin(2 * M) +
      0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372; // perihelion of the Earth
  return M + C + P + Math.PI;
}

function sunCoords(d) {
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  return { dec: declination(L, 0), ra: rightAscension(L, 0) };
}

/**
 * Sun position for a given instant and location.
 * @returns {{azimuth:number, altitude:number}} radians.
 *   azimuth is a compass bearing: 0 = North, 90 = East, 180 = South.
 */
export function getSunPosition(date, lat, lng) {
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const d = toDays(date);
  const c = sunCoords(d);
  const H = siderealTime(d, lw) - c.ra;

  // Convert "from south" azimuth to a compass bearing measured from north.
  let bearing = azimuthFromSouth(H, phi, c.dec) + Math.PI;
  bearing = ((bearing % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  return { azimuth: bearing, altitude: altitude(H, phi, c.dec) };
}

// ----- sunrise / sunset times -------------------------------------------

const J0 = 0.0009;

function julianCycle(d, lw) {
  return Math.round(d - J0 - lw / (2 * Math.PI));
}

function approxTransit(Ht, lw, n) {
  return J0 + (Ht + lw) / (2 * Math.PI) + n;
}

function solarTransitJ(ds, M, L) {
  return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
}

function hourAngle(h, phi, d) {
  return Math.acos(
    (Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d))
  );
}

/**
 * Sunrise / solar-noon / sunset times for the calendar day containing `date`
 * (interpreted around local noon at that longitude).
 *
 * `sunrise` / `sunset` are `null` for polar day or polar night, where the sun
 * never crosses the horizon on that day.
 */
export function getTimes(date, lat, lng) {
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);

  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L, 0);

  const Jnoon = solarTransitJ(ds, M, L);

  const w = hourAngle(SUNRISE_ALTITUDE, phi, dec);
  const polar = Number.isNaN(w); // sun never reaches the horizon this day

  let sunrise = null;
  let sunset = null;
  if (!polar) {
    const Jset = solarTransitJ(approxTransit(w, lw, n), M, L);
    const Jrise = Jnoon - (Jset - Jnoon);
    sunrise = fromJulian(Jrise);
    sunset = fromJulian(Jset);
  }

  return {
    sunrise,
    sunset,
    solarNoon: fromJulian(Jnoon),
    polar,
    // Is the sun above the horizon at local noon? Distinguishes polar day
    // (true) from polar night (false).
    polarDay: polar && altitude(0, phi, dec) > SUNRISE_ALTITUDE,
  };
}

/**
 * Find the next sunrise at or after `now` for a location, and the compass
 * bearing at which the sun will break the horizon.
 *
 * @returns {{time:Date, bearing:number, cardinal:string}|
 *           {time:null, polarDay:boolean}}
 */
export function nextSunrise(lat, lng, now = new Date()) {
  // Look at today and the following few days so we skip past polar spells.
  for (let i = 0; i < 400; i++) {
    const probe = new Date(now.getTime() + i * DAY_MS);
    const { sunrise } = getTimes(probe, lat, lng);
    if (sunrise && sunrise.getTime() > now.getTime()) {
      const bearingRad = getSunPosition(sunrise, lat, lng).azimuth;
      const bearing = (bearingRad / RAD + 360) % 360;
      return { time: sunrise, bearing, cardinal: toCardinal(bearing) };
    }
  }
  // No sunrise in the next ~13 months → deep polar day or night.
  const today = getTimes(now, lat, lng);
  return { time: null, polarDay: today.polarDay };
}

// ----- helpers ----------------------------------------------------------

const CARDINALS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function toCardinal(bearing) {
  const idx = Math.round((((bearing % 360) + 360) % 360) / 22.5) % 16;
  return CARDINALS[idx];
}
