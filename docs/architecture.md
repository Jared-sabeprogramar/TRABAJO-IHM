# Arquitectura de Acces
## Elección
Arquitectura modular por funcionalidad, con presentación Angular, servicios de aplicación y adaptadores externos. El backend es **Supabase serverless**: no hay Spring Boot ni una API Node adicional en el recorrido activo.

```text
Angular
 ├─ features/reader   cámara → OCR local → síntesis de voz
 ├─ features/access   DNI escrito/dictado → identificación declarada
 ├─ features/map      lista + Google Maps + formulario de reportes
 ├─ core             configuración, Supabase, voz, dictado, historial, mapas
 └─ shared           iconos y estilos accesibles
         │ HTTPS / sesión anónima interna
Supabase
 ├─ Auth             sesión propia por dispositivo, sin login visible
 ├─ Edge Functions
 │   ├─ identify       validar DNI y obtener HMAC
 │   ├─ submit-report  validar solicitud y aplicar cuotas
 │   └─ describe-image adaptador de visión Gemini
 ├─ PostgreSQL/PostGIS
 │   ├─ private.identities / places / reports / request_limits
 │   └─ public.place_report_summary (solo agregados)
 └─ migraciones y pruebas
```

## Identificación, no autenticación por DNI
El DNI no prueba quién está usando el dispositivo. No da acceso a datos personales ni a reportes privados de otra sesión. Se crea una sesión anónima real de Supabase; no se implementa una contraseña alternativa basada en DNI. Las Edge Functions verifican el JWT mediante getUser antes de escribir. verify_jwt=false en config es intencional: la comprobación ocurre en el código y admite las claves nuevas de Supabase.

Se almacena HMAC-SHA256(DNI, secreto del servidor), no DNI en claro ni hash simple susceptible a enumerar ocho dígitos. La asociación de una sesión no puede cambiar de DNI. No se muestran nombres ni se afirman consultas a RENIEC. Perder la sesión implica un nuevo acceso; no existe recuperación de cuenta basada en conocer el número.

Limitación: un DNI declarado puede ser ajeno. Duplicados por huella reducen repetición, pero no certifican personas únicas ni eliminan suplantación. Para publicación real, definir un mecanismo de verificación opcional y una política de moderación.

## Reportes
La función transaccional agrupa puntos a 25 m, serializa escrituras concurrentes y limita cinco reportes diarios por huella. Un índice único impide duplicados de la misma huella en un lugar, incluso desde otra sesión. Un reporte caducado/resuelto se puede renovar; uno rechazado no. Se cuentan solamente los activos de los últimos 90 días. Los umbrales son reglas del producto, no una certificación de inaccesibilidad. Cero reportes significa información insuficiente.

Agrupar por 25 m es un criterio inicial: entradas distintas de edificios cercanos pueden agruparse. En una siguiente fase se puede adoptar identificación explícita de entradas/lugares. No se puede inferir seguridad de una ruta a partir del conteo.

El mapa y la lista leen los mismos agregados. Texto libre e identificadores personales no se exponen. Moderación inicial: administrador del proyecto Supabase cambia status a resolved/rejected; no se incluye aún un panel público de moderación.

## Fronteras de seguridad
Las tablas están en private, fuera del Data API, con RLS habilitado y sin políticas para clientes. Las RPC de escritura solo tienen EXECUTE para service_role. La vista pública es intencionalmente definer y expone únicamente nombre, coordenadas, conteo y fecha; nunca texto de la queja, usuario ni huella. Claves service_role, DNI_HMAC_SECRET y GEMINI_API_KEY viven únicamente en servidor.

Las funciones permiten orígenes configurados, validan tipos y tamaños, no registran DNI/tokens/imágenes y limitan peticiones por sesión/día. Antes de exposición pública habilitar CAPTCHA para sesiones anónimas, monitorizar cuotas de proveedores, retención y abuso; las cuotas por sesión no frenan a un atacante que obtiene sesiones nuevas.

## Multimedia y accesibilidad
Tesseract reconoce texto en el navegador; descarga modelos en el primer uso. Las capturas OCR no se envían al backend. El historial solo vive en memoria y desaparece al recargar; preferencias de voz sí se conservan localmente. El dictado usa SpeechRecognition cuando está disponible; el navegador puede procesarlo mediante su proveedor, por lo que no se promete dictado sin conexión. Siempre existe alternativa de teclado.

La descripción visual es explícita: el usuario solicita el envío de la imagen a Gemini por Supabase. No se almacena en Acces. Supabase no incorpora un modelo de visión general, por eso esta capacidad necesita proveedor/configuración adicional; las políticas del proveedor aplican al tratamiento de la imagen. No es una ayuda de navegación segura ni reconocimiento de identidad.

La interfaz usa azul, ámbar y violeta; símbolos, conteos y etiquetas complementan todos los colores. Controles táctiles, foco visible, enlace de salto, HTML semántico, diálogos nativos y alternativa de lista al mapa. Las pruebas automatizadas no sustituyen pruebas con personas usuarias y lectores de pantalla reales.

## Código anterior
El backend Java se conserva por compatibilidad con trabajo previo, pero no forma parte del recorrido activo ni del Compose local. La aplicación funciona con Angular y Supabase Local; no hay una base PostgreSQL independiente ni sincronización automática con el backend anterior.
