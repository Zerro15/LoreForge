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
- Демо-логин без настоящей авторизации.
- Список кампаний и dashboard кампании.
- Demo-кампания `Туман над Баклундом`.
- Активный world plugin `Mistbound`.
- Карточки персонажей с путём, последовательностью, духовностью, рассудком, усвоением и риском потери контроля.
- NPC dossier cards с публичным описанием, тегами и `SecretBlock`.
- Иерархия локаций.
- Чат кампании.
- Быстрые броски `d20`, `d100`, `2d6`.
- Dice-сообщения в чате.
- Timeline-like журнал сессий.
- PostgreSQL schema, migration и demo seed.
- Fastify backend API без ORM.

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

## Demo flow

Основной сценарий показа описан в [docs/demo-flow.md](docs/demo-flow.md).

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
- `/campaigns`
- `/campaigns/1`
- `/campaigns/1/characters`
- `/campaigns/1/npcs`
- `/campaigns/1/locations`
- `/campaigns/1/chat`
- `/campaigns/1/session-log`

## API endpoints

- `GET /health`
- `GET /api/campaigns`
- `GET /api/campaigns/:campaignId/dashboard`
- `GET /api/campaigns/:campaignId/characters`
- `GET /api/campaigns/:campaignId/npcs`
- `GET /api/campaigns/:campaignId/locations`
- `GET /api/campaigns/:campaignId/chat`
- `POST /api/campaigns/:campaignId/dice-roll`
- `GET /api/campaigns/:campaignId/session-log`
- `GET /api/world-plugins`

Документация API: [docs/backend-api.md](docs/backend-api.md).

## Документация

- [docs/demo-flow.md](docs/demo-flow.md) — сценарий демо.
- [docs/demo-checklist.md](docs/demo-checklist.md) — чеклист перед показом.
- [docs/pitch.md](docs/pitch.md) — pitch на 30 секунд, 1 минуту и 3 минуты.
- [docs/architecture.md](docs/architecture.md) — архитектура.
- [docs/roadmap.md](docs/roadmap.md) — roadmap.
- [docs/frontend.md](docs/frontend.md) — frontend.
- [docs/backend-api.md](docs/backend-api.md) — backend API.
- [docs/database-workflow.md](docs/database-workflow.md) — workflow БД.
- [docs/dev-environment.md](docs/dev-environment.md) — локальное окружение.

## Статус проекта

Hackathon demo / MVP prototype.

Проект уже можно запустить локально и показать end-to-end demo flow: база данных, seed, backend API, frontend dashboard и dice roll работают вместе.

## Что сделано

- PostgreSQL 16 Docker Compose.
- Базовая схема `dnd_campaign_schema.sql`.
- Upgrade migration `outputs/loreforge_schema_upgrade.sql`.
- Demo seed `outputs/seed_loreforge_demo.sql`.
- PowerShell scripts для reset/check dev-БД.
- Fastify backend API.
- Next.js frontend.
- Dark SaaS UI polish.
- Demo flow на 2-3 минуты.
- Документация для запуска и презентации.

## Что планируется дальше

- Auth.
- Roles and access control.
- Реальные права доступа для `SecretBlock`.
- WebSocket chat.
- Campaign editor.
- Plugin constructor.
- Map/tabletop mode.
- Marketplace/plugin library.
- Deploy.

## AI agents

Правила работы для Codex и других AI-агентов описаны в [AGENTS.md](AGENTS.md).
