# Schema

## Core tables

- `users`: cuentas de usuario base.
- `accessibility_profiles`: necesidades de accesibilidad asociadas al usuario.
- `places`: lugares con ubicación geoespacial y score de accesibilidad.
- `accessibility_features`: catálogo normalizado de características.
- `place_accessibility_features`: relación N-N entre lugares y características.
- `reports`: reportes urbanos vinculados a usuario y opcionalmente a lugar.
- `report_images`: metadatos de archivos asociados a reportes.
- `ai_analyses`: resultados estructurados de análisis.
- `routes`: rutas guardadas por usuario con origen y destino geográficos.
- `route_obstacles`: obstáculos asociados a rutas o reportes.
- `notifications`: notificaciones para usuario.

## Constraints e índices

- `users.email` es único.
- `places.accessibility_score` y `routes.accessibility_score` están limitados entre 0 y 100.
- `reports.severity`, `reports.status`, `place_accessibility_features.status` y `route_obstacles.severity` usan listas cerradas.
- Índices GiST para `places.location`, `reports.location`, `routes.origin`, `routes.destination` y `route_obstacles.location`.
- Índices de apoyo para `reports.user_id`, `reports.status`, `reports.severity`, `reports.created_at`, `notifications.user_id` y `notifications.is_read`.

## Decisiones de borrado

- `accessibility_profiles` se elimina con su usuario.
- `reports` preserva histórico y no se borra en cascada con el usuario.
- `report_images` y `ai_analyses` se eliminan con el reporte.
- `route_obstacles` se elimina con la ruta; su vínculo a reporte es opcional.
- `notifications` se eliminan con el usuario.
