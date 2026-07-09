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
- `/onboarding` - первый запуск нового ГМа: создание кампании, выбор plugin, стартовая локация;
- `/campaigns` - список кампаний;
- `/campaigns/[campaignId]` - игровая комната кампании: активная локация, чат, кубики и запросы переходов;
- `/campaigns/[campaignId]/characters` - персонажи, CRUD, характеристики, ресурсы и способности;
- `/campaigns/[campaignId]/npcs` - NPC-досье, теги, visibility и редактор для ГМа;
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

## Игровая комната, локации и сцены

Главный экран кампании `/campaigns/[campaignId]` работает как первый Roll20-like Play Room без canvas:

- слева остаётся навигация кампании;
- в центре показывается активная сцена как большая VTT-карта;
- справа показываются чат и быстрые броски;
- ГМ видит кнопку **Управление сценами**;
- игрок видит кнопку **Запросить переход**.

Модель:

- `Location` — контейнер мира: город, район, аптека, часовня;
- `Scene` — конкретная игровая карта внутри локации: торговый зал, склад, тайная комната;
- у кампании есть активная локация и активная сцена;
- у участника кампании хранится текущая локация и текущая сцена.
- поверх карты сцены отображается слой `TokenLayer` с объектами карты.

ГМ может:

- создать локацию;
- загрузить картинку локации;
- активировать локацию;
- архивировать локацию;
- пометить локацию как event location;
- создать сцену внутри локации;
- загрузить карту сцены;
- переключить активную сцену в центре Play Room;
- переместить игрока на конкретную сцену;
- добавить marker-токен на карту;
- перетащить токен мышью;
- изменить видимость токена;
- архивировать токен;
- открыть или скрыть доступ конкретному игроку;
- одобрить или отклонить запрос перехода.

Игрок может:

- видеть только доступные ему локации;
- видеть текущую сцену и доступные сцены;
- видеть public-токены карты;
- отправить запрос перехода ГМу;
- увидеть результат через обновление данных, чат и журнал.

Viewer видит только public-сцены и public-токены, не получает GM-инструменты, секреты и управление NPC.

Подробнее: `docs/location-workflow.md`.
Слой токенов описан в `docs/tokens.md`.

## Roles & Access UI

Frontend получает права текущего участника из `GET /api/campaigns/:campaignId/dashboard` в поле `currentMember`.

UI учитывает флаги:

- `canManageLocations` — показывает Location Manager, загрузку картинки, активацию локации, grant/revoke access;
- `canApproveGMRequests` — показывает панель запросов игроков;
- `canViewGMSecrets` — позволяет отображать `SecretBlock`, если backend вернул секретные поля;
- `canRollDice` — включает быстрые броски;
- `canCreateTravelRequest` — показывает кнопку **Запросить переход**.

Для `viewer` быстрые броски отключаются и показывается подпись `Режим просмотра: броски недоступны`.
`DiceQuickRolls` больше не использует demo user id: actor определяется backend-ом по текущей session.

Ручная проверка ролей описана в `docs/manual-role-test.md`.

## Character CRUD UI

Страница `/campaigns/[campaignId]/characters` использует `CharacterManager`.

Поведение по ролям:

- `owner/gm/co_gm` видят всех персонажей, кнопку **Создать персонажа**, редактирование, архивирование, `GM заметки`;
- `player` видит доступных персонажей, может создать своего персонажа, редактировать и архивировать только своего, видит только свои личные заметки;
- `viewer` видит только открытые карточки без кнопок управления, `GM заметки` и личные заметки скрыты.

Поля формы:

- имя;
- титул / роль;
- публичное описание;
- личные заметки;
- GM заметки для ГМа;
- состояние в игре;
- владелец для ГМа;
- видимость и статус для ГМа.

UI labels для `visibility` и `status` берутся из `lib/ui-labels.ts`. Raw enum значения в интерфейсе выводить нельзя.

## UI labels

Backend enums и API contracts остаются на английском, но пользовательский интерфейс показывает русские подписи через `lib/ui-labels.ts`.

Правило: в UI нельзя выводить raw enum значения напрямую.

Примеры:

- `hidden_until_discovered` → `Скрыт до обнаружения`;
- `gm_only` → `Только ГМу`;
- `party_only` → `Для группы`;
- `co_gm` → `Со-ГМ`;
- `pending` → `Ожидает решения`;
- `archived` → `Архивный`.

Если появляется новый enum в backend, для него нужно добавить русскую подпись в `lib/ui-labels.ts` и использовать `getLabel(...)` в presentation layer.

## NPC CRUD UI

Страница `/campaigns/[campaignId]/npcs` использует client-компонент `NPCManager`.

Что делает экран:

- загружает `dashboard`, `npcs`, `tags` и `locations`;
- определяет права по `currentMember`;
- для `owner/gm/co_gm` показывает кнопку **Добавить NPC**, действия **Редактировать** и **Архивировать**;
- для `player/viewer` скрывает управляющие кнопки и показывает только разрешённые backend-ом NPC;
- не отображает `SecretBlock`, если backend не вернул секретные поля;
- позволяет выбрать visibility, статус, теги и локацию в форме NPC.

Ограничение текущего шага: `locationId` есть в форме и API body как подготовка к будущей привязке NPC к сценам, но прямое поле в таблице `npc` пока не хранится.

## Onboarding

После `register` и `login` frontend запрашивает `GET /api/campaigns`.

- если у пользователя нет кампаний, он попадает на `/onboarding`;
- если кампании есть, он попадает на `/campaigns`.

Onboarding состоит из пяти шагов:

1. выбор роли;
2. настройка кампании;
3. выбор plugin мира;
4. стартовая локация;
5. экран приглашений-заглушка.

Подробнее: `docs/onboarding.md`.

## Если API недоступен

Frontend показывает аккуратное error/empty состояние. Проверьте:

- запущен ли backend: `pnpm dev:api`;
- применены ли миграции и seed: `.\scripts\db\reset-dev-db.ps1`;
- совпадает ли `NEXT_PUBLIC_API_URL` с адресом backend;
- если порт PostgreSQL 5432 занят локальной службой, используйте `POSTGRES_PORT=55432` в `.env`.

## Ограничения текущего шага

- OAuth-кнопки Discord и Google декоративные;
- базовый roles/access control реализован на backend и учитывается в UI;
- visibility для локаций учитывает роль пользователя и `player_location_access`;
- регистрации, оплаты, marketplace, WebSocket, карты и drag-and-drop пока нет;
- `SecretBlock` отображается только если backend вернул секретные поля.
