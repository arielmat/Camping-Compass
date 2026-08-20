/*
 * Verifies the solar math against independently-known reference values.
 * Run with:  node --test   (or  npm test)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTimes, getSunPosition, nextSunrise, toCardinal } from '../js/solar.js';

// Small helper: minutes between two dates.
const minutesBetween = (a, b) => Math.abs(a - b) / 60000;

test('sunrise time — New York, 2026-06-21 (summer solstice)', () => {
  // NOAA: sunrise 05:24 EDT = 09:24 UTC (±1 min).
  const { sunrise } = getTimes(new Date('2026-06-21T12:00:00Z'), 40.7128, -74.006);
  const expected = new Date('2026-06-21T09:25:00Z');
  assert.ok(minutesBetween(sunrise, expected) < 3, `got ${sunrise.toISOString()}`);
});

test('sunrise time — London, 2026-12-21 (winter solstice)', () => {
  // NOAA: sunrise ~08:03 GMT = 08:03 UTC.
  const { sunrise } = getTimes(new Date('2026-12-21T12:00:00Z'), 51.5074, -0.1278);
  const expected = new Date('2026-12-21T08:04:00Z');
  assert.ok(minutesBetween(sunrise, expected) < 3, `got ${sunrise.toISOString()}`);
});

test('sunrise time — Sydney, 2026-03-20 (equinox)', () => {
  // NOAA: sunrise ~06:56 AEDT = 19:56 UTC (previous day).
  const { sunrise } = getTimes(new Date('2026-03-20T02:00:00Z'), -33.8688, 151.2093);
  const expected = new Date('2026-03-19T19:56:00Z');
  assert.ok(minutesBetween(sunrise, expected) < 4, `got ${sunrise.toISOString()}`);
});

test('sunrise bearing is due-East (~90°) at the equinox', () => {
  // At an equinox the sun rises almost due east everywhere.
  const { sunrise } = getTimes(new Date('2026-03-20T12:00:00Z'), 40.7128, -74.006);
  const { bearing } = { bearing: (getSunPosition(sunrise, 40.7128, -74.006).azimuth * 180) / Math.PI };
  assert.ok(Math.abs(bearing - 90) < 2.5, `equinox bearing ${bearing.toFixed(1)}°`);
});

test('summer sunrise is north-of-east in the northern hemisphere', () => {
  const r = nextSunrise(40.7128, -74.006, new Date('2026-06-21T00:00:00Z'));
  // Sun rises well north of east → bearing noticeably < 90°.
  assert.ok(r.bearing < 65 && r.bearing > 45, `summer bearing ${r.bearing.toFixed(1)}°`);
  assert.ok(['NE', 'ENE'].includes(r.cardinal), `cardinal ${r.cardinal}`);
});

test('winter sunrise is south-of-east in the northern hemisphere', () => {
  const r = nextSunrise(40.7128, -74.006, new Date('2026-12-21T00:00:00Z'));
  assert.ok(r.bearing > 115 && r.bearing < 135, `winter bearing ${r.bearing.toFixed(1)}°`);
  assert.ok(['SE', 'ESE'].includes(r.cardinal), `cardinal ${r.cardinal}`);
});

test('nextSunrise always returns a future time', () => {
  const now = new Date('2026-08-20T12:00:00Z');
  const r = nextSunrise(48.8566, 2.3522, now); // Paris, afternoon → next is tomorrow
  assert.ok(r.time.getTime() > now.getTime());
  assert.ok(minutesBetween(r.time, now) < 24 * 60, 'within the next day');
});

test('polar day is detected at the North Pole in June', () => {
  // The single day 2026-06-21 has no sunrise (midnight sun)...
  const { polar, polarDay } = getTimes(new Date('2026-06-21T12:00:00Z'), 89.9, 0);
  assert.equal(polar, true);
  assert.equal(polarDay, true);
  // ...but nextSunrise still finds the real next one months out, when the
  // polar day ends (late September).
  const r = nextSunrise(89.9, 0, new Date('2026-06-21T00:00:00Z'));
  assert.ok(r.time.getTime() > new Date('2026-09-01T00:00:00Z').getTime());
});

test('polar night is detected at the North Pole in December', () => {
  const { polar, polarDay } = getTimes(new Date('2026-12-21T12:00:00Z'), 89.9, 0);
  assert.equal(polar, true);
  assert.equal(polarDay, false);
});

test('toCardinal maps bearings to the right compass point', () => {
  assert.equal(toCardinal(0), 'N');
  assert.equal(toCardinal(90), 'E');
  assert.equal(toCardinal(180), 'S');
  assert.equal(toCardinal(270), 'W');
  assert.equal(toCardinal(45), 'NE');
  assert.equal(toCardinal(359), 'N');
});
