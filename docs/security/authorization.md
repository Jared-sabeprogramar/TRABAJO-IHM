# Authorization

All API routes except health, auth and development Swagger require a Bearer token. Users may read places; ADMIN and MUNICIPALITY may create/update them; only ADMIN may delete. User and accessibility-profile endpoints require ownership of the authenticated UUID.

CORS origins come from `CORS_ALLOWED_ORIGINS`; wildcard origins are not used.
