/*
 * weather.js — forecast for the upcoming sunrise.
 *
 * Weather inherently needs a live forecast, so this is the one part of the app
 * that reaches the network. It uses Open-Meteo (https://open-meteo.com) — free,
 * no API key, CORS-enabled — fetches the hourly forecast, and picks the hour
 * nearest the sunrise. If there's no signal it fails soft and the UI shows
 * "offline" rather than breaking.
 *
 * The pure helpers (weatherInfo / summarizeForecast) are unit-tested without
 * any network.
 */

// WMO weather-interpretation codes → a small emoji icon + short label.
// https://open-meteo.com/en/docs  (weather_code)
const WMO = {
  0: { icon: '☀️', label: 'Clear' },
  1: { icon: '🌤️', label: 'Mainly clear' },
  2: { icon: '⛅', label: 'Partly cloudy' },
  3: { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫️', label: 'Fog' },
  48: { icon: '🌫️', label: 'Rime fog' },
  51: { icon: '🌦️', label: 'Light drizzle' },
  53: { icon: '🌦️', label: 'Drizzle' },
  55: { icon: '🌦️', label: 'Dense drizzle' },
  56: { icon: '🌧️', label: 'Freezing drizzle' },
  57: { icon: '🌧️', label: 'Freezing drizzle' },
  61: { icon: '🌦️', label: 'Light rain' },
  63: { icon: '🌧️', label: 'Rain' },
  65: { icon: '🌧️', label: 'Heavy rain' },
  66: { icon: '🌧️', label: 'Freezing rain' },
  67: { icon: '🌧️', label: 'Freezing rain' },
  71: { icon: '🌨️', label: 'Light snow' },
  73: { icon: '🌨️', label: 'Snow' },
  75: { icon: '❄️', label: 'Heavy snow' },
  77: { icon: '🌨️', label: 'Snow grains' },
  80: { icon: '🌦️', label: 'Light showers' },
  81: { icon: '🌧️', label: 'Showers' },
  82: { icon: '⛈️', label: 'Heavy showers' },
  85: { icon: '🌨️', label: 'Snow showers' },
  86: { icon: '🌨️', label: 'Snow showers' },
  95: { icon: '⛈️', label: 'Thunderstorm' },
  96: { icon: '⛈️', label: 'Thunderstorm' },
  99: { icon: '⛈️', label: 'Thunderstorm' },
};

export function weatherInfo(code) {
  return WMO[code] || { icon: '🌡️', label: 'Unknown' };
}

// Index of the forecast hour closest to `targetSec` (unix seconds), or -1 if
// the nearest sample is more than `maxGapSec` away (e.g. sunrise is outside the
// forecast window — happens for far-future polar sunrises).
function nearestIndex(timesSec, targetSec, maxGapSec = 6 * 3600) {
  let best = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < timesSec.length; i++) {
    const d = Math.abs(timesSec[i] - targetSec);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  }
  return bestDiff <= maxGapSec ? best : -1;
}

/**
 * Reduce an Open-Meteo response (with hourly time as unixtime) to the
 * conditions at sunrise: { tempC, code, icon, label }, or null if unavailable.
 */
export function summarizeForecast(json, sunriseDate) {
  const h = json && json.hourly;
  if (!h || !Array.isArray(h.time) || !Array.isArray(h.temperature_2m)) return null;

  const idx = nearestIndex(h.time, Math.round(sunriseDate.getTime() / 1000));
  if (idx < 0) return null;

  const temp = h.temperature_2m[idx];
  if (typeof temp !== 'number' || Number.isNaN(temp)) return null;

  const code = Array.isArray(h.weather_code) ? h.weather_code[idx] : 0;
  return { tempC: temp, code, ...weatherInfo(code) };
}

/**
 * Fetch the forecast and return the conditions at `sunriseDate`, or null on any
 * failure (offline, bad response, out of range). `fetchImpl` is injectable for
 * tests.
 */
export async function fetchSunriseWeather(lat, lon, sunriseDate, fetchImpl) {
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!doFetch) return null;

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    '&hourly=temperature_2m,weather_code' +
    '&temperature_unit=celsius&timeformat=unixtime&forecast_days=2';

  try {
    const res = await doFetch(url, { mode: 'cors' });
    if (!res || !res.ok) return null;
    const json = await res.json();
    return summarizeForecast(json, sunriseDate);
  } catch {
    return null;
  }
}
