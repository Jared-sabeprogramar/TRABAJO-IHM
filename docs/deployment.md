# Despliegue de Acces

Frontend público: https://trabajo-ihm.rondoypereziker.workers.dev/
Backend: https://hfnrmchqihiujdlobeqx.supabase.co

Angular utiliza Supabase y Leaflet/OpenStreetMap. El backend Java anterior no forma parte de este despliegue.

## Supabase

Desde la raíz, inicia sesión con `frontend/node_modules/.bin/supabase.cmd login`.
Guarda Gemini en `supabase/.env.local`, siguiendo `supabase/.env.example`.
Ejecuta en PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-production-secrets.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-supabase.ps1 -DryRun
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-supabase.ps1
```

El script aplica migraciones sin reiniciar la base, conserva el secreto de identidades existente y despliega `identify`, `submit-report`, `assistant` y `describe-image`. No elimina otras funciones. Los archivos de secretos están excluidos de Git. El límite global de IA predeterminado es 200 solicitudes al día; puede ajustarse mediante `AI_GLOBAL_DAILY_LIMIT` en los secretos del servidor.

Las sesiones anónimas deben estar habilitadas en Supabase Auth. Para futuros proveedores de acceso con redirección, configura también la URL pública en Auth → URL Configuration. La aplicación actual utiliza sesiones anónimas sin redirección. No publiques `supabase/config.toml` local directamente sobre los ajustes de producción.

## Cloudflare

En Workers → trabajo-ihm → Settings → Builds, con la raíz del repositorio como directorio:

- Build command: `cd frontend && npm ci && npm run build:production`.
- Deploy command: `npx wrangler deploy`.
- Variables de **compilación**: `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` (o `SUPABASE_ANON_KEY` pública).
- Selecciona la rama `codex/proyecto-seguro-20261019` para publicar esta versión.

El archivo `wrangler.jsonc` de la raíz permite ejecutar el despliegue desde ese directorio. Se conserva el de `frontend/` para el despliegue local desde esa carpeta. El comando anterior `npm run configure && npm run build` también detecta Workers Builds y genera ahora la configuración de producción validada. Los `.env` locales no se suben a GitHub ni aparecen automáticamente en Cloudflare.

`wrangler versions upload` sube una versión; para activar directamente el despliegue utiliza `wrangler deploy`.

Usa Node 22.12 o superior de la rama 22, o Node 24. Dentro de `frontend/`, copia `.env.production.example` a `.env.production.local` y guarda la URL y la clave **Publishable**. Nunca uses una clave secret o service_role en el frontend.

```powershell
npm ci
npm run test:production
npm test -- --watch=false
npm run build:production
npx --yes wrangler@4.151.2 login
npx --yes wrangler@4.151.2 deploy
```

`wrangler.jsonc` apunta al Worker existente `trabajo-ihm` y sirve `dist/frontend/browser` con rutas de Angular. `build:production` valida la configuración, excluye `config.local.json` y genera cabeceras de seguridad. No sustituyas este comando por `npm run build` al publicar.

Desde la raíz, comprueba la web con `node scripts/verify-production.mjs`. La prueba opcional `node scripts/test-production-api.mjs`, ejecutada desde `frontend/`, requiere sesión CLI de Supabase: realiza dos consultas reales a Gemini con datos sintéticos y elimina su usuario temporal. No imprime claves.

El reconocimiento y la reproducción de voz dependen del navegador y de sus permisos. El mapa no requiere facturación de Google; conserva la atribución y respeta la [política de teselas de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).

## Desarrollo local

Sigue [setup.md](setup.md), genera la configuración con `scripts/configure-local.ps1` y ejecuta `docker compose up -d --build frontend`. Abre http://localhost:4200. Docker sirve una compilación estática: reconstruye después de modificar código.
