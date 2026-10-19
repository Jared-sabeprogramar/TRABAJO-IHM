# Acces

Aplicación de accesibilidad urbana: lector visual y de voz, identificación declarada por DNI, mapa comunitario de barreras y reportes con evidencia fotográfica.

## Arquitectura activa

- `frontend/`: Angular, OCR local, síntesis de voz, dictado y mapa.
- `supabase/`: Auth anónimo, PostGIS, Edge Functions, migraciones y pruebas.
- `backend/`: servicio Java conservado por compatibilidad; no se inicia en el recorrido activo.

## Ejecutar localmente

1. Instala dependencias: `cd frontend; npm ci`.
2. Inicia Supabase Local: `npx supabase start`.
3. Aplica migraciones: `npx supabase db push --local`.
4. Genera la configuración local: `powershell -ExecutionPolicy Bypass -File scripts/configure-local.ps1`.
5. Inicia las funciones: `npx supabase functions serve --env-file supabase/.env.local`.
6. Inicia la interfaz: `docker compose up -d --build`.

Abre http://localhost:4200. Las instrucciones detalladas y la gestión de claves están en [docs/setup.md](docs/setup.md).

## Verificación

La pantalla `/asistente` ofrece voz, texto, recorridos privados y servicios de ayuda. Consulta la configuración de Gemini y los límites del modo básico en [docs/assistant.md](docs/assistant.md).

Los lugares se registran automáticamente al enviar el primer reporte con nombre y coordenadas. Los reportes a menos de 25 metros se asocian al lugar existente; los más distantes crean otro. El mapa y la lista consultan los agregados guardados en Supabase y se actualizan tras el envío y cada 30 segundos. Las pruebas de base de datos revierten sus datos temporales.

Desde `frontend/`:

```bash
npm test -- --watch=false
npm run test:backend
npm run test:e2e
node scripts/test-report-photo.mjs
```
