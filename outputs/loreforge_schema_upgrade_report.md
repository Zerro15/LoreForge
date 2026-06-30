# LoreForge: отчет по улучшению SQL-схемы

## 1. Краткий анализ текущей схемы

Исходная схема уже покрывает хороший MVP LoreForge:

- пользователи, профили, авторизация и сессии;
- кампании и участники;
- локации, сцены, изображения, маски и состояния видимости;
- персонажи, NPC, фракции и присутствие на сцене;
- вложения, токены, предметы, инвентари;
- старый механизм `plugin/plugin_component/plugin_assignment`;
- отношения, чат, броски кубов, запросы к ГМу;
- базовые расследования.

Схема больше похожа не на простой Roll20-клон, а на основу Campaign OS. Главная проблема была в том, что часть доменных идей уже есть, но архитектурно они выражены неравномерно.

## 2. Найденные проблемы

- Не было `updated_at` почти во всех редактируемых игровых таблицах.
- Видимость была разрознена: `is_public`, `is_visible_to_players`, `public_description`, `secret_description`, `gm_secrets`, `visibility` у бросков.
- Журнал кампании был текстом внутри `campaign`, а не отдельной историей сессий и событий.
- `plugin` смешивал понятия мира/системы и конкретной механики.
- Не было явной модели `world_plugin -> plugin_feature -> campaign_plugin`.
- У персонажей не было нормализованных характеристик, ресурсов и способностей.
- `entity_relation` и `investigation_link` были слишком жестко завязаны на character/npc/group.
- Не было универсальных заметок ГМа к любой сущности.
- Не было тегов для лора.
- Бросок кубов не был нормально связан с сообщением чата.
- Не было приглашений в кампанию.
- Не было audit log для истории изменений.
- У кампании не было lifecycle-статуса и обложки.

## 3. Что добавлено

SQL-миграция: `loreforge_schema_upgrade.sql`.

Основные изменения:

- добавлен домен `visibility_scope`;
- добавлен `updated_at` в основные редактируемые таблицы;
- добавлены `campaign.status` и `campaign.cover_attachment_id`;
- добавлена единая `visibility` для NPC, локаций, предметов, вложений, сообщений, бросков, расследований, связей и tabletop-сущностей;
- добавлены `session_log` и `session_event`;
- добавлены `world_plugin`, `plugin_feature`, `campaign_plugin`;
- старый `plugin` сохранен и получил `source_plugin_feature_id` для постепенной миграции;
- добавлены `character_stat`, `character_resource`;
- добавлены `ability`, `character_ability`;
- добавлена `campaign_invite`;
- усилен `chat_message`: `message_type`, `visibility`, `metadata_json`, `dice_roll_id`;
- добавлен `gm_note`;
- добавлены `tag`, `entity_tag`;
- `investigation_link` получил polymorphic-связь `entity_type/entity_id`;
- `entity_relation` получил polymorphic-связи `source_entity_*` и `target_entity_*`;
- добавлен `audit_log`;
- добавлены индексы под campaign/user/entity/visibility/plugin/created_at-сценарии.

## 4. Миграционный путь для плагинов

Старые таблицы не удалены:

- `plugin`;
- `plugin_component`;
- `plugin_assignment`.

Новая целевая модель:

```text
world_plugin
  -> plugin_feature
  -> campaign_plugin
  -> character_stat / character_resource / ability / character_ability
```

Практический путь:

1. Создать `world_plugin` для DnD-like, Mistbound, Cyberpunk или Custom World.
2. Перенести старые строки `plugin` в `plugin_feature`, где это механики.
3. Проставить `plugin.source_plugin_feature_id` для обратной совместимости.
4. Новые API писать уже вокруг `world_plugin`, `plugin_feature`, `campaign_plugin`.
5. Старый `plugin_assignment` временно использовать как compatibility layer, пока frontend/backend не перейдет на новые таблицы.

## 5. Что подключать дальше в backend API

- Middleware/сервис видимости: `visibility_scope` + роль участника + персональные access-таблицы.
- API журналов: `session_log`, `session_event`, автозапись событий после бросков, выдачи предметов, открытия локаций.
- API плагинов: подключение `world_plugin` к кампании через `campaign_plugin`.
- API характеристик и ресурсов персонажа: CRUD для `character_stat` и `character_resource`.
- API способностей: список способностей мира и unlocked-состояние персонажа.
- API заметок ГМа: `gm_note` с привязкой к любой сущности.
- API тегов: единый tagging для NPC, локаций, предметов, расследований и сцен.
- API аудита: запись `audit_log` при изменениях ключевых сущностей.
- API приглашений: создание invite token, accept/reject/expire flow.
- Chat API: сообщения типа `dice`, `system`, `action`, `gm_note`.

## 6. Что потребует правок frontend

- Формы редактирования должны учитывать `visibility`.
- Чат должен уметь отображать `message_type = dice` и подтягивать `dice_roll_id`.
- Кампания должна показывать `status` и обложку.
- Нужно добавить UI журнала сессий и событий.
- Нужен UI подключения world plugins к кампании.
- Лист персонажа должен читать `character_stat`, `character_resource`, `character_ability`.
- Нужны интерфейсы тегов и заметок ГМа.
- Экран расследований должен работать с polymorphic `entity_type/entity_id`, а не только NPC/location/group.
- Граф отношений должен перейти на `source_entity_type/source_entity_id` и `target_entity_type/target_entity_id`.

## 7. Приоритет следующего шага

Сначала стоит подключать backend в таком порядке:

1. `visibility_scope` и access rules.
2. `session_log/session_event`.
3. `world_plugin/plugin_feature/campaign_plugin`.
4. `character_stat/character_resource`.
5. `chat_message` + `dice_roll_id`.
6. `gm_note` и `tag/entity_tag`.
7. `audit_log`.

