import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Workers Builds runs the build and deploy commands in separate shells.
// Keep the existing dashboard build command safe for production.
const cloudflare = process.env.WORKERS_CI === '1';
const entry = new URL(cloudflare ? './build-production.mjs' : '../node_modules/@angular/cli/bin/ng.js', import.meta.url);
const args = cloudflare ? [] : ['build', ...process.argv.slice(2)];
const result = spawnSync(process.execPath, [fileURLToPath(entry), ...args], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
