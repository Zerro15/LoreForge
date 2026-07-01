# Frontend LoreForge

Frontend сделан на Next.js, React, TypeScript и Tailwind CSS. Интерфейс использует dark SaaS стиль: тёмный фон, мягкий фиолетовый glow, glassmorphism-карточки и минималистичные dashboard-компоненты.

## Переменные окружения

Создайте локальный `.env` или задайте переменную в PowerShell:

```powershell
$env:NEXT_PUBLIC_API_URL="http://localhost:3001"
```

По умолчанию frontend тоже использует:

```text
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEMO_USER_ID=1
```

## Порядок запуска

```powershell
docker compose up -d
.\scripts\db\reset-dev-db.ps1
pnpm install
pnpm dev
```

После запуска:

```text
Frontend: http://localhost:3000
Backend API: http://localhost:3001
```

## Страницы

- `/` - редирект на `/login`;
- `/login` - вход по email/password;
- `/register` - регистрация по email/password;
- `/campaigns` - список кампаний;
- `/campaigns/[campaignId]` - dashboard кампании;
- `/campaigns/[campaignId]/characters` - персонажи, характеристики, ресурсы и способности;
- `/campaigns/[campaignId]/npcs` - NPC-досье и секреты ГМа;
- `/campaigns/[campaignId]/locations` - локации и вложенность;
- `/campaigns/[campaignId]/chat` - последние сообщения и броски;
- `/campaigns/[campaignId]/session-log` - журнал сессий и события.

## Проверки

```powershell
pnpm typecheck
pnpm build
```

Для ручной проверки демо-кампании после seed:

```text
http://localhost:3000/login
http://localhost:3000/register
http://localhost:3000/campaigns
http://localhost:3000/campaigns/1
http://localhost:3000/campaigns/1/characters
http://localhost:3000/campaigns/1/npcs
http://localhost:3000/campaigns/1/locations
http://localhost:3000/campaigns/1/chat
http://localhost:3000/campaigns/1/session-log
```

## Если API недоступен

Frontend показывает аккуратное error/empty состояние. Проверьте:

- запущен ли backend: `pnpm dev:api`;
- применены ли миграции и seed: `.\scripts\db\reset-dev-db.ps1`;
- совпадает ли `NEXT_PUBLIC_API_URL` с адресом backend;
- если порт PostgreSQL 5432 занят локальной службой, используйте `POSTGRES_PORT=55432` в `.env`.

## Ограничения текущего шага

- OAuth-кнопки Discord и Google декоративные;
- роли и access control пока не реализованы;
- регистрации, оплаты, marketplace, WebSocket, карты и drag-and-drop пока нет;
- секретные поля ГМа отображаются для демо и помечены как зона будущего access control.
