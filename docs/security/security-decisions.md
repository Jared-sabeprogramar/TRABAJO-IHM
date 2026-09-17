# Security decisions

Refresh values are cryptographically random and only their SHA-256 hash is persisted. Rotation revokes the used value. Flyway V3 creates this store before Hibernate schema validation.

Production follow-ups: rate limiting, MFA, OAuth2/OIDC, managed secrets, audit trails and abuse detection. Do not log tokens or passwords.
