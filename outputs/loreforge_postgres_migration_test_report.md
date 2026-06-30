# LoreForge PostgreSQL migration test report

Дата проверки: 2026-06-30  
Тестовая БД: `loreforge_test`  
PostgreSQL: Docker container `postgres:16`  
Контейнер: `loreforge-postgres-test`

## 1. SQL-файлы

Применялись по порядку:

1. `C:\Users\Bogdan\Downloads\dnd_campaign_schema.sql`
2. `C:\Users\Bogdan\Documents\Codex\2026-06-30\loreforge-rpg-roll20-text-npc-loreforge\outputs\loreforge_schema_upgrade.sql`

## 2. Результат применения

Обе миграции применились успешно.

- `dnd_campaign_schema.sql` - без ошибок.
- `loreforge_schema_upgrade.sql` - без ошибок.

Patch-файл не потребовался: SQL уже оказался применимым на чистой PostgreSQL 16 базе после исходной схемы.

## 3. Что было проверено

Проверено:

- создание чистой базы `loreforge_test`;
- применение исходной схемы;
- применение upgrade-миграции;
- наличие всех новых ключевых таблиц;
- наличие новых колонок в `campaign`;
- наличие новых колонок в `chat_message`;
- наличие индексов по `campaign_id`, `visibility`, `world_plugin_id`, `entity_type/entity_id`.

## 4. Итоговый список таблиц

```text
ability
app_user
attachment
attachment_access
audit_log
auth_account
auth_session
campaign
campaign_chat
campaign_invite
campaign_member
campaign_plugin
character
character_ability
character_known_location
character_known_npc
character_resource
character_stat
chat_message
dice_roll
email_verification_token
entity_relation
entity_tag
faction_group
gm_note
gm_request
gm_request_effect
inventory
inventory_entry
investigation
investigation_link
item
location
npc
password_reset_token
player_location_access
player_npc_access
plugin
plugin_assignment
plugin_component
plugin_feature
scene
scene_image
scene_mask
scene_player_state
scene_presence
session_event
session_log
tag
token
token_placement
user_profile
world_plugin
```

## 5. Ключевые новые таблицы

Все требуемые таблицы присутствуют:

```text
ability
audit_log
campaign_invite
campaign_plugin
character_ability
character_resource
character_stat
entity_tag
gm_note
plugin_feature
session_event
session_log
tag
world_plugin
```

## 6. Проверка campaign

В `campaign` появились:

```text
campaign.cover_attachment_id: bigint
campaign.status: text
```

## 7. Проверка chat_message

В `chat_message` появились:

```text
chat_message.dice_roll_id: bigint
chat_message.message_type: text
chat_message.metadata_json: jsonb
chat_message.visibility: text
```

## 8. Проверка индексов

Подтверждены индексы для основных access patterns:

- `campaign_id`: есть на campaign-зависимых таблицах, включая `campaign_plugin`, `session_log`, `session_event`, `audit_log`, `gm_note`, `tag`, `entity_tag`.
- `visibility`: есть на `npc`, `location`, `item`, `attachment`, `chat_message`, `dice_roll`, `entity_relation`, `investigation`, `investigation_link`, `session_log`, `session_event`, `gm_note`.
- `world_plugin_id`: есть на `world_plugin`, `plugin_feature`, `campaign_plugin`, `ability`.
- `entity_type/entity_id`: есть на `audit_log`, `entity_tag`, `gm_note`, `investigation_link`, `entity_relation`.

Примеры подтвержденных индексов:

```text
idx_campaign_plugin_world_plugin_id
idx_plugin_feature_world_plugin_id
idx_ability_world_plugin_id
idx_npc_campaign_visibility
idx_location_campaign_visibility
idx_item_campaign_visibility
idx_chat_message_visibility
idx_dice_roll_visibility
idx_entity_relation_source_entity
idx_entity_relation_target_entity
idx_investigation_link_entity
idx_entity_tag_campaign_entity
idx_gm_note_entity
idx_audit_log_entity
```

## 9. Ошибки и исправления

Ошибок во время фактического применения миграций не было.

До запуска проверки был учтен потенциальный риск порядка операций с `dice_roll.visibility`: старый CHECK constraint должен сниматься до преобразования значения `private` в `player_only`. В текущем `loreforge_schema_upgrade.sql` порядок корректный, поэтому миграция прошла успешно.

## 10. Рекомендации для backend API

Следующие backend-слои стоит подключать первыми:

1. Access/visibility service на базе `visibility_scope`, роли участника и персональных access-таблиц.
2. Session journal API для `session_log` и `session_event`.
3. Plugin API для `world_plugin`, `plugin_feature`, `campaign_plugin`.
4. Character sheet API для `character_stat`, `character_resource`, `character_ability`.
5. Chat/Dice API, где бросок создает `dice_roll` и сообщение `chat_message` с `message_type = 'dice'`.
6. GM notes API для `gm_note`.
7. Tags API для `tag` и `entity_tag`.
8. Audit writer middleware для записи `audit_log` при изменении ключевых сущностей.
9. Invite flow API для `campaign_invite`.

Frontend в рамках этой проверки не трогался.

