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
8. Открыть `/campaigns/1/session-log` и убедиться, что приватные заметки видны.
9. Повторить коротко для `gm@loreforge.local` и `cogm@loreforge.local`.

## Проверка player

1. Войти как `player@loreforge.local`.
2. Открыть `/campaigns/1`.
3. Проверить, что кнопки **Управление локациями** нет.
4. Проверить, что есть кнопка **Запросить переход**.
5. Проверить, что видны только доступные/public/party локации.
6. Открыть `/campaigns/1/npcs` и убедиться, что `SecretBlock` не отображается.
7. Открыть `/campaigns/1/chat` и сделать быстрый бросок `1d20`.
8. Проверить, что бросок появляется в чате.

## Проверка viewer

1. Войти как `viewer@loreforge.local`.
2. Открыть `/campaigns/1`.
3. Проверить, что нет **Управление локациями** и **Запросить переход**.
4. Проверить, что быстрые броски отключены с подписью `Режим просмотра: броски недоступны`.
5. Открыть `/campaigns/1/npcs` и `/campaigns/1/session-log`.
6. Проверить, что секреты ГМа и приватные summaries не отображаются.
7. Попробовать бросок через API:

```powershell
curl -i -b work\viewer-cookies.txt -X POST http://localhost:3001/api/campaigns/1/dice-roll `
  -H "Content-Type: application/json" `
  -d '{"userId":1,"formula":"1d20","visibility":"public"}'
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

