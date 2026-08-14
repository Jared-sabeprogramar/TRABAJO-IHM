# PostGIS

## Uso

El esquema usa `GEOGRAPHY(Point, 4326)` para:

- `places.location`
- `reports.location`
- `routes.origin`
- `routes.destination`
- `route_obstacles.location`

## SRID

- Todas las coordenadas usan `SRID 4326`.
- Esto permite trabajar con coordenadas geográficas compatibles con consultas de distancia y proximidad.

## Extensión

- `CREATE EXTENSION IF NOT EXISTS postgis;`
- La validación incluye `SELECT PostGIS_Version();`

## Consultas espaciales previstas

- `ST_Distance` para distancia entre puntos.
- `ST_DWithin` para lugares dentro de un radio.
- `GiST` para acelerar búsquedas espaciales.
