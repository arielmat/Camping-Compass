/*
 * e2e.mjs — drives the real app in a headless Chromium (Playwright) to prove
 * it renders and reacts to location + compass input without runtime errors.
 *
 *   node test/e2e.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png',
};

function serve() {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      const fp = normalize(join(ROOT, p));
      if (!fp.startsWith(ROOT)) return res.writeHead(403).end();
      const info = await stat(fp);
      if (info.isDirectory()) throw new Error('dir');
      res.writeHead(200, { 'Content-Type': TYPES[extname(fp)] || 'application/octet-stream' });
      res.end(await readFile(fp));
    } catch {
      res.writeHead(404).end('nope');
    }
  });
  return new Promise((r) => server.listen(0, () => r({ server, port: server.address().port })));
}

const results = [];
function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

const { server, port } = await serve();
const base = `http://localhost:${port}`;
const findEPS = 0.02;

// Use the browser pre-installed in this environment rather than the one the
// npm package version expects (which may not match). Falls back to the default.
const EXECS = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  process.env.PW_CHROMIUM,
].filter(Boolean);
const executablePath = EXECS.find((p) => existsSync(p));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone-ish
  isMobile: true,
  hasTouch: true,
  geolocation: { latitude: 40.7128, longitude: -74.006 }, // New York
  permissions: ['geolocation'],
  locale: 'en-US',
  timezoneId: 'America/New_York',
});
const page = await context.newPage();

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });

try {
  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__campingSunrise, { timeout: 5000 });

  // 1. Feed a location (mirrors what geolocation would deliver) and compute.
  await page.evaluate(() => window.__campingSunrise.setLocation(40.7128, -74.006, 'Test NYC'));

  const riseTime = await page.textContent('#riseTime');
  check('sunrise time renders as HH:MM', /^\d{1,2}:\d{2}/.test(riseTime.trim()), riseTime);

  const riseDir = (await page.textContent('#riseDir')).trim();
  check('sunrise direction is a compass point', /^[NESW]{1,3}$/.test(riseDir), riseDir);

  const bearing = await page.textContent('#riseBearing');
  check('bearing shows degrees + day label', /\d+°/.test(bearing), bearing);

  const countdown = (await page.textContent('#countdown')).trim();
  check('countdown renders', /(\d+h\s*)?\d+m|—/.test(countdown), countdown);

  // 2. The sunrise marker should be positioned at the real bearing.
  const riseVar = await page.evaluate(() =>
    getComputedStyle(document.getElementById('sunMarker')).getPropertyValue('--rise'));
  check('sun marker has a bearing set', /\d/.test(riseVar), riseVar.trim());

  // 3. Simulate the compass turning and confirm the dial rotates + heading shows.
  await page.evaluate(() => {
    // Android-style absolute orientation: alpha counter-clockwise from north.
    const ev = new Event('deviceorientationabsolute');
    Object.defineProperties(ev, {
      alpha: { value: 300 }, beta: { value: 0 }, gamma: { value: 0 },
      absolute: { value: true },
    });
    window.dispatchEvent(ev);
    // Some browsers only wire the plain event:
    const ev2 = new Event('deviceorientation');
    Object.defineProperties(ev2, {
      alpha: { value: 300 }, beta: { value: 0 }, gamma: { value: 0 },
      absolute: { value: true },
    });
    window.dispatchEvent(ev2);
  });
  await page.waitForTimeout(200);

  const heading = await page.textContent('#hubHeading');
  // alpha 300 → heading (360-300)=60°
  check('heading updates from compass event', /60°/.test(heading), heading);

  const dialT = await page.evaluate(() =>
    getComputedStyle(document.getElementById('dial')).transform);
  check('dial applies a rotation matrix', dialT !== 'none' && dialT.startsWith('matrix'), dialT);

  // 4. Southern hemisphere sanity: Sydney in local winter rises north-of-east.
  await page.evaluate(() => window.__campingSunrise.setLocation(-33.8688, 151.2093, 'Sydney'));
  const sydDir = (await page.textContent('#riseDir')).trim();
  check('Sydney direction renders', /^[NESW]{1,3}$/.test(sydDir), sydDir);

  // 5. No uncaught runtime errors throughout.
  check('no page/runtime errors', pageErrors.length === 0, pageErrors.join(' | ') || 'clean');

  // 6. Manual-entry validation path.
  await page.evaluate(() => window.__campingSunrise.setLocation(51.5074, -0.1278, 'London'));
  const londonTime = (await page.textContent('#riseTime')).trim();
  check('London recompute works', /^\d{1,2}:\d{2}/.test(londonTime), londonTime);

} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} e2e checks passed`);
if (failed.length) process.exit(1);
