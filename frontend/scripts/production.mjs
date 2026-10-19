import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isIP } from 'node:net';

export function validateProductionConfig(env) {
  for (const name of ['GEMINI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY']) {
    if (env[name]) throw new Error(`${name} pertenece al servidor Supabase, no al build del frontend.`);
  }
  const rawUrl = env.SUPABASE_URL?.trim();
  const key = (env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY)?.trim();
  if (!rawUrl || !key) throw new Error('Configura SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY para producción.');
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error('SUPABASE_URL no es una URL válida.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || !['', '/'].includes(url.pathname) || isIP(url.hostname.replace(/[\[\]]/g, '')) || !url.hostname.includes('.') || /(^|\.)(localhost|local|internal|example|test|invalid)$/.test(url.hostname))
    throw new Error('Producción necesita una URL HTTPS pública de Supabase, sin rutas ni credenciales.');
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(key);
  if (!publicKey && key.split('.').length === 3) {
    try { publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role === 'anon'; } catch { /* reject malformed JWT */ }
  }
  if (!publicKey) throw new Error('Usa únicamente una clave publishable o anon; nunca service_role ni sb_secret.');
  return { supabaseUrl: url.origin, supabaseAnonKey: key };
}

export function writeProductionArtifacts(output, config) {
  if (!existsSync(join(output, 'index.html'))) throw new Error('Compila Angular antes de preparar los archivos de producción.');
  const assets = join(output, 'assets'); mkdirSync(assets, { recursive: true });
  rmSync(join(assets, 'config.local.json'), { force: true });
  writeFileSync(join(assets, 'config.json'), JSON.stringify(config, null, 2) + '\n');
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://tile.openstreetmap.org",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' ${config.supabaseUrl} https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://raw.githubusercontent.com`,
    "worker-src 'self' blob: https://cdn.jsdelivr.net",
    "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'",
  ].join('; ');
  writeFileSync(join(output, '_headers'), `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Strict-Transport-Security: max-age=31536000\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)\n/assets/config.json\n  Cache-Control: no-store\n/index.html\n  Cache-Control: no-cache\n`);
}

export function loadProductionEnvironment(base, inherited = process.env) {
  const path = join(base, '.env.production.local');
  const local = {};
  if (existsSync(path)) for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match) local[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return { ...local, ...inherited };
}
