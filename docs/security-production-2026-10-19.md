# Seguridad y producción — 19 de octubre de 2026

## Cambios completados

- Actualización de Angular a 21.2.25 y herramientas de compilación a 21.2.27; retirada de dependencias anteriores sin uso. Vitest sustituye a Karma.
- `npm audit` y `npm audit --omit=dev`: cero vulnerabilidades conocidas al realizar la revisión. Esto no equivale a una auditoría completa del sistema.
- Compilación pública que rechaza claves secret/service_role y servidores locales, excluye la configuración local y publica únicamente URL y clave pública.
- Cabeceras CSP, HSTS, protección frente a inclusión en marcos, restricciones de permisos y caché de configuración deshabilitada. El OCR y el mapa se probaron bajo la CSP generada.
- Gemini conserva sus claves en Supabase. Límite compartido predeterminado de 200 solicitudes de IA por día, además de las cuotas individuales; no es una garantía de coste cero ni sustituye las cuotas del proveedor.
- Migraciones sincronizadas con los historiales existentes y desplegadas sin reiniciar la base. Se conservó el secreto de identidades remoto y las funciones anteriores ajenas al despliegue.

## Publicación

Web: https://trabajo-ihm.rondoypereziker.workers.dev/

Supabase: https://hfnrmchqihiujdlobeqx.supabase.co

Versión Cloudflare publicada: `563afac0-67a5-4833-bd05-f83de20f2141`.
Versión anterior de referencia para revertir el frontend: `fc9a6ae9-901f-4323-af61-6d6cf40afc00`. Revertir el frontend no revierte migraciones de Supabase.

Se desplegaron `identify`, `submit-report`, `assistant` y `describe-image`. La autenticación anónima está operativa y Gemini informa modo configurado. Se recibieron respuestas reales de conversación y descripción de una imagen sintética roja desde producción; el usuario temporal se eliminó.

## Verificación

- Compilación de producción, 5 pruebas unitarias Angular, 4 pruebas de configuración pública y 13 pruebas Playwright aprobadas.
- Ocho pruebas Deno de validación y reintentos aprobadas; prueba SQL local de cuota global aprobada.
- Prueba de navegador de la compilación con CSP: mapa y OCR reales sin violaciones.
- Rutas públicas `/`, `/mapa`, `/asistente`, `/recientes`, cabecera CSP y conexión pública a Supabase verificadas. Hubo un tiempo de espera transitorio al consultar `/`; la repetición fue correcta.
- Chrome contra la web publicada: lector visible, teselas reales de OpenStreetMap cargadas y asistente con Gemini configurado; sin errores JavaScript ni violaciones CSP. Se reutilizó la sesión temporal y se eliminó al finalizar.

La voz se probó con reconocimiento y síntesis simulados; falta comprobar micrófonos y voces en los dispositivos reales de las personas usuarias. Las llamadas se verificaron mediante enlaces y confirmación, sin llamar a emergencias. Las rutas privadas continúan en el dispositivo y no certifican accesibilidad.

No se hizo commit ni push. El remoto Git encontrado es `Jared-sabeprogramar/Nexus-Access.git`; no se ha certificado una conexión automática entre Cloudflare y `Jared-sabeprogramar/TRABAJO-IHM.git`. La publicación descrita se realizó mediante Wrangler sobre el Worker existente.

Instrucciones reproducibles: [deployment.md](deployment.md).
