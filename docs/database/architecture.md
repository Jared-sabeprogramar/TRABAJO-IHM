# Database Architecture

NEXUS ACCESS usa PostgreSQL como fuente de verdad relacional y PostGIS para los atributos espaciales. El esquema se versiona con Flyway y no depende de generación automática de tablas por Hibernate.

## Principios

- UUID como clave primaria para evitar secuencias previsibles y facilitar integración distribuida.
- `created_at` y `updated_at` con `TIMESTAMPTZ` para mantener consistencia temporal.
- `PostGIS` para coordenadas y consultas espaciales reales.
- `JSONB` para resultados flexibles de IA sin perder capacidad de consulta estructurada.
- Imágenes fuera de PostgreSQL; solo metadatos y claves de almacenamiento.

## Estrategia de migraciones

- `V1__create_initial_schema.sql` crea extensiones, tablas, constraints e índices.
- `V2__seed_accessibility_features.sql` inserta el catálogo base sin duplicar registros.
- Flyway es la única fuente de verdad del esquema.

## Relaciones

- `users` 1-1 `accessibility_profiles`
- `users` 1-N `reports`
- `users` 1-N `routes`
- `users` 1-N `notifications`
- `places` N-N `accessibility_features`
- `reports` 1-N `report_images`
- `reports` 1-N `ai_analyses`
- `reports` 1-N `route_obstacles`
- `routes` 1-N `route_obstacles`
