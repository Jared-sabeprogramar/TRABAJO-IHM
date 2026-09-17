# Configuración y publicación

## Desarrollo local

Supabase se ejecuta localmente con Docker. Después de iniciarlo, ejecuta el script que coloca la URL y la clave pública anon de Supabase en `frontend/src/assets/config.local.json`; ese archivo está ignorado por Git.

```powershell
.\frontend\node_modules\.bin\supabase.cmd start -x studio,imgproxy,realtime,logflare,vector,supavisor,mailpit
.\frontend\node_modules\.bin\supabase.cmd db push --local
.\scripts\configure-local.ps1
.\frontend\node_modules\.bin\supabase.cmd functions serve --env-file supabase/.env.local
```

La clave de Google Maps es una clave de navegador: Google Maps JavaScript API la enviará en la petición de carga del mapa. No se intenta ocultarla ni se envía a Supabase.

1. Copia `frontend/.env.example` a `frontend/.env.local`.
2. Define solo tu valor local:

   ```dotenv
   GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
   ```

3. Inicia Angular desde `frontend`:

   ```powershell
   npm start
   ```

`npm start` genera `src/assets/config.local.json` a partir de `.env.local` y después ejecuta `ng serve`. El archivo generado no se versiona ni se incluye en la imagen Docker. Si no existe la variable, la web conserva la lista de reportes de Supabase y muestra un mensaje claro; no intenta cargar Google Maps con una clave vacía.

Para cambiar la clave, edita `.env.local` y reinicia `npm start`. No añadas claves a `environment.ts`, `environments.ts`, `config.json`, archivos HTML ni documentación.

## Restricciones obligatorias en Google Cloud

Configura la browser key fuera del repositorio:

- **Application restriction:** `Websites / HTTP referrers`
- **Desarrollo:** `http://localhost:4200/*`
- **Producción:** `https://DOMINIO_REAL/*`
- **API restrictions:** permitir únicamente `Maps JavaScript API`

El código carga únicamente Maps JavaScript API con la biblioteca `marker`. No utiliza Places API, Directions API, Geocoding API ni ninguna llamada REST de Google Maps desde Angular; no habilites APIs adicionales.

Para una implementación productiva, usa un Map ID propio en `.env.local` como `GOOGLE_MAPS_MAP_ID=TU_MAP_ID`. `DEMO_MAP_ID` se usa solo mientras no haya uno configurado.

## Separación de claves

`GOOGLE_MAPS_API_KEY` es exclusivamente la clave de navegador y debe restringirse por HTTP referrer. Cualquier futura integración REST de Google Maps debe ejecutarse en una Edge Function de Supabase y usar una clave de servidor distinta, almacenada como secreto de Supabase. Nunca reutilices la browser key como clave de servidor y nunca guardes ninguna de ellas en PostgreSQL.

Actualmente no existe una llamada REST de Google Maps desde Angular ni una clave de Google Maps en Supabase. La Edge Function de descripción de imágenes usa una clave independiente de Gemini si se configura; no es una API de Google Maps.

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
