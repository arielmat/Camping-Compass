/*
 * Unit tests for the weather helpers (no network — the fetch is injected).
 * Run with:  npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  weatherInfo,
  summarizeForecast,
  fetchSunriseWeather,
} from '../js/weather.js';

test('weatherInfo maps WMO codes to an icon + label', () => {
  assert.equal(weatherInfo(0).label, 'Clear');
  assert.equal(weatherInfo(3).label, 'Overcast');
  assert.equal(weatherInfo(95).label, 'Thunderstorm');
  assert.ok(weatherInfo(0).icon.length > 0);
  // Unknown code falls back rather than throwing.
  assert.equal(weatherInfo(1234).label, 'Unknown');
});

// Build an hourly forecast (unixtime) around a reference sunrise.
function fakeForecast(sunrise) {
  const base = Math.round(sunrise.getTime() / 1000);
  const time = [];
  const temperature_2m = [];
  const weather_code = [];
  for (let i = -3; i <= 3; i++) {
    time.push(base + i * 3600);
    temperature_2m.push(10 + i); // 7,8,9,10,11,12,13 — sunrise hour = 10
    weather_code.push(i === 0 ? 61 : 0); // rain exactly at sunrise
  }
  return { hourly: { time, temperature_2m, weather_code } };
}

test('summarizeForecast picks the hour nearest sunrise', () => {
  const sunrise = new Date('2026-08-21T05:32:00Z');
  const out = summarizeForecast(fakeForecast(sunrise), sunrise);
  assert.equal(out.tempC, 10);
  assert.equal(out.code, 61);
  assert.equal(out.label, 'Light rain');
});

test('summarizeForecast rounds to the closest hour, not just the floor', () => {
  const sunrise = new Date('2026-08-21T05:32:00Z');
  // Samples sit at :32 each hour. Target 06:12 is 40 min after the 05:32
  // sample but only 20 min before the 06:32 one → the later hour wins.
  const later = new Date(sunrise.getTime() + 40 * 60000);
  const out = summarizeForecast(fakeForecast(sunrise), later);
  assert.equal(out.tempC, 11);
});

test('summarizeForecast returns null when sunrise is outside the forecast window', () => {
  const sunrise = new Date('2026-08-21T05:32:00Z');
  const farFuture = new Date(sunrise.getTime() + 30 * 3600 * 1000); // 30h beyond
  assert.equal(summarizeForecast(fakeForecast(sunrise), farFuture), null);
});

test('summarizeForecast handles malformed payloads', () => {
  const s = new Date();
  assert.equal(summarizeForecast(null, s), null);
  assert.equal(summarizeForecast({}, s), null);
  assert.equal(summarizeForecast({ hourly: { time: [] } }, s), null);
});

test('fetchSunriseWeather returns conditions via an injected fetch', async () => {
  const sunrise = new Date('2026-08-21T05:32:00Z');
  let calledUrl = '';
  const fakeFetch = async (url) => {
    calledUrl = url;
    return { ok: true, json: async () => fakeForecast(sunrise) };
  };
  const out = await fetchSunriseWeather(40.7128, -74.006, sunrise, fakeFetch);
  assert.equal(out.tempC, 10);
  assert.match(calledUrl, /api\.open-meteo\.com/);
  assert.match(calledUrl, /timeformat=unixtime/);
  assert.match(calledUrl, /temperature_unit=celsius/);
});

test('fetchSunriseWeather fails soft (offline) → null', async () => {
  const sunrise = new Date();
  const boom = async () => {
    throw new Error('network down');
  };
  assert.equal(await fetchSunriseWeather(0, 0, sunrise, boom), null);

  const notOk = async () => ({ ok: false });
  assert.equal(await fetchSunriseWeather(0, 0, sunrise, notOk), null);
});
