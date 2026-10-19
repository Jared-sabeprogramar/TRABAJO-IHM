# Asistente de Acces

La ruta `/asistente` incorpora conversación por texto, reconocimiento de voz del navegador y lectura en voz alta. La navegación principal y móvil enlaza esta pantalla.

El círculo central inicia una sesión de voz por turnos: escucha una consulta, la envía al asistente, lee la respuesta y vuelve a activar el micrófono al terminar. Sus estados indican escucha, espera y respuesta. Tocar otra vez el círculo o Finalizar conversación detiene voz y micrófono. También se detiene al abrir ayuda, salir de la pantalla, denegar permisos, producirse un error o acumular tres intentos sin detectar voz. El micrófono no escucha mientras se reproduce la respuesta, para evitar captar al propio asistente. No es una conexión de audio bidireccional con Gemini Live: utiliza reconocimiento y síntesis del navegador con la API de conversación existente.

El texto completo y el formulario se encuentran en Conversación y texto; los controles de recorridos se despliegan aparte. Se respetan las preferencias de movimiento reducido del dispositivo.

## Gemini y modo básico

La función Supabase `assistant` verifica la sesión anónima y limita el uso a 60 consultas diarias por sesión. Lee exclusivamente agregados públicos de lugares. La clave no se entrega al navegador.

Configura `GEMINI_API_KEY` y `GEMINI_CHAT_MODEL` en `supabase/.env.local` para el entorno local, o como secretos de Supabase para producción. Elige un modelo disponible en tu cuenta. Reinicia `supabase functions serve --env-file supabase/.env.local` al modificar secretos. Para producción despliega también `assistant` y configura su origen permitido.

Sin ambas variables se muestra **Modo básico**: respuestas por reglas para reportes por nombre, recorridos personales y chistes. No se presenta como una conversación libre con Gemini. La función `describe-image` mantiene su configuración independiente `GEMINI_VISION_MODEL`.

Los mensajes solo viven en memoria de la pantalla, pero se envían al servidor y a Gemini cuando está configurado. Aplican las condiciones y políticas del proveedor. No se persisten conversaciones en la base de datos de Acces.

## Recorridos privados

Solo se registra GPS después de marcar el consentimiento y pulsar Iniciar recorrido. Al detener y guardar se conserva nombre, fecha, distancia aproximada y puntos GPS en el almacenamiento local del navegador. No se registra información sobre discapacidad.

Se conservan hasta 20 recorridos; los mayores de 30 días se descartan al cargar el servicio. Se detiene a los 30 minutos o 500 puntos, o al salir de la pantalla. Al salir se descarta el recorrido pendiente. La aplicación web no promete seguimiento con pantalla bloqueada ni navegación en segundo plano.

La personalización agrupa nombres de recorridos para calcular frecuencia y distancia media. Solo si se marca **Usar los nombres, frecuencias y distancias** se envían esos resúmenes con la consulta. Nunca se envían puntos GPS al asistente. La persona puede eliminar cada recorrido. En un dispositivo compartido, otras personas del mismo perfil de navegador podrían acceder al historial local.

Esto es personalización por contexto, no entrenamiento del modelo ni aprendizaje colectivo. Haber transitado una ruta y la ausencia de reportes no certifican accesibilidad. No se generan indicaciones para cruzar calles ni navegación paso a paso.

## Servicios de ayuda

El botón y las peticiones de emergencia abren un selector para Perú. Los enlaces `tel:` de Policía, Bomberos y SAMU abren el marcador del dispositivo; la persona confirma la llamada. No hay llamadas automáticas, ubicación enviada a emergencias ni confirmaciones falsas de asistencia. En computadoras se necesita una aplicación compatible.

Directorio oficial: https://www.gob.pe/547-telefonos-de-emergencia. La cobertura de SAMU depende de la región. Para otros países se indica consultar su número oficial, sin reutilizar números de Perú.

## Verificación

`node frontend/scripts/test-assistant.mjs` comprueba la función real con una sesión temporal y elimina ese usuario al terminar. Desde `frontend/`, `npx playwright test e2e/assistant.spec.ts` verifica texto, voz simulada, consentimiento, privacidad de recorridos y ayuda sin ejecutar llamadas.
