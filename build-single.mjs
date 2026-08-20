/*
 * build-single.mjs — bundle the whole app into one self-contained .html file
 * (inline CSS + JS, inline SVG favicon) that can be saved to a phone and
 * opened offline. Output: dist/camping-sunrise.html
 *
 *   node build-single.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const read = (p) => readFile(ROOT + p, 'utf8');

const css = await read('css/styles.css');
let solar = await read('js/solar.js');
let app = await read('js/app.js');
const svg = await read('icons/icon.svg');

// Merge the two ES modules into one module scope: drop the cross-file
// import, and turn `export function` into plain declarations.
solar = solar.replace(/export function/g, 'function');
app = app
  .replace(/^import\s+\{[^}]*\}\s+from\s+'\.\/solar\.js';\s*$/m, '')
  // The service worker can't register from file://; drop that block.
  .replace(/\/\/ Register the service worker[\s\S]*?\}\s*\n/, '');

const script = `${solar}\n\n/* ---- app ---- */\n${app}`;
const favicon = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1" />
  <meta name="theme-color" content="#0b1026" />
  <title>Camping Sunrise</title>
  <meta name="description" content="Point your phone and find exactly where and when the sun will rise tomorrow morning." />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Camping Sunrise" />
  <link rel="icon" type="image/svg+xml" href="${favicon}" />
  <link rel="apple-touch-icon" href="${favicon}" />
  <style>
${css}
  </style>
</head>
<body>
  <div class="sky" aria-hidden="true">
    <div class="stars"></div>
    <div class="glow"></div>
  </div>

  <main class="app">
    <header class="topbar">
      <h1 class="wordmark"><span class="sun-dot"></span>Camping&nbsp;Sunrise</h1>
      <p class="tagline">Where &amp; when the sun breaks the horizon</p>
    </header>

    <section class="compass-stage" aria-label="Sunrise compass">
      <div class="compass" id="compass">
        <div class="dial" id="dial">
          <div class="ticks" id="ticks"></div>
          <span class="card card-n">N</span>
          <span class="card card-e">E</span>
          <span class="card card-s">S</span>
          <span class="card card-w">W</span>
          <div class="sun-marker" id="sunMarker">
            <div class="sun-ray"></div>
            <div class="sun-icon">☀</div>
          </div>
        </div>
        <div class="needle" aria-hidden="true"></div>
        <div class="hub">
          <div class="hub-heading" id="hubHeading">--°</div>
          <div class="hub-label">heading</div>
        </div>
      </div>
      <p class="align-hint" id="alignHint">Turn until the ☀ reaches the top</p>
    </section>

    <section class="readouts">
      <div class="readout">
        <div class="readout-value" id="riseTime">--:--</div>
        <div class="readout-key">sunrise</div>
      </div>
      <div class="readout">
        <div class="readout-value" id="riseDir">--</div>
        <div class="readout-key" id="riseBearing">-- bearing</div>
      </div>
      <div class="readout">
        <div class="readout-value" id="countdown">--:--</div>
        <div class="readout-key">until sunrise</div>
      </div>
    </section>

    <p class="place" id="place">Locating you…</p>

    <div class="gate" id="gate">
      <button class="btn" id="enableBtn">Enable location &amp; compass</button>
      <p class="gate-note" id="gateNote">
        Camping Sunrise needs your location and the device compass. Nothing
        leaves your phone — all calculations run on‑device.
      </p>
    </div>

    <details class="manual" id="manual">
      <summary>Set location manually</summary>
      <div class="manual-row">
        <label>Lat <input id="latIn" type="number" step="0.0001" placeholder="40.7128" inputmode="decimal" /></label>
        <label>Lon <input id="lonIn" type="number" step="0.0001" placeholder="-74.0060" inputmode="decimal" /></label>
        <button class="btn btn-sm" id="applyManual">Use</button>
      </div>
    </details>

    <footer class="footnote" id="footnote">
      On‑device astronomy · no tracking
    </footer>
  </main>

  <script type="module">
${script}
  </script>
</body>
</html>
`;

await mkdir(ROOT + 'dist', { recursive: true });
await writeFile(ROOT + 'dist/camping-sunrise.html', html);
console.log('Wrote dist/camping-sunrise.html (' + (html.length / 1024).toFixed(1) + ' KB)');
