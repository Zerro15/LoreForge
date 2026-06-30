# Отчет проверки seed_loreforge_demo.sql

Дата проверки: 2026-06-30

## Что проверялось

Проверялся демо-seed для LoreForge:

- файл: `outputs/seed_loreforge_demo.sql`;
- кампания: `Туман над Баклундом`;
- публичный плагин мира: `Mistbound`;
- стиль: короткие игровые заметки ГМа в LoTM-like атмосфере без шаблонного фэнтези.

## Команды

```powershell
.\scripts\db\reset-dev-db.ps1
.\scripts\db\check-db.ps1
```

## Результат reset

`reset-dev-db.ps1` прошел успешно:

- PostgreSQL container стал `healthy`;
- применился `dnd_campaign_schema.sql`;
- применился `outputs/loreforge_schema_upgrade.sql`;
- применился `outputs/seed_loreforge_demo.sql`.

Seed вернул:

```text
users_created: 3
characters_created: 2
npcs_created: 4
items_created: 5
session_events_created: 5
chat_messages_created: 10
```

## Результат check-db

`check-db.ps1` прошел успешно.

PostgreSQL:

```text
PostgreSQL 16.13 (Debian 16.13-1.pgdg13+1)
```

Таблиц найдено:

```text
53
```

Все ключевые таблицы найдены:

- `campaign`
- `campaign_member`
- `character`
- `npc`
- `location`
- `chat_message`
- `dice_roll`
- `session_log`
- `session_event`
- `world_plugin`
- `plugin_feature`
- `campaign_plugin`
- `character_stat`
- `character_resource`
- `ability`
- `character_ability`
- `gm_note`
- `tag`
- `entity_tag`
- `audit_log`

## Счетчики демо-данных

```text
campaigns=1
users=3
characters=2
npcs=4
locations=4
items=5
chat_messages=10
dice_rolls=2
session_events=5
gm_notes=3
tags=7
entity_relations=4
```

## Примечания

- `investigation.status` в текущей схеме допускает `open`, `closed`, `archived`, поэтому демо-расследование создано со статусом `open`.
- Смысл активного расследования сохранен через название, описание, связи и `visibility = 'party_only'`.
- SQL-схемы не менялись.
