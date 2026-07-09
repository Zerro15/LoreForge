# Токены карты

Токены карты — базовый слой VTT в LoreForge. Они показываются поверх изображения сцены в Play Room.

Токены показываются в режиме сцены `tactical_map`. В режиме `illustration` frontend скрывает тактические слои, чтобы картинка сцены оставалась главным объектом экрана.

## Модель

- `Location` — контейнер мира.
- `Scene` — конкретная карта внутри локации.
- `scene_token` — объект на карте сцены.

Типы токенов:

- `character` — персонаж игрока;
- `npc` — NPC, создаётся и управляется ГМом;
- `marker` — простой объект: дверь, стол, улика, точка интереса.

Позиция хранится в процентах:

- `x`: 0–100;
- `y`: 0–100.

Это позволяет масштабировать карту без пересчёта координат.

## Видимость

- `public` — виден всем участникам, включая viewer;
- `gm_only` — виден только `owner/gm/co_gm`;
- `hidden` — скрыт от игроков и viewer.

ГМ видит все активные токены. Player и viewer получают только public-токены.

## Что умеет ГМ

В Play Room ГМ может:

- нажать **Добавить объект**;
- создать marker-токен;
- перетащить токен мышью;
- изменить видимость;
- удалить токен через soft archive.

Удаление не физическое: `scene_token.status = archived`.

## Что видит игрок

Игрок видит:

- public character tokens;
- public marker tokens;
- public NPC tokens, если ГМ решит их открыть.

## Изображение токена

Токен выбирает картинку в таком порядке:

1. собственный `image_attachment_id`;
2. portrait персонажа через `character.avatar_attachment_id`;
3. portrait NPC через `npc.portrait_attachment_id`;
4. fallback: первая буква имени или marker-иконка.

Портреты рисуются круглыми через CSS (`rounded-full`, `object-cover`). `gm_only` токены не отдаются player/viewer, поэтому портреты скрытых NPC не утекают через карту.

Игрок не видит `gm_only` NPC и скрытые маркеры.

## Интеграция с персонажами

Когда ГМ перемещает игрока на сцену и выбирает персонажа, backend создаёт или переносит character-token на эту сцену.

Полное автосоздание токена в момент создания персонажа будет подключено на этапе, где Character CRUD находится в основной ветке вместе с этим VTT-слоем.

## API

```http
GET /api/campaigns/:campaignId/scenes/:sceneId/tokens
POST /api/campaigns/:campaignId/scenes/:sceneId/tokens
PATCH /api/campaigns/:campaignId/tokens/:tokenId
DELETE /api/campaigns/:campaignId/tokens/:tokenId
```

## Ограничения текущего этапа

- Нет combat.
- Нет инициативы.
- Нет урона.
- Нет combat, initiative и damage.
- Нет сложного редактора карты.
- Нет real-time синхронизации через WebSocket.
