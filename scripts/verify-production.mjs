// Read-only check of the public deployment. Does not create users, reports or AI requests.
import { validateProductionConfig } from '../frontend/scripts/production.mjs';
const site = process.argv[2] || 'https://trabajo-ihm.rondoypereziker.workers.dev';
const expectedBackend = 'https://hfnrmchqihiujdlobeqx.supabase.co';
let failed = false;
for (const route of ['/', '/mapa', '/asistente', '/recientes']) {
  try {
    const r = await fetch(new URL(route, site), { signal: AbortSignal.timeout(15000) });
    const html = await r.text();
    const ok = r.ok && html.includes('<app-root');
    console.log(`${route}: ${ok ? 'OK' : 'FAIL'} (${r.status})`); failed ||= !ok;
    if (route === '/' && !r.headers.has('content-security-policy')) { console.log('FAIL: missing Content-Security-Policy'); failed = true; }
  } catch { console.log(`${route}: FAIL connection`); failed = true; }
}
try {
  const r = await fetch(new URL('/assets/config.json', site), { signal: AbortSignal.timeout(15000) });
  const config = await r.json();
  validateProductionConfig({ SUPABASE_URL: config.supabaseUrl, SUPABASE_PUBLISHABLE_KEY: config.supabaseAnonKey });
  const ok = r.ok && config.supabaseUrl === expectedBackend;
  console.log(`Public backend configuration: ${ok ? 'OK' : 'FAIL'}`); failed ||= !ok;
} catch { console.log('Public backend configuration: FAIL'); failed = true; }
process.exitCode = failed ? 1 : 0;
