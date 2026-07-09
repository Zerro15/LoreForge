# Ручная проверка ролей LoreForge

Документ нужен для проверки этапа Roles & Access Control в dev-среде.

## Подготовка

```powershell
docker compose up -d
.\scripts\db\reset-dev-db.ps1
.\scripts\db\check-db.ps1
pnpm dev
```

Откройте frontend:

```text
http://localhost:3000/login
```

## Тестовые аккаунты

Все пароли в demo seed: `password123`.

| Роль | Email | Имя |
| --- | --- | --- |
| owner | `admin@loreforge.local` | Admin GM |
| gm | `gm@loreforge.local` | Game Master |
| co_gm | `cogm@loreforge.local` | Co GM |
| player | `player@loreforge.local` | Test Player |
| viewer | `viewer@loreforge.local` | Test Viewer |

Старые demo users `bogdan@example.com`, `dima@example.com`, `alice@example.com` оставлены для совместимости, но основные проверки ролей лучше делать аккаунтами выше.

## Проверка owner/gm/co_gm

1. Войти как `admin@loreforge.local`.
2. Открыть `/campaigns/1`.
3. Проверить, что видна кнопка **Управление локациями**.
4. Открыть менеджер локаций.
5. Проверить, что доступны создание, архивирование, загрузка картинки, активация локации, выдача и отзыв доступа.
6. Проверить, что виден блок **Запросы игроков**.
7. Открыть `/campaigns/1/npcs` и убедиться, что видны `SecretBlock`.
8. На странице NPC нажать **Добавить NPC**, заполнить имя, visibility и тег, сохранить.
9. Проверить, что новый NPC появился в списке и его можно отредактировать.
10. Нажать **Архивировать** и убедиться, что NPC исчез из списка без физического удаления.
11. Открыть `/campaigns/1/characters`.
12. Создать персонажа, добавить личные заметки и GM заметки.
13. Проверить, что персонаж редактируется и архивируется.
14. Открыть `/campaigns/1/session-log` и убедиться, что приватные заметки видны.
15. Повторить коротко для `gm@loreforge.local` и `cogm@loreforge.local`.

## Проверка player

1. Войти как `player@loreforge.local`.
2. Открыть `/campaigns/1`.
3. Проверить, что кнопки **Управление локациями** нет.
4. Проверить, что есть кнопка **Запросить переход**.
5. Проверить, что видны только доступные/public/party локации.
6. Открыть `/campaigns/1/npcs` и убедиться, что `SecretBlock` не отображается.
7. Проверить, что кнопки **Добавить NPC**, **Редактировать** и **Архивировать** не отображаются.
8. Открыть `/campaigns/1/characters`.
9. Создать своего персонажа.
10. Проверить, что своего персонажа можно редактировать.
11. Проверить, что чужого персонажа нельзя редактировать.
12. Проверить, что GM заметки не видны.
13. Открыть `/campaigns/1/chat` и сделать быстрый бросок `1d20`.
14. Проверить, что бросок появляется в чате.

## Проверка viewer

1. Войти как `viewer@loreforge.local`.
2. Открыть `/campaigns/1`.
3. Проверить, что нет **Управление локациями** и **Запросить переход**.
4. Проверить, что быстрые броски отключены с подписью `Режим просмотра: броски недоступны`.
5. Открыть `/campaigns/1/npcs`, `/campaigns/1/characters` и `/campaigns/1/session-log`.
6. Проверить, что секреты ГМа и приватные summaries не отображаются.
7. Проверить, что управление NPC и персонажами недоступно.
8. Попробовать создать NPC через API:

```powershell
curl -i -b work\viewer-cookies.txt -X POST http://localhost:3001/api/campaigns/1/npcs `
  -H "Content-Type: application/json" `
  -d '{"name":"Viewer NPC","visibility":"public"}'
```

Ожидаемый результат: `403 GM permissions required`.

9. Попробовать бросок через API:

```powershell
curl -i -b work\viewer-cookies.txt -X POST http://localhost:3001/api/campaigns/1/dice-roll `
  -H "Content-Type: application/json" `
  -d '{"formula":"1d20","visibility":"public"}'
```

Ожидаемый результат: `403 Viewer role cannot roll dice`.

## Проверка API через curl

Пример входа owner:

```powershell
curl -i -c work\owner-cookies.txt -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@loreforge.local","password":"password123"}'
```

Dashboard должен вернуть `currentMember`:

```powershell
curl -b work\owner-cookies.txt http://localhost:3001/api/campaigns/1/dashboard
```

Для owner ожидается:

```json
{
  "currentMember": {
    "role": "owner",
    "canManageLocations": true,
    "canViewGMSecrets": true,
    "canApproveGMRequests": true,
    "canRollDice": true,
    "canCreateTravelRequest": false
  }
}
```

Для viewer ожидается:

```json
{
  "currentMember": {
    "role": "viewer",
    "canManageLocations": false,
    "canViewGMSecrets": false,
    "canApproveGMRequests": false,
    "canRollDice": false,
    "canCreateTravelRequest": false
  }
}
```

## Проверка Character CRUD через curl

Войти owner:

```powershell
curl -i -c work\owner-cookies.txt -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@loreforge.local","password":"password123"}'
```

Создать персонажа:

```powershell
curl -b work\owner-cookies.txt -X POST http://localhost:3001/api/campaigns/1/characters `
  -H "Content-Type: application/json" `
  -d '{"name":"Тестовый персонаж","title":"Провидец","publicDescription":"Публичная карточка.","privateNotes":"Личные заметки.","gmNotes":"Секрет ГМа.","visibility":"party_only","ownerUserId":4}'
```

Отредактировать:

```powershell
curl -b work\owner-cookies.txt -X PATCH http://localhost:3001/api/campaigns/1/characters/1 `
  -H "Content-Type: application/json" `
  -d '{"statusText":"проверен"}'
```

Архивировать:

```powershell
curl -b work\owner-cookies.txt -X DELETE http://localhost:3001/api/campaigns/1/characters/1
```

Для `player`:

- `POST /characters` создаёт собственного персонажа;
- `PATCH` своего персонажа разрешён;
- `PATCH` чужого персонажа возвращает `403`;
- `gmNotes`, `ownerUserId`, `visibility`, `status` менять нельзя.

Для `viewer`:

- `POST`, `PATCH`, `DELETE` возвращают `403`;
- `gm_notes` и `private_notes` в ответах должны быть `null`.

## Проверка NPC CRUD через curl

Войти owner:

```powershell
curl -i -c work\owner-cookies.txt -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@loreforge.local","password":"password123"}'
```

Создать тег:

```powershell
curl -b work\owner-cookies.txt -X POST http://localhost:3001/api/campaigns/1/tags `
  -H "Content-Type: application/json" `
  -d '{"name":"Тестовый тег","color":"#8B5CF6"}'
```

Создать NPC:

```powershell
curl -b work\owner-cookies.txt -X POST http://localhost:3001/api/campaigns/1/npcs `
  -H "Content-Type: application/json" `
  -d '{"name":"Тестовый NPC","title":"Свидетель","publicDescription":"Публичная заметка.","secretDescription":"Секретная заметка.","visibility":"public","tagIds":[]}'
```

Проверить список:

```powershell
curl -b work\owner-cookies.txt http://localhost:3001/api/campaigns/1/npcs
```

Отредактировать:

```powershell
curl -b work\owner-cookies.txt -X PATCH http://localhost:3001/api/campaigns/1/npcs/1 `
  -H "Content-Type: application/json" `
  -d '{"statusText":"проверен"}'
```

Архивировать:

```powershell
curl -b work\owner-cookies.txt -X DELETE http://localhost:3001/api/campaigns/1/npcs/1
```
