import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
const c = JSON.parse(readFileSync(new URL('../src/assets/config.local.json', import.meta.url), 'utf8'));
assert.equal(c.supabaseUrl, 'http://127.0.0.1:54321', 'Local tests only');
const client = createClient(c.supabaseUrl, c.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
let user;
try {
  const session = await client.auth.signInAnonymously(); assert.ifError(session.error); user = session.data.user.id;
  const status = await client.functions.invoke('assistant', { body: { action: 'status' } }); assert.ifError(status.error);
  assert.ok(['basic', 'gemini'].includes(status.data.mode));
  const invalid = await client.functions.invoke('assistant', { body: { messages: [{ role: 'system', text: 'Invalid role' }] } });
  assert.equal(invalid.error?.context.status, 400);
  if (status.data.mode === 'basic') {
    const result = await client.functions.invoke('assistant', { body: { messages: [{ role: 'user', text: 'Cuéntame un chiste' }] } });
    assert.ifError(result.error); assert.equal(result.data.mode, 'basic'); assert.match(result.data.reply, /abeja/);
    const route = await client.functions.invoke('assistant', { body: { messages: [{ role: 'user', text: 'Mis rutas' }], routes: [{ name: 'Biblioteca', visits: 2, distance: 100 }] } });
    assert.ifError(route.error); assert.match(route.data.reply, /Biblioteca/);
  } else {
    const result = await client.functions.invoke('assistant', { body: { messages: [{ role: 'user', text: 'Saluda brevemente en español.' }] } });
    if (result.error?.context) console.log('Gemini test:', result.error.context.status, await result.error.context.json());
    assert.ifError(result.error); assert.equal(result.data.mode, 'gemini'); assert.ok(result.data.reply?.trim());
    console.log('Gemini respondió correctamente a una consulta real.');
  }
  console.log('PASS: assistant authentication, mode status, validation, basic conversation and optional route summaries.');
} finally {
  if (user && /^[a-f0-9-]{36}$/.test(user)) execFileSync('docker', ['exec', '-i', 'supabase_db_acces', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: `delete from auth.users where id='${user}';`, stdio: ['pipe', 'pipe', 'pipe'] });
}
