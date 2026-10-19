// Tests the production CSP against a disposable copy, never the publishable bundle.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, cpSync, readFileSync, statSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { writeProductionArtifacts } from './production.mjs';

const root = mkdtempSync(join(tmpdir(), 'acces-csp-'));
const source = fileURLToPath(new URL('../dist/frontend/browser', import.meta.url));
const backend = 'https://hfnrmchqihiujdlobeqx.supabase.co';
let browser, server;
try {
  cpSync(source, root, { recursive: true });
  writeProductionArtifacts(root, { supabaseUrl: backend, supabaseAnonKey: 'sb_publishable_synthetic_test_key_12345' });
  const headers = {};
  for (const line of readFileSync(join(root, '_headers'), 'utf8').split('\n').slice(1)) {
    if (!line.startsWith('  ')) break;
    const colon = line.indexOf(':'); headers[line.slice(2, colon)] = line.slice(colon + 1).trim();
  }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
  server = createServer((req, res) => {
    let file = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403); res.end(); return; }
    if (!existsSync(file) || !statSync(file).isFile()) file = join(root, 'index.html');
    res.writeHead(200, { ...headers, 'Content-Type': mime[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const site = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext(); const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', event => window.cspViolations.push(event.violatedDirective + ': ' + event.blockedURI));
  });
  await page.route(backend + '/rest/v1/place_report_summary*', r => r.fulfill({ json: [] }));
  await page.goto(site + '/mapa');
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.leaflet-tile')).some(i => i.complete && i.naturalWidth > 0));
  assert.deepEqual(await page.evaluate(() => window.cspViolations), []);
  await page.goto(site);
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 1000; c.height = 400;
    const x = c.getContext('2d'); x.fillStyle = 'white'; x.fillRect(0, 0, 1000, 400); x.fillStyle = 'black'; x.font = 'bold 65px Arial'; x.fillText('SALIDA DE EMERGENCIA', 50, 200);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Seleccionar imagen').setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.getByRole('button', { name: 'Leer texto en voz alta' }).click();
  await page.waitForFunction(() => document.querySelector('.recognized-text')?.textContent.includes('SALIDA DE EMERGENCIA'), {}, { timeout: 120000 });
  assert.deepEqual(await page.evaluate(() => window.cspViolations), []);
  assert.deepEqual(errors, []);
  console.log('PASS: production CSP permits Angular, Leaflet tiles, OCR worker and WASM without policy violations.');
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  // mkdtemp creates this known task directory under the OS temporary directory.
  assert.ok(root.startsWith(join(tmpdir(), 'acces-csp-')));
  rmSync(root, { recursive: true, force: true });
}
