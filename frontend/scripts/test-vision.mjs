// Opt-in live Gemini smoke test. Sends only a synthetic image, never a user's photo.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const config = JSON.parse(readFileSync(new URL('../src/assets/config.local.json', import.meta.url), 'utf8'));
assert.equal(config.supabaseUrl, 'http://127.0.0.1:54321', 'Local tests only');
const client = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
let browser, user;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const image = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 300; c.height = 200;
    const x = c.getContext('2d'); x.fillStyle = 'white'; x.fillRect(0, 0, 300, 200);
    x.fillStyle = 'red'; x.fillRect(20, 20, 100, 100);
    return c.toDataURL('image/png');
  });
  const session = await client.auth.signInAnonymously(); assert.ifError(session.error); user = session.data.user.id;
  const result = await client.functions.invoke('describe-image', { body: { image } });
  if (result.error?.context) console.log('Vision test:', result.error.context.status, await result.error.context.json());
  assert.ifError(result.error);
  assert.equal(typeof result.data.description, 'string');
  assert.match(result.data.description.toLowerCase(), /roj[oa]/, 'Description should identify the red shape');
  console.log('PASS: real Gemini image description identifies the synthetic red shape.');
} finally {
  await browser?.close();
  if (user && /^[a-f0-9-]{36}$/.test(user)) execFileSync('docker', ['exec', '-i', 'supabase_db_acces', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: `delete from auth.users where id='${user}';`, stdio: ['pipe', 'pipe', 'pipe'] });
}
