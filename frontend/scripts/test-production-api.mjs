// Explicit production smoke test: two Gemini requests and a temporary anonymous user.
// Requires Supabase CLI login. Server credentials stay in memory, never in browser files.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const site = 'https://trabajo-ihm.rondoypereziker.workers.dev';
const config = await (await fetch(`${site}/assets/config.json`)).json();
assert.equal(config.supabaseUrl, 'https://hfnrmchqihiujdlobeqx.supabase.co');
assert.match(config.supabaseAnonKey, /^sb_publishable_/);
const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', '& ./node_modules/.bin/supabase.cmd projects api-keys --project-ref hfnrmchqihiujdlobeqx --reveal -o json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const parsed = JSON.parse(output);
const keys = Array.isArray(parsed) ? parsed : parsed.api_keys ?? parsed.keys;
const adminKey = keys?.find(k => k.name === 'service_role')?.api_key || keys?.find(k => k.type === 'secret')?.api_key;
assert.ok(adminKey, 'An admin key is needed to remove the temporary test user.');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(config.supabaseUrl, adminKey, options);
const client = createClient(config.supabaseUrl, config.supabaseAnonKey, options);
let user, browser;
try {
  const session = await client.auth.signInAnonymously(); assert.ifError(session.error); user = session.data.user.id;
  const status = await client.functions.invoke('assistant', { body: { action: 'status' } });
  assert.ifError(status.error); assert.equal(status.data.mode, 'gemini');
  console.log('PASS: public key, anonymous authentication and Gemini configuration.');
  const chat = await client.functions.invoke('assistant', { body: { messages: [{ role: 'user', text: 'Saluda brevemente en español.' }] } });
  assert.ifError(chat.error); assert.equal(chat.data.mode, 'gemini'); assert.ok(chat.data.reply?.trim());
  console.log('PASS: Gemini conversation in production.');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const image = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 200;
    const x = c.getContext('2d'); x.fillStyle = 'white'; x.fillRect(0, 0, 200, 200);
    x.fillStyle = 'red'; x.fillRect(30, 30, 140, 140); return c.toDataURL('image/png');
  });
  const vision = await client.functions.invoke('describe-image', { body: { image } });
  assert.ifError(vision.error); assert.match(vision.data.description.toLowerCase(), /roj[oa]/);
  console.log('PASS: Gemini describes a synthetic red shape in production.');
  await page.addInitScript(saved => {
    localStorage.setItem('sb-hfnrmchqihiujdlobeqx-auth-token', JSON.stringify(saved));
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', e => window.__cspViolations.push(e.violatedDirective));
  }, session.data.session);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByRole('heading', { name: 'El mundo, a tu alcance.' }).waitFor();
  await page.goto(`${site}/mapa`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('.leaflet-container').waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('img.leaflet-tile')].some(i => i.complete && i.naturalWidth > 0));
  assert.deepEqual(await page.evaluate(() => window.__cspViolations), []);
  await page.goto(`${site}/asistente`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByRole('button', { name: 'Conversar por voz', exact: true }).waitFor();
  await page.getByRole('status').filter({ hasText: 'Gemini' }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.__cspViolations), []);
  assert.deepEqual(errors, []);
  console.log('PASS: published reader, real map tiles and assistant render without JavaScript or CSP errors.');
} finally {
  await browser?.close();
  if (user) { const result = await admin.auth.admin.deleteUser(user); assert.ifError(result.error); console.log('Temporary test user removed.'); }
}
