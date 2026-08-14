# JWT

JWTs are HMAC signed with `JWT_SECRET`, obtained only from environment configuration. Claims are `sub`, `email`, `roles`, `iat`, `exp` and `jti`; no passwords, hashes or refresh tokens are included. Access lifetime is configured by `JWT_ACCESS_EXPIRATION`.
