# Verificación del sistema — 19 de octubre de 2026

Este informe recoge la revisión inicial. Los avisos de dependencias y el despliegue pendientes se resolvieron posteriormente: consulta [Seguridad y producción](security-production-2026-10-19.md). El destino Git continúa pendiente de confirmar antes de subir código.

## Resultado

Las comprobaciones funcionales de la arquitectura activa (Angular, Leaflet y Supabase) terminaron correctamente tras corregir los hallazgos indicados abajo. La aplicación local continúa en http://localhost:4200.

| Comprobación | Resultado |
| --- | --- |
| Compilación de producción Angular | Correcta; aviso de optimización CommonJS de Leaflet |
| Pruebas unitarias Angular en ChromeHeadless | 5 aprobadas |
| Suite completa Playwright | 13 aprobadas, incluida revisión automatizada de accesibilidad y OCR real |
| Validaciones de Supabase y reintentos de transporte | 8 pruebas Deno aprobadas |
| Reglas SQL de lugares y reportes | Aprobadas; datos revertidos con ROLLBACK |
| Reglas SQL de fotos privadas | Aprobadas; datos revertidos con ROLLBACK |
| Identificación y reportes reales | Aprobados; datos temporales eliminados |
| Foto JPEG, Storage privado y asociación al reporte | Aprobados; limpieza de objetos y datos temporales verificada |
| Gemini chat real | Respuesta recibida desde la función assistant |
| Gemini visión real | Identificó la figura roja de una imagen sintética |
| Mapa real | 12 teselas cargadas, selección de punto correcta, sin errores JavaScript en la comprobación |
| Secretos locales | Archivos privados ignorados por Git; sin patrón de clave Google en archivos versionados |
| Clave Gemini en compilación del frontend | No encontrada |
| Contenedor del frontend | En ejecución y saludable |

## Correcciones realizadas durante esta revisión

- La prueba de navegación buscaba el nombre antiguo «Mapa»; ahora verifica «Mapa accesible», que es la etiqueta actual.
- Se observó un fallo transitorio de transporte entre Docker y Google. Chat y visión ahora reintentan solo errores de conexión, hasta tres intentos dentro del tiempo máximo existente. Los errores HTTP del proveedor, las cuotas y las cancelaciones no se reintentan. Se añadieron pruebas de recuperación, límite de intentos y cancelación. Los reintentos reducen fallos transitorios, pero no garantizan disponibilidad de la red ni de Gemini.
- Se añadió `frontend/scripts/test-vision.mjs` para repetir voluntariamente la prueba de visión con una imagen sintética. Esta prueba utiliza la API real y consume cuota.

## Pendientes antes de publicación pública

1. `npm audit --omit=dev` informa 8 avisos en dependencias de producción: 4 altos y 4 moderados, en paquetes de Angular 17. El registro indica correcciones mediante versiones mayores. No se aplicó una migración de framework ni `npm audit fix --force` durante esta revisión. Requiere actualización y regresión antes de considerar cerrado el estado de seguridad.
2. Supabase del entorno probado es local (`127.0.0.1:54321`). Un sitio público necesita un proyecto Supabase accesible desde internet, migraciones y funciones desplegadas, sesiones anónimas, origen HTTPS permitido y secretos de Gemini configurados exclusivamente en servidor. La compilación local no debe publicarse con la configuración de Supabase local.
3. El remoto Git actual sigue siendo `Jared-sabeprogramar/Nexus-Access.git`. En la conversación se indicó `Jared-sabeprogramar/TRABAJO-IHM.git` como otro destino. Debe establecerse el proyecto correcto en la fase de subida. No se cambiaron remotos ni se subió código.
4. No se verificó ni modificó el proyecto existente de Cloudflare. La comprobación de su despliegue, configuración y vínculo con GitHub corresponde a la siguiente fase.

## Alcance y límites

Las pruebas de voz simulan reconocimiento y finalización de síntesis: verifican turnos, historial, apagado del micrófono y permisos denegados. No sustituyen pruebas con micrófono real, distintos dispositivos, lectores de pantalla ni personas usuarias. Las llamadas de ayuda no se ejecutaron; se verifican los enlaces del marcador y la confirmación por la persona. El seguimiento GPS en segundo plano y las rutas certificadas accesibles no están implementados.

El backend Java conservado por compatibilidad no forma parte del recorrido activo y no se ha certificado mediante este informe. Las pruebas no equivalen a una auditoría completa de seguridad ni a una garantía de ausencia de errores.

## Comandos principales

Desde `frontend/`:

```powershell
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
npm run test:e2e
npm run test:backend
node scripts/test-report-photo.mjs
node scripts/test-assistant.mjs
node scripts/test-vision.mjs
```

Desde la raíz:

```powershell
.\frontend\node_modules\.bin\deno.cmd test supabase/tests/validation_test.ts supabase/tests/fetch_retry_test.ts
Get-Content -Raw supabase/tests/database.sql | docker exec -i supabase_db_acces psql -U postgres -d postgres -v ON_ERROR_STOP=1
Get-Content -Raw supabase/tests/report_photos.sql | docker exec -i supabase_db_acces psql -U postgres -d postgres -v ON_ERROR_STOP=1
```
