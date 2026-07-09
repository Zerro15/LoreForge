# Статус разделения frontend/backend

Дата: 9 июля 2026.

LoreForge физически подготовлен к разделению на два приватных GitHub-репозитория. Текущий monorepo сохраняется как рабочая история проекта и источник контекста. Его `origin` не менялся.

## Новые репозитории

- Frontend: https://github.com/Zerro15/LoreForge-Frontend
- Backend: https://github.com/Zerro15/LoreForge-Backend

Оба репозитория созданы как private и получили первый импорт в ветку `main`.

## Что находится во frontend

- `app/`;
- `components/`;
- `lib/`;
- `docs/frontend.md`;
- `docs/deployment-split.md`;
- Next.js, Tailwind и TypeScript конфиги;
- отдельный `package.json`;
- `.env.example` с `NEXT_PUBLIC_API_URL` и `NEXT_PUBLIC_WS_URL`.

Frontend не должен содержать hardcoded backend URL в runtime-коде. API и WebSocket адреса берутся через `lib/config.ts`.

## Что находится в backend

- `src/`;
- `scripts/`;
- `outputs/`;
- `docs/backend-api.md`;
- `docs/database-workflow.md`;
- `docs/dev-environment.md`;
- `docs/realtime.md`;
- `docs/fog-of-war.md`;
- `docs/tokens.md`;
- `docs/scenes.md`;
- `docker-compose.yml`;
- SQL schema/migration/seed;
- отдельный `package.json`;
- `.env.example` с `DATABASE_URL`, `FRONTEND_URL`, `CORS_ORIGIN` и параметрами auth/session.

Backend не должен зависеть от frontend-файлов. CORS настраивается через env.

## Локальные пути

- Frontend: `C:\Users\Bogdan\Documents\Codex\2026-06-30\LoreForge-Frontend`
- Backend: `C:\Users\Bogdan\Documents\Codex\2026-06-30\LoreForge-Backend`
- Старый monorepo: `C:\Users\Bogdan\Documents\Codex\2026-06-30\loreforge-rpg-roll20-text-npc-loreforge`

## Как запускать после split

Backend:

```powershell
cd C:\Users\Bogdan\Documents\Codex\2026-06-30\LoreForge-Backend
Copy-Item .env.example .env
pnpm install
docker compose up -d
.\scripts\db\reset-dev-db.ps1
pnpm dev
```

Frontend:

```powershell
cd C:\Users\Bogdan\Documents\Codex\2026-06-30\LoreForge-Frontend
Copy-Item .env.example .env
pnpm install
pnpm dev
```

Адреса:

- frontend: http://localhost:3000
- backend: http://localhost:3001
- backend health: http://localhost:3001/health

## Проверки split

Frontend:

```powershell
pnpm install
pnpm typecheck
pnpm build
```

Backend:

```powershell
pnpm install
pnpm typecheck
pnpm build
.\scripts\db\reset-dev-db.ps1
.\scripts\db\check-db.ps1
```

Дополнительно проверены:

- `GET /health`;
- login page frontend;
- backend login admin;
- `GET /api/campaigns`;
- `GET /api/campaigns/1/dashboard`;
- `GET /api/campaigns/1/scenes/1/tokens`;
- `GET /api/campaigns/1/scenes/1/visibility`.

## Что пока не сделано

- shared package не вынесен;
- CI для новых split-репозиториев не настраивался;
- production deploy не настраивался;
- старый monorepo не удалялся и не архивировался.

Позже можно вынести общие DTO/types в отдельный пакет `LoreForge-Shared` или workspace package.
