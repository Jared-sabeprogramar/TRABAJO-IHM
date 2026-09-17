# Despliegue

## Requisitos

- Un servidor Linux con Docker Engine y Docker Compose.
- Un proyecto Supabase PostgreSQL con la extensión PostGIS activada.
- Un dominio y un proxy inverso con TLS (por ejemplo, Caddy o Nginx) delante del puerto del frontend.

## Configuración

1. Copia `.env.example` como `.env` en la raíz del proyecto.
2. Completa `SUPABASE_DB_URL`, `SUPABASE_DB_USERNAME`, `SUPABASE_DB_PASSWORD` y un `JWT_SECRET` aleatorio de al menos 32 caracteres.
3. Establece `FRONTEND_PORT=80` y `CORS_ALLOWED_ORIGINS=https://tu-dominio.example`.
4. Activa PostGIS desde el panel SQL de Supabase con `CREATE EXTENSION IF NOT EXISTS postgis;`.

## Ejecución

```bash
docker compose pull
docker compose up -d --build
docker compose ps
curl -fsS http://localhost:8080/api/health
```

El frontend queda disponible en el puerto definido por `FRONTEND_PORT` y reenvía `/api` al backend dentro de la red privada de Docker. Las migraciones de Flyway se ejecutan al iniciar el backend.

## Antes de publicar

- Configura copias de seguridad y restricciones de red en Supabase.
- No subas `.env` ni secretos a Git.
- Configura HTTPS y renueva certificados automáticamente en el proxy inverso.
- Revisa `docker compose logs --tail=100 backend` y `docker compose logs --tail=100 frontend` tras cada publicación.
