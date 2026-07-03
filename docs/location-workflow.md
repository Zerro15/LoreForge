# Workflow локаций и переходов

Этот документ описывает первый рабочий слой механики локаций в LoreForge.

## Что уже реализовано

- ГМ видит все локации кампании.
- Игрок видит публичные локации и локации, к которым ему выдан доступ.
- ГМ может создать локацию.
- ГМ может загрузить картинку локации с локального ПК.
- ГМ может сделать локацию активной в игровой комнате.
- ГМ может архивировать локацию вместо физического удаления.
- ГМ может пометить локацию как event location.
- ГМ может открыть или скрыть доступ к локации конкретному игроку.
- Игрок может отправить запрос перехода.
- ГМ может одобрить или отклонить запрос с комментарием.
- При одобрении игрок получает доступ к целевой локации.
- При одобрении обновляется `character.current_location_id`, если запрос был отправлен от персонажа.
- В чат и журнал попадают системные события.

## Как ГМ создаёт локацию

1. Войти под пользователем ГМа.
2. Открыть `/campaigns/1`.
3. Нажать **Управление локациями**.
4. Заполнить:
   - название;
   - публичное описание;
   - секретное описание;
   - видимость;
   - родительскую локацию;
   - флаг event location, если нужно.
5. Нажать **Добавить локацию**.

Backend endpoint:

```http
POST /api/campaigns/:campaignId/locations
```

## Как загрузить картинку

1. В модалке управления локациями выбрать нужную локацию.
2. Нажать **Картинка**.
3. Выбрать файл `png`, `jpg`, `jpeg` или `webp`.

Ограничения:

- максимальный размер: 10 MB;
- файлы сохраняются локально в `uploads/campaigns/:campaignId/locations/`;
- `uploads/` не коммитится в git;
- metadata пишется в `attachment`;
- `location.cover_attachment_id` связывает картинку с локацией.

Backend endpoint:

```http
POST /api/campaigns/:campaignId/locations/:locationId/image
Content-Type: multipart/form-data
```

## Как сменить активную локацию

ГМ может нажать **Активировать** в списке локаций или кликнуть локацию в списке игровой комнаты.

Backend endpoint:

```http
POST /api/campaigns/:campaignId/locations/:locationId/activate
```

Активная локация хранится в `campaign.active_location_id`.

## Как открыть доступ игроку

1. Открыть **Управление локациями**.
2. В блоке нужной локации выбрать игрока.
3. Указать причину.
4. Нажать **Открыть**.

Backend endpoint:

```http
POST /api/campaigns/:campaignId/locations/:locationId/grant-access
```

Доступ хранится в `player_location_access`.

## Как скрыть локацию обратно

1. В блоке нужной локации выбрать игрока.
2. Указать причину.
3. Нажать **Скрыть**.

Backend endpoint:

```http
POST /api/campaigns/:campaignId/locations/:locationId/revoke-access
```

Текущая реализация ставит `revoked_at`, а не удаляет запись.

## Как игрок запрашивает переход

1. Войти под игроком.
2. Открыть `/campaigns/1`.
3. Нажать **Запросить переход**.
4. Выбрать целевую локацию и персонажа.
5. Написать короткое сообщение ГМу.
6. Нажать **Отправить запрос ГМу**.

Backend endpoint:

```http
POST /api/campaigns/:campaignId/location-travel-requests
```

Запрос создаётся в `gm_request` с `request_type = location_travel`.

## Как ГМ одобряет или отклоняет

ГМ видит pending-запросы в блоке **Запросы игроков** на `/campaigns/1`.

Одобрить:

```http
POST /api/campaigns/:campaignId/gm-requests/:requestId/approve
```

Что происходит:

- `gm_request.status = approved`;
- игрок получает доступ к целевой локации;
- персонаж получает `current_location_id`, если был выбран;
- `campaign.active_location_id` переключается на целевую локацию;
- создаётся `session_event`;
- создаётся system `chat_message`;
- пишется `audit_log`.

Отклонить:

```http
POST /api/campaigns/:campaignId/gm-requests/:requestId/reject
```

Что происходит:

- `gm_request.status = rejected`;
- сохраняется `gm_comment`;
- создаётся private/system chat message;
- пишется `audit_log`.

## Используемые таблицы

- `location`;
- `campaign.active_location_id`;
- `attachment`;
- `player_location_access`;
- `gm_request`;
- `session_event`;
- `chat_message`;
- `audit_log`.

## Ограничения текущего этапа

- Нет WebSocket, изменения подтягиваются через обычное обновление данных.
- Нет Roll20 canvas и drag-and-drop токенов.
- Нет cloud storage/S3.
- Нет image editor/cropper.
- Access control пока локальный для локаций; общий слой прав ещё нужно развить.
- Игрок может отправлять запрос только на локации, которые frontend ему показывает.

