import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadProductionEnvironment, validateProductionConfig, writeProductionArtifacts } from './production.mjs';

const base = fileURLToPath(new URL('../', import.meta.url));
try {
  // Fail before building if the public backend settings are missing or unsafe.
  const config = validateProductionConfig(loadProductionEnvironment(base));
  const build = spawnSync(process.execPath, [join(base, 'node_modules/@angular/cli/bin/ng.js'), 'build', '--configuration', 'production'], { cwd: base, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status || 1);
  writeProductionArtifacts(resolve(base, 'dist/frontend/browser'), config);
  console.log('Producción preparada: configuración pública validada y cabeceras de seguridad generadas.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
