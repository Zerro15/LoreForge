# План развития LoreForge

LoreForge продолжаем развивать как полноценный продукт, а не только как демо. Этот план фиксирует ближайшие этапы и помогает не смешивать большие фичи с технической стабилизацией.

## Этап 1 — Stabilization

Цель: привести MVP-код к устойчивой структуре перед следующим крупным CRUD.

- структура проекта;
- единые frontend/API типы;
- единый API client;
- error handling;
- loading/error states;
- code cleanup;
- уменьшение hardcode;
- backend route decomposition;
- ревизия документации под продуктовую разработку.

### Текущая ревизия структуры

- Backend лежит в `src`: `server.ts`, `db.ts`, route-файлы.
- Frontend лежит в `app` и `components`.
- Общие frontend-типы лежат в `lib/types.ts`.
- Frontend API client лежит в `lib/api.ts`.
- Конфигурационные frontend constants лежат в `lib/config.ts`.
- SQL-артефакты лежат в `dnd_campaign_schema.sql` и `outputs`.
- PowerShell automation лежит в `scripts`.
- Документация лежит в `docs`.

### Найденные технические долги

- backend routes нужно держать разделёнными по доменам, чтобы следующий NPC CRUD не раздувал один файл.
- access checks должны оставаться в `src/access/campaignAccess.ts`, а route-файлы должны использовать общий слой.
- dice roll actor должен определяться backend-ом по текущей session, без frontend `userId`.
- UI-компоненты достаточно рабочие для MVP, но позже стоит выделить design tokens и layout primitives.

## Этап 2 — Auth

Статус: базовая email/password auth уже реализована.

Цель следующих доработок: укрепить auth flow и подготовить production-grade session UX.

- регистрация;
- login;
- session/JWT/cookies;
- logout;
- current user;
- базовая защита API routes.

## Этап 3 — Roles & Access

Статус: базовый Roles & Access Control уже реализован.

Цель следующих доработок: расширять проверки при добавлении CRUD и новых private сущностей.

- роли `owner`, `gm`, `co_gm`, `player`, `viewer`;
- проверка `campaign_member`;
- доступ к `SecretBlock`;
- доступ к `gm_note`;
- visibility service;
- фильтрация `gm_only` и `hidden_until_discovered` данных на backend.

## Этап 4 — CRUD

Цель: перейти от read-only demo к управлению кампанией из UI.

Следующий крупный фокус: NPC CRUD под роли и visibility.

- создание кампании;
- редактирование кампании;
- создание персонажа;
- редактирование персонажа;
- создание NPC;
- редактирование NPC;
- редактирование локаций;
- предметы и инвентарь;
- базовая валидация форм.

## Этап 5 — Live Play

Цель: сделать LoreForge удобным во время игровой сессии.

- chat improvements;
- dice history;
- player actions;
- GM requests;
- session events;
- быстрые заметки мастера;
- привязка событий к NPC, локациям и персонажам.

## Этап 6 — Plugin System

Цель: оформить подключаемые правила миров как стабильную платформенную возможность.

- world plugins;
- plugin features;
- campaign plugin config;
- character stats/resources from plugins;
- plugin-driven abilities;
- validation для plugin config;
- документация контракта plugin features.

## Этап 7 — Plugin Constructor

Цель: дать мастеру возможность создавать свой мир без правки SQL/кода.

- создание своего мира;
- характеристики;
- ресурсы;
- способности;
- состояния;
- правила;
- шаблоны проверок;
- экспорт/импорт плагинов.

## Этап 8 — Tabletop

Цель: добавить визуальный режим игры поверх Campaign OS.

- scenes;
- tokens;
- maps;
- visibility masks;
- fog of war;
- привязка токенов к персонажам/NPC;
- базовые инструменты мастера на сцене.

## Ближайший следующий шаг

Следующий крупный этап — Auth. Перед ним желательно завершить оставшуюся стабилизацию:

- декомпозировать слишком большой `src/routes/campaigns.ts`;
- выделить backend services для dice и campaign dashboard;
- добавить минимальные API tests;
- описать access-control контракт до реализации.
