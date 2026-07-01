# Архитектура LoreForge

LoreForge построен как web-приложение с отдельными слоями базы данных, backend API и frontend dashboard.

```text
Database -> Backend API -> Frontend
```

## Общая схема

```text
PostgreSQL 16
  |
  | SQL schema, upgrade migration, demo seed
  v
Fastify API
  |
  | JSON endpoints
  v
Next.js frontend
```

## PostgreSQL

PostgreSQL хранит доменную модель кампании:

- пользователи;
- кампании;
- участники кампании;
- персонажи;
- NPC;
- локации;
- чат;
- броски кубиков;
- журнал сессий;
- секреты ГМа;
- теги;
- расследования;
- плагины миров.

Для локальной разработки база поднимается через Docker Compose:

```powershell
docker compose up -d
```

## Migrations

SQL применяется в таком порядке:

1. `dnd_campaign_schema.sql`
2. `outputs/loreforge_schema_upgrade.sql`
3. `outputs/seed_loreforge_demo.sql`

Скрипты:

- `scripts/db/reset-dev-db.ps1` — пересоздаёт dev-БД и применяет SQL.
- `scripts/db/apply-migrations.ps1` — применяет схемы к уже запущенной БД.
- `scripts/db/check-db.ps1` — проверяет подключение, таблицы и ключевые сущности.

## Seed

Demo seed создаёт кампанию:

```text
Туман над Баклундом
```

В seed есть:

- пользователи;
- персонажи;
- NPC;
- предметы;
- локации;
- чат;
- броски;
- события сессии;
- плагин `Mistbound`.

## Backend API

Backend написан на Fastify и TypeScript.

Используется:

- `pg` для PostgreSQL;
- Zod для валидации;
- dotenv для env;
- `@fastify/cors` для frontend demo flow.

API отдаёт данные для dashboard и demo-страниц:

- кампании;
- dashboard кампании;
- персонажи;
- NPC;
- локации;
- чат;
- dice roll;
- журнал сессий;
- world plugins.

## Frontend

Frontend написан на Next.js, React, TypeScript и Tailwind CSS.

Страницы:

- login;
- campaigns;
- campaign dashboard;
- characters;
- NPC;
- locations;
- chat;
- session log.

Frontend читает API через `NEXT_PUBLIC_API_URL`.

## Связь database -> API -> frontend

1. PostgreSQL хранит структурированные данные кампании.
2. Fastify API делает SQL-запросы, агрегирует данные и отдаёт JSON.
3. Next.js frontend отображает JSON как dashboard, карточки, timeline и chat UI.

Пример:

```text
chat_message + dice_roll
  -> GET /api/campaigns/:campaignId/chat
  -> /campaigns/:campaignId/chat
```

## Почему важна плагинная архитектура

RPG-системы сильно отличаются друг от друга. В одной игре есть классы и уровни, в другой — пути, ритуалы, стресс, расследования или риск потери контроля.

Если зашить одну систему правил в ядро, LoreForge станет инструментом только для одного типа кампаний. Поэтому ядро хранит универсальные сущности кампании, а world plugins добавляют конкретную механику мира.

## Домены

### Campaign Core

Кампании, участники, роли, статус, базовые настройки.

### Characters

Игровые персонажи, владельцы, характеристики, ресурсы, способности.

### NPC

Публичные описания, секреты ГМа, статусы, теги.

### Locations

Локации и вложенность мира: город, район, здание, сцена.

### Chat

Сообщения кампании, типы сообщений, видимость.

### Dice

Броски кубиков, формулы, результат, связь с chat message.

### Session Journal

Журналы сессий, summary, timeline событий.

### GM Notes

Приватные заметки мастера и секретные данные.

### Tags

Метки для NPC, локаций и других сущностей.

### Investigations

Расследования, clues, связи и статус.

### World Plugins

Плагины миров и правил: Mistbound, DnD-like, cyberpunk, авторские системы.
