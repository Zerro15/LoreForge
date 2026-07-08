# Realtime слой

Realtime слой добавляет live updates для Play Room без изменения REST API.

REST остаётся источником истины: все изменения по-прежнему проходят через обычные HTTP endpoints. WebSocket только сообщает другим клиентам, что данные изменились.

## Архитектура

Backend:

- `src/realtime/events.ts` — типы realtime-событий и фильтрация по ролям;
- `src/realtime/rooms.ts` — in-memory campaign rooms;
- `src/realtime/websocket.ts` — WebSocket endpoint.

Frontend:

- `lib/realtime.ts` — WebSocket client, reconnect и типы событий;
- `components/RealtimeProvider.tsx` — подключение страницы кампании к realtime;
- `components/LocationPlayRoom.tsx` — обработка событий и обновление Play Room.

## Endpoint

```text
ws://localhost:3001/ws/campaign/:campaignId
```

Frontend берёт base URL из env:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## Campaign rooms

Каждая кампания имеет комнату:

```text
campaign:{campaignId}
```

Участник подключается только к комнате кампании, в которой он состоит.

## Access control

При WebSocket handshake backend проверяет:

- session cookie;
- membership в `campaign_member`;
- роль пользователя.

Если пользователь не участник кампании, соединение закрывается с кодом `1008`.

Фильтрация событий:

- `owner/gm/co_gm` получают все события;
- `player` и `viewer` получают только public token events;
- `viewer` не получает секретные сцены и gm-only tokens;
- `gm_only` и `hidden` token events не отправляются игрокам/viewer;
- `vision.updated` получают GM и только тот игрок, для которого изменилась видимость.

## События

### `scene.changed`

Отправляется после активации сцены ГМом.

```json
{
  "type": "scene.changed",
  "payload": {
    "campaignId": "1",
    "sceneId": "3",
    "locationId": "3"
  }
}
```

### `token.created`

Отправляется после создания токена.

### `token.updated`

Отправляется после изменения позиции, размера или visibility токена.

### `token.deleted`

Отправляется после soft archive токена.

### `player.moved`

Отправляется после перемещения игрока ГМом на сцену.

### `vision.updated`

Отправляется после изменения Fog of War для конкретного игрока.

```json
{
  "type": "vision.updated",
  "payload": {
    "campaignId": "1",
    "sceneId": "3",
    "userId": "4",
    "visibilityData": {}
  }
}
```

### `chat.message.created`

Отправляется после создания chat message.

### `dice.rolled`

Отправляется после броска кубика.

## Что синхронизируется сейчас

- смена активной сцены;
- создание токена;
- перемещение токена;
- удаление токена;
- перемещение игрока на сцену;
- изменение видимости карты;
- новые сообщения чата;
- броски кубиков.

Frontend при событии обновляет данные через REST. Это проще и безопаснее для текущего этапа, чем пытаться поддерживать сложный client-side cache.

## Ограничения

- Realtime rooms сейчас in-memory, без Redis/pub-sub.
- При нескольких backend-инстансах события не будут пересекать процессы.
- Нет combat.
- Нет initiative.
- Нет damage.
- Нет динамического освещения и line of sight для Fog of War.
- Нет voice/video.
- Нет сложной синхронизации canvas.
