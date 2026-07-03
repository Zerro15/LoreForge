# Roles & Access Control

LoreForge использует роли на уровне `campaign_member.role`. Backend проверяет права перед выдачей данных и перед изменяющими действиями.

## Роли

- `owner` — владелец кампании.
- `gm` — основной мастер.
- `co_gm` — со-мастер.
- `player` — игрок.
- `viewer` — наблюдатель в режиме чтения.

## Матрица возможностей

| Возможность | owner | gm | co_gm | player | viewer |
| --- | --- | --- | --- | --- | --- |
| Видеть GM secrets | да | да | да | нет | нет |
| Видеть `gm_note` | да | да | да | нет | нет |
| Видеть все локации | да | да | да | нет | нет |
| Создавать/редактировать локации | да | да | да | нет | нет |
| Загружать картинки локаций | да | да | да | нет | нет |
| Выдавать/отзывать доступ к локации | да | да | да | нет | нет |
| Одобрять/отклонять GM requests | да | да | да | нет | нет |
| Создавать travel request | нет | нет | нет | да | нет |
| Бросать кубики | да | да | да | да | нет |
| Читать публичные данные | да | да | да | да | да |

## Backend helper

Основной модуль:

```text
src/access/campaignAccess.ts
```

Он содержит:

- `getCampaignMember(userId, campaignId)`;
- `requireCampaignMember(userId, campaignId)`;
- `requireGameMaster(userId, campaignId)`;
- `requireOwnerOrGM(userId, campaignId)`;
- `canManageCampaign(role)`;
- `canManageLocations(role)`;
- `canViewGMSecrets(role)`;
- `canApproveGMRequests(role)`;
- `canUploadLocationImages(role)`;
- `canRollDice(role)`;
- `canCreateTravelRequest(role)`.

## API payload для frontend

`GET /api/campaigns/:campaignId/dashboard` возвращает `currentMember`:

```json
{
  "role": "player",
  "canManageCampaign": false,
  "canManageLocations": false,
  "canViewGMSecrets": false,
  "canApproveGMRequests": false,
  "canUploadLocationImages": false,
  "canRollDice": true,
  "canCreateTravelRequest": true
}
```

Frontend использует этот объект, чтобы скрывать действия:

- Location Manager;
- upload image;
- grant/revoke access;
- activate location;
- GM Requests Panel;
- Dice controls для `viewer`;
- SecretBlock для пользователей без доступа к секретам.

## Маскирование секретов

Для `player` и `viewer` backend возвращает `NULL` вместо:

- `campaign.gm_journal`;
- `character.secret_description`;
- `character.notes`;
- `npc.secret_description`;
- `npc.gm_secrets`;
- `npc.campaign_journal`;
- `location.secret_description`;
- `session_log.summary_private`.

Также для не-GM пользователей фильтруются:

- `gm_only` chat messages;
- `gm_only` dice rolls;
- `gm_only` и `hidden_until_discovered` session events;
- скрытые локации без `player_location_access`.

## Ограничения текущего этапа

- Access control уже enforced на backend, но это не финальная security-модель.
- `gm_note` пока не имеет отдельного публичного API.
- `player_only` сообщения фильтруются по `sender_user_id` или `metadata_json.targetUserId`.
- Нет WebSocket, поэтому после действий нужен обычный refresh/fetch.

