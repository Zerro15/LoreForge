# LoreForge

LoreForge — это Campaign OS для мастеров настольных RPG: платформа, которая объединяет кампании, персонажей, NPC, локации, чат, кубики, журнал, секреты ГМа, расследования и подключаемые плагины миров.

```text
LoreForge = Roll20 + Notion для ГМа + плагины миров
```

## Суть продукта

LoreForge помогает мастеру не просто играть онлайн, а управлять живым миром кампании: лором, правилами, персонажами, событиями, секретами и структурой мира.

В демо показана кампания `Туман над Баклундом` с плагином мира `Mistbound`, персонажами, NPC-досье, локациями, чатом, бросками кубиков и журналом сессий.

## Проблема

Мастеру RPG обычно приходится держать кампанию в разных инструментах:

- виртуальный стол для игры;
- заметки в Notion/Google Docs;
- отдельные таблицы персонажей;
- чат в Discord;
- секреты и расследования в личных файлах;
- правила и кастомные механики в разрозненных документах.

Из-за этого теряется контекст: NPC, локации, события, броски, секреты ГМа и правила мира живут отдельно друг от друга.

## Решение

LoreForge собирает кампанию в единую систему:

- кампания как база знаний;
- персонажи, NPC и локации как связанные сущности;
- чат и броски кубиков внутри кампании;
- журнал сессий и timeline событий;
- секретные блоки для мастера;
- теги, расследования и связи;
- world plugins для правил и авторских миров.

## Ключевые фичи

- Dark SaaS frontend в стиле dashboard-продукта.
- Email/password auth with httpOnly session cookies.
- Onboarding для первого запуска нового ГМа.
- Roles & Access Control для `owner/gm/co_gm/player/viewer`.
- Список кампаний и dashboard кампании.
- Demo-кампания `Туман над Баклундом`.
- Активный world plugin `Mistbound`.
- Play Room: активная сцена, локации, чат, кубики и запросы переходов.
- Базовый VTT-слой: токены персонажей, NPC и маркеры поверх карты сцены.
- Realtime WebSocket слой для live updates в Play Room.
- Карточки персонажей с путём, последовательностью, духовностью, рассудком, усвоением и риском потери контроля.
- NPC dossier cards с публичным описанием, тегами и `SecretBlock`.
- Иерархия локаций, сцены внутри локаций, загрузка карт и выдача доступа игрокам.
- Player travel requests и approve/reject flow для ГМа.
- Чат кампании.
- Быстрые броски `d20`, `d100`, `2d6`.
- Dice-сообщения в чате.
- Timeline-like журнал сессий.
- PostgreSQL schema, migration и demo seed.
- Fastify backend API без ORM.
- GitHub Actions CI проверяет `pnpm typecheck` и `pnpm build` на push/pull request.

## Чем отличается от Roll20

Roll20 в первую очередь закрывает:

- карту;
- токены;
- кубики;
- лист персонажа.

LoreForge делает шире:

- кампания как структурированная база знаний;
- NPC как досье;
- локации как дерево мира;
- секреты ГМа как отдельный слой;
- расследования и события как часть кампании;
- плагины миров и правил;
- кастомные механики поверх общего ядра.

Идея: Roll20 помогает играть за столом, LoreForge помогает вести всю кампанию.

## Стек технологий

- TypeScript
- Node.js
- Fastify
- PostgreSQL 16
- `pg`
- Zod
- Next.js
- React
- Tailwind CSS
- pnpm
- Docker Compose

## Архитектура

```text
PostgreSQL
  ├─ dnd_campaign_schema.sql
  ├─ outputs/loreforge_schema_upgrade.sql
  └─ outputs/seed_loreforge_demo.sql

Fastify API
  ├─ campaigns
  ├─ characters
  ├─ NPC
  ├─ locations
  ├─ chat
  ├─ dice rolls
  ├─ session log
  └─ world plugins

Next.js frontend
  ├─ login
  ├─ campaigns
  ├─ campaign dashboard
  ├─ characters
  ├─ NPC
  ├─ locations
  ├─ chat
  └─ session log
```

Подробно: [docs/architecture.md](docs/architecture.md).

## Быстрый запуск

Требования:

- Docker Desktop;
- Node.js LTS;
- pnpm;
- PostgreSQL client/psql желательно для ручной проверки.

```powershell
pnpm install
docker compose up -d
.\scripts\db\reset-dev-db.ps1
.\scripts\db\check-db.ps1
pnpm dev
```

Адреса:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- Demo login: `http://localhost:3000/login`

Если локальный PostgreSQL занимает порт `5432`, используйте локальный `.env`:

```text
POSTGRES_PORT=55432
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/loreforge_dev
PORT=3001
```

Demo credentials после применения seed:

```text
admin@loreforge.local / password123      # owner
gm@loreforge.local / password123         # gm
cogm@loreforge.local / password123       # co_gm
player@loreforge.local / password123     # player
viewer@loreforge.local / password123     # viewer
bogdan@example.com / password123
dima@example.com / password123
alice@example.com / password123
```

## Demo flow

Текущий demo flow для проверки продукта описан в [docs/demo-flow.md](docs/demo-flow.md).

Коротко:

1. Открыть `/login`.
2. Нажать `Войти`.
3. Открыть кампанию `Туман над Баклундом`.
4. Показать dashboard и плагин `Mistbound`.
5. Показать персонажей.
6. Показать NPC и `SecretBlock`.
7. Открыть чат и сделать бросок `d20`.
8. Показать журнал сессии.
9. Завершить формулой: `LoreForge = Campaign OS`.

## Страницы frontend

- `/`
- `/login`
- `/register`
- `/campaigns`
- `/campaigns/1`
- `/campaigns/1/characters`
- `/campaigns/1/npcs`
- `/campaigns/1/locations`
- `/campaigns/1/chat`
- `/campaigns/1/session-log`

## API endpoints

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/campaigns`
- `GET /api/campaigns/:campaignId/dashboard`
- `GET /api/campaigns/:campaignId/characters`
- `GET /api/campaigns/:campaignId/npcs`
- `GET /api/campaigns/:campaignId/npcs/:npcId`
- `POST /api/campaigns/:campaignId/npcs`
- `PATCH /api/campaigns/:campaignId/npcs/:npcId`
- `DELETE /api/campaigns/:campaignId/npcs/:npcId`
- `GET /api/campaigns/:campaignId/tags`
- `POST /api/campaigns/:campaignId/tags`
- `GET /api/campaigns/:campaignId/locations`
- `GET /api/campaigns/:campaignId/scenes`
- `POST /api/campaigns/:campaignId/locations/:locationId/scenes`
- `POST /api/campaigns/:campaignId/scenes/:sceneId/activate`
- `POST /api/campaigns/:campaignId/scenes/:sceneId/image`
- `POST /api/campaigns/:campaignId/scenes/:sceneId/move-player`
- `GET /api/campaigns/:campaignId/scenes/:sceneId/tokens`
- `POST /api/campaigns/:campaignId/scenes/:sceneId/tokens`
- `PATCH /api/campaigns/:campaignId/tokens/:tokenId`
- `DELETE /api/campaigns/:campaignId/tokens/:tokenId`
- `WS /ws/campaign/:campaignId`
- `GET /api/campaigns/:campaignId/chat`
- `POST /api/campaigns/:campaignId/dice-roll`
- `GET /api/campaigns/:campaignId/session-log`
- `GET /api/world-plugins`

Документация API: [docs/backend-api.md](docs/backend-api.md).

## Документация

- [docs/development-plan.md](docs/development-plan.md) — план развития продукта.
- [docs/auth.md](docs/auth.md) — регистрация, login, sessions и cookies.
- [docs/demo-flow.md](docs/demo-flow.md) — проверочный demo flow.
- [docs/demo-checklist.md](docs/demo-checklist.md) — чеклист локальной проверки.
- [docs/pitch.md](docs/pitch.md) — pitch на 30 секунд, 1 минуту и 3 минуты.
- [docs/architecture.md](docs/architecture.md) — архитектура.
- [docs/roadmap.md](docs/roadmap.md) — roadmap.
- [docs/frontend.md](docs/frontend.md) — frontend.
- [docs/backend-api.md](docs/backend-api.md) — backend API.
- [docs/tokens.md](docs/tokens.md) — токены карты и базовый VTT-слой.
- [docs/realtime.md](docs/realtime.md) — WebSocket realtime слой.
- [docs/deployment-split.md](docs/deployment-split.md) — план будущего split frontend/backend.
- [docs/access-control.md](docs/access-control.md) — роли и права доступа.
- [docs/manual-role-test.md](docs/manual-role-test.md) — ручная проверка ролей.
- [docs/database-workflow.md](docs/database-workflow.md) — workflow БД.
- [docs/dev-environment.md](docs/dev-environment.md) — локальное окружение.

## Будущий split frontend/backend

Текущий репозиторий пока остаётся monorepo и продолжает быть основным местом разработки.

Отдельные репозитории уже зарезервированы:

- [LoreForge-Frontend](https://github.com/Zerro15/LoreForge-Frontend);
- [LoreForge-Backend](https://github.com/Zerro15/LoreForge-Backend).

Код туда не переносится без отдельного решения. Frontend и backend уже связаны через env-конфиг: `NEXT_PUBLIC_API_URL` на frontend и `FRONTEND_URL` / `CORS_ORIGIN` на backend.

Подробнее: [docs/deployment-split.md](docs/deployment-split.md).

## Статус проекта

MVP prototype / early product development.

Проект уже можно запустить локально и пройти end-to-end flow: база данных, seed, backend API, frontend dashboard, auth, базовые роли, visibility, dice roll, NPC CRUD и Character CRUD работают вместе. Следующий фокус — дальнейшее расширение CRUD и углубление permissions.

## Что сделано

- PostgreSQL 16 Docker Compose.
- Базовая схема `dnd_campaign_schema.sql`.
- Upgrade migration `outputs/loreforge_schema_upgrade.sql`.
- Demo seed `outputs/seed_loreforge_demo.sql`.
- PowerShell scripts для reset/check dev-БД.
- Fastify backend API.
- Email/password auth with httpOnly session cookies.
- Базовый Roles & Access Control для `owner/gm/co_gm/player/viewer`.
- Маскирование GM secrets для player/viewer.
- CRUD персонажей с `private_notes`, `gm_notes`, soft archive и audit log.
- CRUD NPC с тегами, visibility, soft archive и audit log.
- Next.js frontend.
- Dark SaaS UI polish.
- Demo flow на 2-3 минуты.
- Документация для запуска и развития продукта.

## План развития

Подробный план: [docs/development-plan.md](docs/development-plan.md).

- CRUD кампаний и локаций.
- Расширение персонажей: аватары, лист персонажа, прогрессия.
- Более детальные права доступа для `SecretBlock` и `gm_note`.
- WebSocket chat.
- Campaign editor.
- Plugin constructor.
- Map/tabletop mode.
- Marketplace/plugin library.
- Deploy.

## AI agents

Правила работы для Codex и других AI-агентов описаны в [AGENTS.md](AGENTS.md).
