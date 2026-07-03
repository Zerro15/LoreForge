# Onboarding нового ГМа

Onboarding нужен, чтобы новый пользователь после регистрации не попадал в пустой общий интерфейс, а сразу создал первую кампанию и оказался в Play Room.

## Когда открывается onboarding

После успешного `register` или `login` frontend вызывает:

```http
GET /api/campaigns
```

Если список кампаний пустой, пользователь перенаправляется на:

```text
/onboarding
```

Если кампании есть, пользователь попадает на:

```text
/campaigns
```

Важно: `GET /api/campaigns` возвращает только кампании текущего пользователя по session cookie.

## Шаги onboarding

### 1. Выбор роли

Пользователь выбирает:

- **Создать кампанию как ГМ**;
- **Присоединиться как игрок** — пока заглушка `Скоро`.

### 2. Настройка кампании

Поля:

- название;
- описание;
- видимость `private/public`;
- максимум игроков.

### 3. Выбор plugin мира

Реально доступен:

- `Mistbound`.

Пока отключены:

- `DnD-like`;
- `Custom World`.

Если `Mistbound` отсутствует в базе, backend создаёт системный `world_plugin` при запросе `/api/world-plugins` или при создании кампании без `worldPluginId`.

### 4. Стартовая локация

Поля:

- название;
- публичное описание;
- секретное описание;
- optional upload картинки.

После создания:

- создаётся `location`;
- optional картинка сохраняется через `attachment`;
- локация становится `campaign.active_location_id`.

Можно нажать **Пропустить**, тогда кампания создаётся без стартовой локации.

### 5. Приглашение игроков

Пока показывается заглушка:

```text
Приглашения появятся позже
```

Кнопка ведёт в:

```text
/campaigns/:campaignId
```

## Используемые API

- `POST /api/campaigns`;
- `GET /api/world-plugins`;
- `POST /api/campaigns/:campaignId/locations`;
- `POST /api/campaigns/:campaignId/locations/:locationId/image`;
- `POST /api/campaigns/:campaignId/locations/:locationId/activate`.

## Ограничения текущего этапа

- Нет полноценного invite system.
- Нет join by invite.
- Нет DnD plugin.
- Нет custom plugin constructor.
- Нет marketplace.
- Onboarding создаёт только первую базовую кампанию и стартовую локацию.

