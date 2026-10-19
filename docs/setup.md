# Configuración y publicación

## Desarrollo local

Supabase se ejecuta localmente con Docker. Después de iniciarlo, ejecuta el script que coloca la URL y la clave pública anon de Supabase en `frontend/src/assets/config.local.json`; ese archivo está ignorado por Git.

```powershell
.\frontend\node_modules\.bin\supabase.cmd start -x studio,imgproxy,realtime,logflare,vector,supavisor,mailpit
.\frontend\node_modules\.bin\supabase.cmd db push --local
.\scripts\configure-local.ps1
.\frontend\node_modules\.bin\supabase.cmd functions serve --env-file supabase/.env.local
```

## Mapa sin clave ni facturación

El mapa utiliza Leaflet y las teselas de OpenStreetMap. No necesita GOOGLE_MAPS_API_KEY ni una cuenta de facturación. Conserva zoom, desplazamiento, selección de puntos, marcadores arrastrables, ubicación GPS y reportes de Supabase.

Se requiere conexión para cargar las teselas. Mantener visible la atribución a OpenStreetMap y respetar https://operations.osmfoundation.org/policies/tiles/: sin descargas masivas ni precarga para uso sin conexión. El servicio público no garantiza disponibilidad.

La descripción de imágenes sigue necesitando la configuración independiente de Gemini en Supabase.

## Supabase Cloud

1. Crear proyecto Supabase y habilitar Anonymous Sign-ins.
2. Ejecutar `supabase login`, `supabase link --project-ref TU_REFERENCIA` y `supabase db push`.
3. Guardar `DNI_HMAC_SECRET`, `ALLOWED_ORIGINS` y cualquier clave de visión como secretos de Supabase.
4. Desplegar `identify`, `submit-report` y `describe-image`.
5. Configurar la URL y anon/publishable key pública de Supabase en el archivo local generado, nunca una `service_role`.

## Archivos locales que no se suben

No subas `.env`, `.env.local`, `.env.development.local`, `environment.local.ts`, `secrets.*`, `src/assets/config.local.json` ni `supabase/.env.local`. Sí se mantiene `*.env.example` con placeholders sin secretos.

## Producción y móvil

Los reportes pueden adjuntar una foto JPEG de hasta 512 KB. El navegador reduce la imagen a 1280 píxeles y la vuelve a codificar antes de enviarla, sin conservar los metadatos del archivo original. La Edge Function guarda la evidencia en el bucket privado `report-photos`; no se publica su URL ni se permiten cargas directas desde el cliente. La migración `202609170001_report_photos.sql` crea el bucket y vincula la evidencia al reporte. Storage debe estar activo en el entorno local.

Al abrir un nuevo reporte después de acceder con DNI se solicitan cámara trasera y ubicación. Siempre hay alternativas para adjuntar un archivo y escribir coordenadas. La persona confirma el envío después de revisar el tipo de barrera. El mapa muestra las categorías declaradas y actualiza sus agregados cada 30 segundos mientras la página está visible. La foto no clasifica automáticamente la barrera ni se muestra públicamente.

Si una petición se interrumpe entre cargar una foto y registrar el reporte, puede quedar un objeto privado sin referencia. Revisar estos objetos antes de eliminarlos; no eliminar fotos referenciadas por `private.reports.photo_path`.

Verificaciones de fotos: desde `frontend`, ejecutar `node scripts/test-report-photo.mjs` con Supabase y las funciones locales activos; crea una sesión y una foto sintéticas y elimina solo sus propios recursos. `npm run test:e2e` prueba permisos, captura, confirmación, cierre de cámara y advertencias con dispositivos simulados. `supabase/tests/report_photos.sql` comprueba la asociación y permisos dentro de una transacción que revierte sus cambios.

Cámara, geolocalización y el mapa requieren HTTPS en un dispositivo real. En un teléfono, `localhost` es el teléfono; configura un dominio HTTPS, el origen permitido de Supabase y el HTTP referrer de Google Cloud antes de probarlo.
