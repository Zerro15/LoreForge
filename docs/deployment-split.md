# Будущее разделение frontend/backend

## Текущее состояние

- LoreForge пока monorepo.
- Frontend и backend уже разделены логически.
- Frontend API URL задаётся через `NEXT_PUBLIC_API_URL`.
- Backend CORS задаётся через `FRONTEND_URL` / `CORS_ORIGIN`.
- Текущий monorepo остаётся рабочим источником разработки до отдельного решения о переносе кода.

## Будущие репозитории

- https://github.com/Zerro15/LoreForge-Frontend
- https://github.com/Zerro15/LoreForge-Backend

Оба репозитория зарезервированы заранее. Код туда не переносится автоматически.

## Frontend repo

Будущий `LoreForge-Frontend` будет содержать:

- `app/`;
- `components/`;
- `lib/`;
- `public/`;
- Next.js config;
- Tailwind config;
- frontend `package.json`;
- frontend-документацию.

Env для frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Правила:

- frontend не должен содержать hardcoded backend URL;
- runtime API-вызовы должны идти через `lib/config.ts` и `API_BASE_URL`;
- UI labels остаются на русском через `lib/ui-labels.ts`;
- shared DTO/types пока остаются в monorepo до отдельного решения.

## Backend repo

Будущий `LoreForge-Backend` будет содержать:

- `src/`;
- `scripts/`;
- `outputs/` с migration/seed SQL;
- `docker-compose.yml`;
- backend `package.json`;
- backend-документацию.

Env для backend:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:55432/loreforge_dev
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

Правила:

- backend не должен зависеть от frontend-файлов;
- backend не должен содержать UI labels;
- CORS должен настраиваться через env, а не через захардкоженный production URL;
- SQL migrations и seed должны оставаться воспроизводимыми через PostgreSQL 16.

## Shared layer

Пока shared DTO/types остаются в monorepo:

- frontend-типы лежат в `lib/types.ts`;
- backend DTO лежат в `src/dto/`;
- API contract документируется в `docs/backend-api.md`.

Позже можно вынести shared package:

- `@loreforge/shared`;
- общие DTO;
- общие enum-типы;
- Zod-схемы API-контрактов.

## План миграции

1. Зафиксировать стабильный monorepo checkpoint.
2. Проверить, что frontend использует только `NEXT_PUBLIC_API_URL`.
3. Проверить, что backend CORS читает `FRONTEND_URL` / `CORS_ORIGIN`.
4. Создать отдельные package manifests для frontend и backend.
5. Скопировать frontend-код в `LoreForge-Frontend`.
6. Скопировать backend-код, SQL, Docker scripts и docs в `LoreForge-Backend`.
7. Настроить CI отдельно для каждого repo.
8. Проверить локальный запуск двух repo рядом:
   - backend на `http://localhost:3001`;
   - frontend на `http://localhost:3000`.
9. Только после успешной проверки принять решение, оставлять monorepo архивным или продолжать как основной источник.

## Что пока не делаем

- не переносим production-код автоматически;
- не меняем origin текущего репозитория;
- не удаляем текущий `Zerro15/LoreForge`;
- не меняем API contracts ради split;
- не выносим shared package до отдельного решения.
