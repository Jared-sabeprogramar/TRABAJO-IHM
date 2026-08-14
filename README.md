# NEXUS ACCESS

Plataforma inicial de accesibilidad urbana para personas con discapacidad.

## Alcance de esta fase

Esta fase solo prepara la arquitectura base. No incluye autenticación, JWT, IA, mapas, reportes ni lógica de negocio.

## Estructura

- `frontend/`: Angular 17+ con SCSS.
- `backend/`: Spring Boot con Java 21 y Maven.
- `database/`: scripts de inicialización de PostgreSQL y PostGIS.
- `docs/`: documentación del proyecto.
- `.github/`: espacio para automatización y configuración futura.

## Requisitos

- Docker y Docker Compose.
- Node.js para desarrollo local del frontend.
- Java 21 y Maven para desarrollo local del backend.

## Configuración

1. Copia `.env.example` a `.env`.
2. Ajusta las credenciales locales si es necesario.
3. No guardes credenciales reales en Git.

## Ejecución con Docker

```bash
docker compose up -d
```

Servicios:

- Frontend: http://localhost:4200
- Backend: http://localhost:8080/api/health
- PostgreSQL: localhost:5432

## Verificaciones esperadas

- PostgreSQL inicia correctamente.
- PostGIS está instalado y habilitado.
- Spring Boot expone `GET /api/health`.
- Angular arranca y puede llegar al backend mediante `/api`.

## Desarrollo local

Frontend:

```bash
cd frontend
npm install
npm start
```

Backend:

```bash
cd backend
./mvnw spring-boot:run
```

En Windows también puedes usar `mvnw.cmd`.