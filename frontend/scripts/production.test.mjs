import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateProductionConfig, writeProductionArtifacts } from './production.mjs';
const valid = { SUPABASE_URL: 'https://hfnrmchqihiujdlobeqx.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_test_key_12345' };

test('production refuses missing settings and local or credential-bearing URLs', () => {
  assert.throws(() => validateProductionConfig({}));
  for (const url of ['http://localhost:54321', 'https://127.0.0.1', 'https://192.168.1.1', 'https://[::1]', 'https://backend.local', 'https://u:p@supabase.co', 'https://project.supabase.co/private'])
    assert.throws(() => validateProductionConfig({ ...valid, SUPABASE_URL: url }));
});
test('production refuses server secrets and privileged JWTs', () => {
  const privileged = ['e30', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'signature'].join('.');
  for (const key of ['sb_secret_do_not_publish', privileged, 'invalid-key']) assert.throws(() => validateProductionConfig({ ...valid, SUPABASE_PUBLISHABLE_KEY: key }));
  for (const name of ['GEMINI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) assert.throws(() => validateProductionConfig({ ...valid, [name]: 'synthetic-private-value' }));
});
test('production accepts publishable keys and legacy anon keys only', () => {
  assert.equal(validateProductionConfig(valid).supabaseUrl, valid.SUPABASE_URL);
  const key = ['e30', Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url'), 'signature'].join('.');
  assert.equal(validateProductionConfig({ SUPABASE_URL: valid.SUPABASE_URL, SUPABASE_ANON_KEY: key }).supabaseAnonKey, key);
});
test('production emits only public settings, removes local overrides and restricts connections', () => {
  const directory = mkdtempSync(join(tmpdir(), 'acces-production-'));
  try {
    mkdirSync(join(directory, 'assets')); writeFileSync(join(directory, 'index.html'), '<app-root></app-root>');
    writeFileSync(join(directory, 'assets/config.local.json'), '{"supabaseUrl":"http://localhost"}');
    writeProductionArtifacts(directory, validateProductionConfig(valid));
    assert.equal(existsSync(join(directory, 'assets/config.local.json')), false);
    const config = JSON.parse(readFileSync(join(directory, 'assets/config.json'), 'utf8'));
    assert.deepEqual(Object.keys(config).sort(), ['supabaseAnonKey', 'supabaseUrl']);
    const headers = readFileSync(join(directory, '_headers'), 'utf8');
    assert.match(headers, /frame-ancestors 'none'/); assert.ok(headers.includes(valid.SUPABASE_URL));
    assert.ok(!headers.includes("'unsafe-eval'")); assert.ok(!headers.includes('generativelanguage.googleapis.com'));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
