# Backend API LoreForge

Минимальный backend API читает демо-данные LoreForge из PostgreSQL и готовит ответы для будущего dashboard UI.

Технологии:

- TypeScript;
- Node.js;
- Fastify;
- PostgreSQL через `pg`;
- Zod;
- dotenv;
- pnpm.

ORM пока не используется. На первом шаге прямой SQL проще проверять и сопоставлять с текущей схемой.

## Env

Создай `.env` на основе `.env.example`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/loreforge_dev
PORT=3001
```

Если локальная служба PostgreSQL занимает `5432`, есть два варианта:

- остановить службу `postgresql-x64-16` из PowerShell от администратора;
- задать локально `POSTGRES_PORT=55432` и указать API другой порт БД:

```env
POSTGRES_PORT=55432
DATABASE_URL=postgres://postgres:postgres@localhost:55432/loreforge_dev
```

## Порядок запуска

```powershell
docker compose up -d
.\scripts\db\reset-dev-db.ps1
pnpm install
pnpm dev
```

API по умолчанию запускается на:

```text
http://localhost:3001
```

## Команды

```powershell
pnpm dev
pnpm typecheck
pnpm build
pnpm start
```

## Endpoint-ы

### GET `/health`

Проверка сервиса.

```powershell
curl http://localhost:3001/health
```

Ответ:

```json
{
  "ok": true,
  "service": "loreforge-api"
}
```

### GET `/api/campaigns`

Возвращает список кампаний с агрегатами:

- активный плагин;
- количество участников;
- количество персонажей;
- количество NPC;
- количество локаций.

```powershell
curl http://localhost:3001/api/campaigns
```

### GET `/api/campaigns/:campaignId/dashboard`

Возвращает данные для dashboard кампании:

- кампания;
- активный плагин;
- участники;
- счетчики;
- персонажи;
- NPC;
- локации;
- последние сообщения;
- последние броски;
- последние события журнала;
- расследования.

```powershell
curl http://localhost:3001/api/campaigns/1/dashboard
```

### GET `/api/campaigns/:campaignId/characters`

Возвращает персонажей кампании:

- базовые поля;
- владелец-пользователь;
- stats;
- resources;
- abilities.

```powershell
curl http://localhost:3001/api/campaigns/1/characters
```

### GET `/api/campaigns/:campaignId/npcs`

Возвращает NPC кампании:

- публичные описания;
- секретные поля ГМа;
- visibility;
- tags.

Важно: access control пока не реализован. Секретные поля возвращаются для удобства демо и будущего dashboard. Перед production нужно добавить access/visibility service.

```powershell
curl http://localhost:3001/api/campaigns/1/npcs
```

### GET `/api/campaigns/:campaignId/locations`

Возвращает локации:

- `parent_location_id`;
- публичные описания;
- секретные описания;
- visibility.

```powershell
curl http://localhost:3001/api/campaigns/1/locations
```

### GET `/api/campaigns/:campaignId/chat`

Возвращает последние 50 сообщений:

- message type;
- content;
- sender;
- visibility;
- dice roll, если сообщение связано с броском.

```powershell
curl http://localhost:3001/api/campaigns/1/chat
```

### POST `/api/campaigns/:campaignId/dice-roll`

Создает `dice_roll`, создает связанное сообщение чата `message_type = dice` и возвращает результат.

Поддерживаются простые формулы:

- `1d20`;
- `1d20+3`;
- `2d6+1`;
- `1d100`.

```powershell
curl -X POST http://localhost:3001/api/campaigns/1/dice-roll `
  -H "Content-Type: application/json" `
  -d '{"userId":2,"characterId":1,"formula":"1d20+3","visibility":"public"}'
```

### GET `/api/campaigns/:campaignId/session-log`

Возвращает журналы сессий и события.

```powershell
curl http://localhost:3001/api/campaigns/1/session-log
```

### GET `/api/world-plugins`

Возвращает плагины миров и их features.

```powershell
curl http://localhost:3001/api/world-plugins
```

## TODO

- Добавить access/visibility service.
- Добавить auth.
- Добавить нормальные DTO для frontend-слоя, когда появятся экраны.
- Добавить тесты API после стабилизации контрактов.
