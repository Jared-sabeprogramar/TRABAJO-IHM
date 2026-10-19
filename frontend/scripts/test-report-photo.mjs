// Local integration test: creates isolated evidence and cleans only its own IDs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const config = JSON.parse(readFileSync(new URL('../src/assets/config.local.json', import.meta.url)));
assert.equal(config.supabaseUrl, 'http://127.0.0.1:54321', 'Local environment only');
const status = JSON.parse(execFileSync('cmd.exe', ['/d', '/s', '/c', 'node_modules\\.bin\\supabase.cmd status -o json'], { stdio: ['ignore', 'pipe', 'pipe'] }).toString());
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(config.supabaseUrl, status.SERVICE_ROLE_KEY, options);
const client = createClient(config.supabaseUrl, config.supabaseAnonKey, options);
const sql = (query) => execFileSync('docker', ['exec', '-i', 'supabase_db_acces', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], { input: query, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const run = randomUUID();
let userId;
let browser;
try {
  const session = await client.auth.signInAnonymously();
  assert.ok(!session.error && session.data.user, 'Anonymous access failed');
  userId = session.data.user.id;
  assert.match(userId, /^[a-f0-9-]{36}$/);
  const identify = await client.functions.invoke('identify', { body: { dni: String(randomInt(10000000, 99999999)) } });
  assert.ok(!identify.error, 'Identification failed');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const photo = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 150;
    const context = canvas.getContext('2d'); context.fillStyle = 'white'; context.fillRect(0, 0, 200, 150);
    context.fillStyle = 'black'; context.fillRect(20, 40, 100, 40);
    return canvas.toDataURL('image/jpeg', 0.7);
  });
  const input = { name: `Photo integration ${run}`, latitude: randomInt(100000, 900000) / 1000000,
    longitude: randomInt(100000, 900000) / 1000000, category: 'stairs', description: 'Synthetic photo integration test', photo };
  const result = await client.functions.invoke('submit-report', { body: input });
  assert.ok(!result.error && result.data?.place_id, 'Photo report submission failed');
  const evidence = sql(`select photo_path from private.reports where user_id='${userId}';`);
  assert.ok(evidence.startsWith(`${userId}/`), 'Missing evidence association');
  const download = await admin.storage.from('report-photos').download(evidence);
  assert.ok(!download.error && download.data.size > 0, 'Private photo missing');
  const publicDownload = await client.storage.from('report-photos').download(evidence);
  assert.ok(publicDownload.error, 'Photo must not be publicly readable');
  const summary = await client.from('place_report_summary').select('*').eq('id', result.data.place_id).single();
  assert.ok(!summary.error && summary.data.report_count === 1, 'Map aggregate missing');
  assert.ok(summary.data.categories.includes('stairs'), 'Barrier warning missing');
  assert.equal('photo_path' in summary.data, false);
  const duplicate = await client.functions.invoke('submit-report', { body: input });
  assert.equal(duplicate.error?.context?.status, 409);
  const objects = await admin.storage.from('report-photos').list(userId);
  assert.equal(objects.data?.length, 1, 'Failed duplicate upload was not removed');
  console.log('PASS: real camera-format JPEG, private Storage, report association, public warning, duplicate upload cleanup.');
} finally {
  await browser?.close();
  if (userId) {
    const objects = await admin.storage.from('report-photos').list(userId);
    assert.ok(!objects.error, 'Cannot list test-owned photos for cleanup');
    if (objects.data.length) {
      const removed = await admin.storage.from('report-photos').remove(objects.data.map(o => `${userId}/${o.name}`));
      assert.ok(!removed.error, 'Cannot remove test-owned photos');
    }
    sql(`delete from private.reports where user_id='${userId}';
      delete from private.places p where name='Photo integration ${run}' and not exists(select 1 from private.reports r where r.place_id=p.id);`);
    const removed = await admin.auth.admin.deleteUser(userId);
    assert.ok(!removed.error, 'Cannot remove temporary test user');
    console.log('Only this test session, evidence and report were removed.');
  }
}
