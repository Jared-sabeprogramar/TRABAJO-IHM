# Authentication

Public registration assigns `USER` regardless of client input. Passwords are BCrypt-hashed. Login returns a 15-minute Bearer access token and an opaque refresh token. Invalid credentials always return the same 401 message.

`POST /api/auth/refresh` rotates refresh tokens; `POST /api/auth/logout` revokes one.
