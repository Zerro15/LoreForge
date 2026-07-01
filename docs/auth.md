# Auth LoreForge

Auth в LoreForge на текущем этапе реализован как базовая email/password авторизация с server-side sessions.

## Что реализовано

- регистрация;
- login;
- logout;
- current user;
- password hashing через `bcryptjs`;
- httpOnly session cookie;
- хранение session token hash в `auth_session`;
- frontend login/register flow.

## Demo credentials

После `.\scripts\db\reset-dev-db.ps1` доступны demo users:

```text
bogdan@example.com / password123
dima@example.com / password123
alice@example.com / password123
```

## Как работает регистрация

Frontend отправляет `POST /api/auth/register`.

Backend:

1. Валидирует email, password и displayName.
2. Проверяет, что email свободен.
3. Хеширует пароль через `bcryptjs`.
4. Создаёт `app_user`.
5. Создаёт `user_profile`.
6. Создаёт `auth_account`.
7. Создаёт `auth_session`.
8. Ставит httpOnly cookie.
9. Возвращает current user без `password_hash`.

## Как работает login

Frontend отправляет `POST /api/auth/login`.

Backend:

1. Находит `auth_account` по email.
2. Проверяет `password_hash`.
3. Создаёт новую запись в `auth_session`.
4. Ставит httpOnly cookie.
5. Возвращает current user.

## Session cookie

Cookie:

- имя из `AUTH_COOKIE_NAME`;
- `httpOnly: true`;
- `sameSite: lax`;
- `secure: false` в development;
- `path: /`;
- срок жизни из `AUTH_SESSION_DAYS`.

В cookie хранится случайный session token. В базе хранится только SHA-256 hash токена.

## Current user

`GET /api/auth/me` возвращает:

```json
{
  "user_id": "1",
  "email": "bogdan@example.com",
  "display_name": "Bogdan",
  "avatar_url": null
}
```

Если сессии нет или она истекла, API возвращает `401`.

## Logout

`POST /api/auth/logout` помечает session как revoked и очищает cookie.

## Env

```text
AUTH_COOKIE_NAME=loreforge_session
AUTH_COOKIE_SECRET=dev-cookie-secret-change-me
AUTH_SESSION_DAYS=30
FRONTEND_URL=http://localhost:3000
```

## Пока не реализовано

- OAuth;
- Google login;
- Discord login;
- email verification;
- password reset;
- roles/access control;
- SecretBlock permissions.
