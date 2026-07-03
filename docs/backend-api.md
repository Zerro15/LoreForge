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
AUTH_COOKIE_NAME=loreforge_session
AUTH_COOKIE_SECRET=dev-cookie-secret-change-me
AUTH_SESSION_DAYS=30
FRONTEND_URL=http://localhost:3000
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

### POST `/api/auth/register`

Создаёт пользователя, auth account, session и ставит httpOnly cookie.

```powershell
curl -i -X POST http://localhost:3001/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"new-user@example.com","password":"password123","displayName":"New User"}'
```

### POST `/api/auth/login`

Проверяет email/password, создаёт session и ставит httpOnly cookie.

```powershell
curl -i -c work\cookies.txt -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"bogdan@example.com","password":"password123"}'
```

### GET `/api/auth/me`

Возвращает current user по session cookie.

```powershell
curl -b work\cookies.txt http://localhost:3001/api/auth/me
```

### POST `/api/auth/logout`

Отзывает текущую session и очищает cookie.

```powershell
curl -i -b work\cookies.txt -X POST http://localhost:3001/api/auth/logout
```

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

Возвращает список кампаний текущего пользователя с агрегатами:

- активный плагин;
- количество участников;
- количество персонажей;
- количество NPC;
- количество локаций.

```powershell
curl -b work\cookies.txt http://localhost:3001/api/campaigns
```

### POST `/api/campaigns`

Создаёт кампанию для текущего пользователя. Пользователь становится `owner`, создаётся `campaign_member`, основной чат и активный `campaign_plugin`.

```powershell
curl -b work\cookies.txt -X POST http://localhost:3001/api/campaigns `
  -H "Content-Type: application/json" `
  -d '{"title":"Новая кампания","description":"","visibility":"private","maxPlayers":6,"worldPluginId":1}'
```

### GET `/api/campaigns/:campaignId/dashboard`

Возвращает данные для dashboard кампании:

- `currentMember` с ролью и флагами доступа;
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
curl -b work\cookies.txt http://localhost:3001/api/campaigns/1/dashboard
```

`currentMember`:

```json
{
  "role": "owner",
  "canManageCampaign": true,
  "canManageLocations": true,
  "canViewGMSecrets": true,
  "canApproveGMRequests": true,
  "canUploadLocationImages": true,
  "canRollDice": true,
  "canCreateTravelRequest": false
}
```

### GET `/api/campaigns/:campaignId/characters`

Возвращает персонажей кампании:

- базовые поля;
- владелец-пользователь;
- stats;
- resources;
- abilities.

`secret_description` и `notes` возвращаются только для `owner/gm/co_gm`.

```powershell
curl -b work\cookies.txt http://localhost:3001/api/campaigns/1/characters
```

### GET `/api/campaigns/:campaignId/npcs`

Возвращает NPC кампании:

- публичные описания;
- секретные поля ГМа;
- visibility;
- tags.

Секретные поля `secret_description`, `gm_secrets`, `campaign_journal` возвращаются только для `owner/gm/co_gm`. Для `player/viewer` они приходят как `null`, а `gm_only` NPC не попадают в ответ.

```powershell
curl -b work\cookies.txt http://localhost:3001/api/campaigns/1/npcs
```

### GET `/api/campaigns/:campaignId/locations`

Возвращает локации с учётом текущего пользователя:

- `parent_location_id`;
- публичные описания;
- секретные описания для ГМа;
- `visibility`;
- `status`;
- `is_event_location`;
- `cover_attachment`;
- `is_active_location`;
- `has_player_access`.

ГМ, `owner` и `co_gm` видят все локации. Игрок видит `public`, `party_only` и локации из `player_location_access`. `viewer` видит только `public`.

```powershell
curl -b work\cookies.txt http://localhost:3001/api/campaigns/1/locations
```

### GET `/api/campaigns/:campaignId/locations/:locationId`

Возвращает одну локацию, картинку, parent и children.

```powershell
curl -b work\cookies.txt http://localhost:3001/api/campaigns/1/locations/2
```

### POST `/api/campaigns/:campaignId/locations`

Создаёт локацию. Только для ГМа.

```powershell
curl -b work\cookies.txt -X POST http://localhost:3001/api/campaigns/1/locations `
  -H "Content-Type: application/json" `
  -d '{"name":"Таверна у моста","publicDescription":"Шумное место у канала.","secretDescription":"Хозяин работает на культ.","visibility":"hidden_until_discovered","isEventLocation":false}'
```

### PATCH `/api/campaigns/:campaignId/locations/:locationId`

Редактирует название, описания, visibility, status и event flags. Только для ГМа.

```powershell
curl -b work\cookies.txt -X PATCH http://localhost:3001/api/campaigns/1/locations/5 `
  -H "Content-Type: application/json" `
  -d '{"visibility":"party_only","isEventLocation":true}'
```

### DELETE `/api/campaigns/:campaignId/locations/:locationId`

Архивирует локацию через `status = archived`, физически не удаляет. Только для ГМа.

```powershell
curl -b work\cookies.txt -X DELETE http://localhost:3001/api/campaigns/1/locations/5
```

### POST `/api/campaigns/:campaignId/locations/:locationId/activate`

Меняет активную локацию игровой комнаты. Только для ГМа.

```powershell
curl -b work\cookies.txt -X POST http://localhost:3001/api/campaigns/1/locations/2/activate
```

### POST `/api/campaigns/:campaignId/locations/:locationId/image`

Загружает картинку локации. Только для ГМа.

Ограничения:

- `image/png`;
- `image/jpeg`;
- `image/webp`;
- до 10 MB;
- файлы сохраняются локально в `uploads/`.

```powershell
curl -b work\cookies.txt -X POST http://localhost:3001/api/campaigns/1/locations/2/image `
  -F "file=@C:\path\to\location.jpg"
```

### POST `/api/campaigns/:campaignId/locations/:locationId/grant-access`

Открывает локацию игроку. Только для ГМа.

```powershell
curl -b work\cookies.txt -X POST http://localhost:3001/api/campaigns/1/locations/3/grant-access `
  -H "Content-Type: application/json" `
  -d '{"userId":2,"reason":"Персонаж вошёл в район"}'
```

### POST `/api/campaigns/:campaignId/locations/:locationId/revoke-access`

Скрывает локацию от игрока через `revoked_at`. Только для ГМа.

```powershell
curl -b work\cookies.txt -X POST http://localhost:3001/api/campaigns/1/locations/3/revoke-access `
  -H "Content-Type: application/json" `
  -d '{"userId":2,"reason":"Локация больше недоступна"}'
```

### POST `/api/campaigns/:campaignId/location-travel-requests`

Игрок отправляет запрос перехода в локацию.

Доступно только роли `player`.

```powershell
curl -b work\cookies.txt -X POST http://localhost:3001/api/campaigns/1/location-travel-requests `
  -H "Content-Type: application/json" `
  -d '{"targetLocationId":2,"characterId":1,"message":"Хочу пойти в Восточный район"}'
```

### GET `/api/campaigns/:campaignId/gm-requests`

ГМ получает pending-запросы игроков.

Доступно только `owner/gm/co_gm`.

```powershell
curl -b work\cookies.txt http://localhost:3001/api/campaigns/1/gm-requests
```

### POST `/api/campaigns/:campaignId/gm-requests/:requestId/approve`

ГМ одобряет переход. Игрок получает доступ, персонаж переходит в локацию, событие пишется в чат и журнал.

```powershell
curl -b work\cookies.txt -X POST http://localhost:3001/api/campaigns/1/gm-requests/1/approve `
  -H "Content-Type: application/json" `
  -d '{"response":"Вы добираетесь до места без происшествий."}'
```

### POST `/api/campaigns/:campaignId/gm-requests/:requestId/reject`

ГМ отклоняет переход с причиной.

```powershell
curl -b work\cookies.txt -X POST http://localhost:3001/api/campaigns/1/gm-requests/1/reject `
  -H "Content-Type: application/json" `
  -d '{"response":"Дорогу перекрыла полиция."}'
```

### GET `/api/campaigns/:campaignId/chat`

Возвращает последние 50 сообщений:

- message type;
- content;
- sender;
- visibility;
- dice roll, если сообщение связано с броском.

`gm_only` сообщения не возвращаются игрокам и viewer. `player_only` возвращаются отправителю или получателю из `metadata_json.targetUserId`.

```powershell
curl -b work\cookies.txt http://localhost:3001/api/campaigns/1/chat
```

### POST `/api/campaigns/:campaignId/dice-roll`

Создает `dice_roll`, создает связанное сообщение чата `message_type = dice` и возвращает результат.

Доступно `owner/gm/co_gm/player`. Роль `viewer` получает `403`.

Поддерживаются простые формулы:

- `1d20`;
- `1d20+3`;
- `2d6+1`;
- `1d100`.

```powershell
curl -b work\cookies.txt -X POST http://localhost:3001/api/campaigns/1/dice-roll `
  -H "Content-Type: application/json" `
  -d '{"userId":2,"characterId":1,"formula":"1d20+3","visibility":"public"}'
```

### GET `/api/campaigns/:campaignId/session-log`

Возвращает журналы сессий и события.

`summary_private` и `gm_only` события возвращаются только `owner/gm/co_gm`.

```powershell
curl -b work\cookies.txt http://localhost:3001/api/campaigns/1/session-log
```

### GET `/api/world-plugins`

Возвращает плагины миров и их features.

```powershell
curl http://localhost:3001/api/world-plugins
```

## Следующие шаги

- Расширить access/visibility service на будущие CRUD endpoints.
- Добавить полноценные permissions для `gm_note`, когда появится отдельный API.
- Добавить нормальные DTO для frontend-слоя, когда появятся экраны.
- Добавить тесты API после стабилизации контрактов.
