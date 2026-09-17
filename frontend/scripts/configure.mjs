import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const localEnvPath = new URL('../.env.local', import.meta.url);
const localConfigPath = new URL('../src/assets/config.local.json', import.meta.url);

function readDotEnv(path) {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        return separator === -1
          ? [line, '']
          : [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

const localEnv = readDotEnv(localEnvPath);
const previousConfig = existsSync(localConfigPath)
  ? JSON.parse(readFileSync(localConfigPath, 'utf8'))
  : {};

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? localEnv.GOOGLE_MAPS_API_KEY ?? '';
const googleMapsMapId = process.env.GOOGLE_MAPS_MAP_ID ?? localEnv.GOOGLE_MAPS_MAP_ID ?? '';
const supabaseUrl = process.env.SUPABASE_URL ?? localEnv.SUPABASE_URL ?? previousConfig.supabaseUrl ?? '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? localEnv.SUPABASE_ANON_KEY ?? previousConfig.supabaseAnonKey ?? '';

writeFileSync(
  localConfigPath,
  `${JSON.stringify(
    {
      ...previousConfig,
      supabaseUrl,
      supabaseAnonKey,
      googleMapsApiKey,
      googleMapsMapId,
    },
    null,
    2,
  )}\n`,
);

console.log('Configuración local de Google Maps preparada. No se muestran claves.');
