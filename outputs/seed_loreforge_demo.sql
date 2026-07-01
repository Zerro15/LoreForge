BEGIN;

WITH
users_seed AS (
    INSERT INTO app_user (username, display_name, notes)
    VALUES
        ('bogdan', 'Bogdan', 'GM'),
        ('dima', 'Dima', 'Player'),
        ('alice', 'Alice', 'Player')
    RETURNING user_id, username
),
profiles_seed AS (
    INSERT INTO user_profile (user_id, full_name, locale, timezone)
    VALUES
        ((SELECT user_id FROM users_seed WHERE username = 'bogdan'), 'Bogdan', 'ru', 'Asia/Yekaterinburg'),
        ((SELECT user_id FROM users_seed WHERE username = 'dima'), 'Dima', 'ru', 'Asia/Yekaterinburg'),
        ((SELECT user_id FROM users_seed WHERE username = 'alice'), 'Alice', 'ru', 'Asia/Yekaterinburg')
    RETURNING user_id
),
auth_accounts_seed AS (
    INSERT INTO auth_account (user_id, email, password_hash, is_email_verified, is_active)
    VALUES
        ((SELECT user_id FROM users_seed WHERE username = 'bogdan'), 'bogdan@example.com', '$2b$10$PWMYTboyBtYgMQ9FKRQ5bOlBHFCBvQ0aFAFkabCatRBhK52luGEwa', TRUE, TRUE),
        ((SELECT user_id FROM users_seed WHERE username = 'dima'), 'dima@example.com', '$2b$10$PWMYTboyBtYgMQ9FKRQ5bOlBHFCBvQ0aFAFkabCatRBhK52luGEwa', TRUE, TRUE),
        ((SELECT user_id FROM users_seed WHERE username = 'alice'), 'alice@example.com', '$2b$10$PWMYTboyBtYgMQ9FKRQ5bOlBHFCBvQ0aFAFkabCatRBhK52luGEwa', TRUE, TRUE)
    RETURNING auth_account_id
),
campaign_seed AS (
    INSERT INTO campaign (
        name,
        setting_name,
        description,
        gm_user_id,
        public_journal,
        gm_journal,
        status
    )
    VALUES (
        'Туман над Баклундом',
        'Mistbound',
        'В Восточном районе Баклунда пропадают рабочие. Следы ведут к аптеке Морриса, старой часовне и людям в серых масках.',
        (SELECT user_id FROM users_seed WHERE username = 'bogdan'),
        'Дело началось с пропавших рабочих и мокрых следов у аптеки Морриса.',
        'Моррис уже понял, что за ним следят.',
        'active'
    )
    RETURNING campaign_id
),
members_seed AS (
    INSERT INTO campaign_member (campaign_id, user_id, role)
    VALUES
        ((SELECT campaign_id FROM campaign_seed), (SELECT user_id FROM users_seed WHERE username = 'bogdan'), 'gm'),
        ((SELECT campaign_id FROM campaign_seed), (SELECT user_id FROM users_seed WHERE username = 'dima'), 'player'),
        ((SELECT campaign_id FROM campaign_seed), (SELECT user_id FROM users_seed WHERE username = 'alice'), 'player')
    RETURNING campaign_id
),
world_plugin_seed AS (
    INSERT INTO world_plugin (name, slug, description, type, created_by_user_id)
    VALUES (
        'Mistbound',
        'mistbound',
        'Пути, последовательности, зелья, духовность и риск потери контроля.',
        'system',
        (SELECT user_id FROM users_seed WHERE username = 'bogdan')
    )
    RETURNING world_plugin_id
),
campaign_plugin_seed AS (
    INSERT INTO campaign_plugin (campaign_id, world_plugin_id, is_active, config_json)
    VALUES (
        (SELECT campaign_id FROM campaign_seed),
        (SELECT world_plugin_id FROM world_plugin_seed),
        TRUE,
        '{"tone":"victorian_city_investigation","risk_enabled":true}'::JSONB
    )
    RETURNING campaign_plugin_id
),
plugin_feature_seed AS (
    INSERT INTO plugin_feature (world_plugin_id, feature_type, name, description, config_json)
    VALUES
        ((SELECT world_plugin_id FROM world_plugin_seed), 'pathway', 'Провидец', 'Видит знаки, сны и плохие варианты будущего.', '{}'::JSONB),
        ((SELECT world_plugin_id FROM world_plugin_seed), 'pathway', 'Мародёр', 'Берёт чужое внимание, вещи и шансы.', '{}'::JSONB),
        ((SELECT world_plugin_id FROM world_plugin_seed), 'sequence', 'Последовательность 9', 'Первый шаг на пути. Ошибки уже опасны.', '{}'::JSONB),
        ((SELECT world_plugin_id FROM world_plugin_seed), 'resource', 'Духовность', 'Сила для зрения, ритуалов и странных действий.', '{"max":100}'::JSONB),
        ((SELECT world_plugin_id FROM world_plugin_seed), 'resource', 'Рассудок', 'Насколько персонаж держится после увиденного.', '{"max":100}'::JSONB),
        ((SELECT world_plugin_id FROM world_plugin_seed), 'resource', 'Усвоение', 'Насколько хорошо зелье стало частью персонажа.', '{"max":100}'::JSONB),
        ((SELECT world_plugin_id FROM world_plugin_seed), 'risk', 'Риск потери контроля', 'Когда риск растёт, тело и мысли перестают слушаться.', '{"max":100}'::JSONB),
        ((SELECT world_plugin_id FROM world_plugin_seed), 'potion', 'Зелье последовательности 9', 'Осадок движется, если долго смотреть.', '{}'::JSONB),
        ((SELECT world_plugin_id FROM world_plugin_seed), 'rule', 'Проверка потери контроля', 'При сильном стрессе брось d100 против риска.', '{}'::JSONB)
    RETURNING plugin_feature_id, feature_type, name
),
ability_seed AS (
    INSERT INTO ability (
        world_plugin_id,
        name,
        description,
        ability_type,
        resource_cost_json,
        risk_json,
        config_json
    )
    VALUES
        ((SELECT world_plugin_id FROM world_plugin_seed), 'Духовное зрение', 'Видишь следы потустороннего. Иногда слишком ясно.', 'active', '{"spirituality":8}'::JSONB, '{"control_risk":2}'::JSONB, '{}'::JSONB),
        ((SELECT world_plugin_id FROM world_plugin_seed), 'Гадание', 'Задаёшь вопрос картам, монете или сну.', 'ritual', '{"spirituality":6}'::JSONB, '{"control_risk":1}'::JSONB, '{}'::JSONB),
        ((SELECT world_plugin_id FROM world_plugin_seed), 'Интуиция опасности', 'Кожа холодеет за секунду до беды.', 'passive', '{}'::JSONB, '{}'::JSONB, '{}'::JSONB),
        ((SELECT world_plugin_id FROM world_plugin_seed), 'Ловкие руки', 'Замок, карман или ящик открываются тише обычного.', 'active', '{}'::JSONB, '{}'::JSONB, '{}'::JSONB),
        ((SELECT world_plugin_id FROM world_plugin_seed), 'Чутьё опасности', 'Ты замечаешь, когда улица смотрит на тебя не так.', 'passive', '{}'::JSONB, '{}'::JSONB, '{}'::JSONB)
    RETURNING ability_id, name
),
location_city_seed AS (
    INSERT INTO location (
        campaign_id,
        parent_location_id,
        name,
        location_type,
        public_description,
        secret_description,
        state_text,
        visibility
    )
    VALUES
        ((SELECT campaign_id FROM campaign_seed), NULL, 'Баклунд', 'city', 'Большой город, где туман скрывает больше, чем грязь и бедность.', NULL, 'Туман держится третью ночь.', 'public')
    RETURNING location_id, name
),
location_district_seed AS (
    INSERT INTO location (
        campaign_id,
        parent_location_id,
        name,
        location_type,
        public_description,
        secret_description,
        state_text,
        visibility
    )
    VALUES (
        (SELECT campaign_id FROM campaign_seed),
        (SELECT location_id FROM location_city_seed WHERE name = 'Баклунд'),
        'Восточный район',
        'district',
        'Рабочие кварталы, дешёвые лавки, подвалы, узкие улицы.',
        NULL,
        'Полиция ходит парами.',
        'public'
    )
    RETURNING location_id, name
),
location_place_seed AS (
    INSERT INTO location (
        campaign_id,
        parent_location_id,
        name,
        location_type,
        public_description,
        secret_description,
        state_text,
        visibility
    )
    VALUES
        ((SELECT campaign_id FROM campaign_seed), (SELECT location_id FROM location_district_seed WHERE name = 'Восточный район'), 'Аптека Морриса', 'shop', 'Тесная аптека с запахом спирта, трав и старой бумаги.', 'В подвале лежат ингредиенты для зелья и чужие письма.', 'Задняя дверь недавно открывалась.', 'hidden_until_discovered'),
        ((SELECT campaign_id FROM campaign_seed), (SELECT location_id FROM location_district_seed WHERE name = 'Восточный район'), 'Старая часовня', 'chapel', 'Закрытая часовня на краю района. Ночью там горит свет.', 'Под алтарём скрыт проход в ритуальную комнату.', 'Дверь заколочена снаружи.', 'hidden_until_discovered')
    RETURNING location_id, name
),
location_seed AS (
    SELECT location_id, name FROM location_city_seed
    UNION ALL
    SELECT location_id, name FROM location_district_seed
    UNION ALL
    SELECT location_id, name FROM location_place_seed
),
scene_seed AS (
    INSERT INTO scene (
        campaign_id,
        location_id,
        name,
        scene_type,
        public_description,
        gm_description,
        sort_order,
        is_active
    )
    VALUES (
        (SELECT campaign_id FROM campaign_seed),
        (SELECT location_id FROM location_seed WHERE name = 'Аптека Морриса'),
        'Аптека Морриса — вечер',
        'investigation',
        'Дождь стучит по вывеске. Внутри горит жёлтая лампа.',
        'Моррис держит письмо в нижнем ящике прилавка.',
        1,
        TRUE
    )
    RETURNING scene_id
),
group_seed AS (
    INSERT INTO faction_group (
        campaign_id,
        name,
        group_type,
        public_description,
        secret_description,
        notes
    )
    VALUES (
        (SELECT campaign_id FROM campaign_seed),
        'Люди в серых масках',
        'secret_society',
        'О них говорят шёпотом. Лиц никто не помнит.',
        'Ищут носителя для зелья. Прячутся за мелкими поручениями.',
        'Не раскрывать рано.'
    )
    RETURNING group_id, name
),
character_seed AS (
    INSERT INTO "character" (
        campaign_id,
        owner_user_id,
        current_location_id,
        current_scene_id,
        name,
        public_description,
        secret_description,
        notes,
        status_text
    )
    VALUES
        (
            (SELECT campaign_id FROM campaign_seed),
            (SELECT user_id FROM users_seed WHERE username = 'dima'),
            (SELECT location_id FROM location_seed WHERE name = 'Восточный район'),
            (SELECT scene_id FROM scene_seed),
            'Артур Вейн',
            'Мелкий частный сыщик. Слишком часто видит то, чего не должен видеть.',
            'Путь: Провидец. Последовательность: 9.',
            'Держит блокнот с чужими снами.',
            'Насторожен'
        ),
        (
            (SELECT campaign_id FROM campaign_seed),
            (SELECT user_id FROM users_seed WHERE username = 'alice'),
            (SELECT location_id FROM location_seed WHERE name = 'Восточный район'),
            (SELECT scene_id FROM scene_seed),
            'Элиза Морроу',
            'Карманница из Восточного района. Умеет исчезать из чужого внимания.',
            'Путь: Мародёр. Последовательность: 9.',
            'Знает, какие двери не скрипят.',
            'Держится рядом с выходом'
        )
    RETURNING character_id, name
),
npc_seed AS (
    INSERT INTO npc (
        campaign_id,
        group_id,
        name,
        title,
        public_description,
        secret_description,
        gm_secrets,
        campaign_journal,
        status_text,
        visibility
    )
    VALUES
        (
            (SELECT campaign_id FROM campaign_seed),
            NULL,
            'Аптекарь Моррис',
            'аптекарь',
            'Старый аптекарь. Продаёт настойки, бинты и дешёвые лекарства.',
            'Скупает ингредиенты для зелий. Передаёт письма людям в серых масках.',
            'Если давят, смотрит на дверь в подвал.',
            'Последним видел двух пропавших рабочих.',
            'Нервничает',
            'hidden_until_discovered'
        ),
        (
            (SELECT campaign_id FROM campaign_seed),
            NULL,
            'Инспектор Грей',
            'инспектор',
            'Полицейский из участка Восточного района. Усталый, раздражённый, но не глупый.',
            'Понимает, что дело связано с потусторонним, но боится лезть глубже.',
            'Поможет, если не заставлять его писать официальный отчёт.',
            'Передал группе список пропавших.',
            'Осторожен',
            'public'
        ),
        (
            (SELECT campaign_id FROM campaign_seed),
            NULL,
            'Мадам Вирна',
            'хозяйка салона',
            'Хозяйка небольшого салона. Знает слухи быстрее газет.',
            'Видела человека в серой маске рядом с часовней.',
            'Просит не называть её имя полиции.',
            'Может подтвердить путь к часовне.',
            'Ждёт гостей',
            'hidden_until_discovered'
        ),
        (
            (SELECT campaign_id FROM campaign_seed),
            (SELECT group_id FROM group_seed WHERE name = 'Люди в серых масках'),
            'Человек в серой маске',
            'неизвестный',
            'Неизвестный. Его видели в тумане возле старой часовни.',
            'Член тайной группы. Проверяет, кто подходит для ритуала.',
            'Не вступает в бой без нужды. Сначала смотрит, кто испугается.',
            'Появился после разговора с Моррисом.',
            'Следит',
            'gm_only'
        )
    RETURNING npc_id, name
),
item_seed AS (
    INSERT INTO item (
        campaign_id,
        name,
        item_type,
        public_description,
        secret_description,
        notes,
        is_world_item,
        visibility
    )
    VALUES
        ((SELECT campaign_id FROM campaign_seed), 'Серебряный амулет', 'artifact', 'Холодный на ощупь. Слабо дрожит рядом с потусторонним.', NULL, 'Реагирует на ритуальную комнату.', TRUE, 'hidden_until_discovered'),
        ((SELECT campaign_id FROM campaign_seed), 'Флакон мутного зелья', 'potion', 'Осадок на дне двигается, если долго смотреть.', 'Сырой состав для зелья последовательности 9.', 'Опасно пить без подготовки.', TRUE, 'hidden_until_discovered'),
        ((SELECT campaign_id FROM campaign_seed), 'Старая карта района', 'clue', 'На карте отмечены подвалы, которых нет в городском плане.', NULL, 'Один ход ведёт к часовне.', TRUE, 'hidden_until_discovered'),
        ((SELECT campaign_id FROM campaign_seed), 'Запечатанное письмо', 'clue', 'На сургуче знак серой маски.', 'Внутри время встречи: полночь.', 'Лежит в нижнем ящике аптеки.', TRUE, 'hidden_until_discovered'),
        ((SELECT campaign_id FROM campaign_seed), 'Ритуальный нож', 'artifact', 'Лезвие чистое, но рукоять пахнет кровью.', 'Нож нужен для проверки носителя.', 'Не давать игрокам без последствий.', TRUE, 'gm_only')
    RETURNING item_id, name
),
campaign_inventory_seed AS (
    INSERT INTO inventory (campaign_id, owner_kind, campaign_owner_id, notes)
    VALUES ((SELECT campaign_id FROM campaign_seed), 'campaign', (SELECT campaign_id FROM campaign_seed), 'Предметы дела по Восточному району.')
    RETURNING inventory_id
),
inventory_entry_seed AS (
    INSERT INTO inventory_entry (inventory_id, item_id, quantity, notes, approval_status, approved_by_gm_user_id, approved_at)
    SELECT
        (SELECT inventory_id FROM campaign_inventory_seed),
        item_id,
        1,
        'Демо-предмет расследования.',
        'approved',
        (SELECT user_id FROM users_seed WHERE username = 'bogdan'),
        NOW()
    FROM item_seed
    RETURNING inventory_entry_id
),
tag_seed AS (
    INSERT INTO tag (campaign_id, name, color)
    VALUES
        ((SELECT campaign_id FROM campaign_seed), 'опасный NPC', '#B84A4A'),
        ((SELECT campaign_id FROM campaign_seed), 'тайное общество', '#8B5CF6'),
        ((SELECT campaign_id FROM campaign_seed), 'союзник', '#3BA55D'),
        ((SELECT campaign_id FROM campaign_seed), 'полиция', '#4F8FD6'),
        ((SELECT campaign_id FROM campaign_seed), 'информатор', '#D6A84F'),
        ((SELECT campaign_id FROM campaign_seed), 'мистическая угроза', '#B84A4A'),
        ((SELECT campaign_id FROM campaign_seed), 'улика', '#D6A84F')
    RETURNING tag_id, name
),
entity_tag_seed AS (
    INSERT INTO entity_tag (campaign_id, tag_id, entity_type, entity_id)
    VALUES
        ((SELECT campaign_id FROM campaign_seed), (SELECT tag_id FROM tag_seed WHERE name = 'опасный NPC'), 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Аптекарь Моррис')),
        ((SELECT campaign_id FROM campaign_seed), (SELECT tag_id FROM tag_seed WHERE name = 'тайное общество'), 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Аптекарь Моррис')),
        ((SELECT campaign_id FROM campaign_seed), (SELECT tag_id FROM tag_seed WHERE name = 'союзник'), 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Инспектор Грей')),
        ((SELECT campaign_id FROM campaign_seed), (SELECT tag_id FROM tag_seed WHERE name = 'полиция'), 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Инспектор Грей')),
        ((SELECT campaign_id FROM campaign_seed), (SELECT tag_id FROM tag_seed WHERE name = 'информатор'), 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Мадам Вирна')),
        ((SELECT campaign_id FROM campaign_seed), (SELECT tag_id FROM tag_seed WHERE name = 'тайное общество'), 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Человек в серой маске')),
        ((SELECT campaign_id FROM campaign_seed), (SELECT tag_id FROM tag_seed WHERE name = 'мистическая угроза'), 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Человек в серой маске')),
        ((SELECT campaign_id FROM campaign_seed), (SELECT tag_id FROM tag_seed WHERE name = 'улика'), 'item', (SELECT item_id FROM item_seed WHERE name = 'Запечатанное письмо')),
        ((SELECT campaign_id FROM campaign_seed), (SELECT tag_id FROM tag_seed WHERE name = 'улика'), 'item', (SELECT item_id FROM item_seed WHERE name = 'Старая карта района')),
        ((SELECT campaign_id FROM campaign_seed), (SELECT tag_id FROM tag_seed WHERE name = 'улика'), 'item', (SELECT item_id FROM item_seed WHERE name = 'Флакон мутного зелья'))
    RETURNING entity_tag_id
),
character_stat_seed AS (
    INSERT INTO character_stat (character_id, name, value, source_plugin_feature_id)
    VALUES
        ((SELECT character_id FROM character_seed WHERE name = 'Артур Вейн'), 'Последовательность', 9, (SELECT plugin_feature_id FROM plugin_feature_seed WHERE name = 'Последовательность 9')),
        ((SELECT character_id FROM character_seed WHERE name = 'Элиза Морроу'), 'Последовательность', 9, (SELECT plugin_feature_id FROM plugin_feature_seed WHERE name = 'Последовательность 9'))
    RETURNING character_stat_id
),
character_resource_seed AS (
    INSERT INTO character_resource (character_id, name, current_value, max_value, source_plugin_feature_id)
    VALUES
        ((SELECT character_id FROM character_seed WHERE name = 'Артур Вейн'), 'Духовность', 72, 100, (SELECT plugin_feature_id FROM plugin_feature_seed WHERE name = 'Духовность')),
        ((SELECT character_id FROM character_seed WHERE name = 'Артур Вейн'), 'Рассудок', 88, 100, (SELECT plugin_feature_id FROM plugin_feature_seed WHERE name = 'Рассудок')),
        ((SELECT character_id FROM character_seed WHERE name = 'Артур Вейн'), 'Усвоение', 45, 100, (SELECT plugin_feature_id FROM plugin_feature_seed WHERE name = 'Усвоение')),
        ((SELECT character_id FROM character_seed WHERE name = 'Артур Вейн'), 'Риск потери контроля', 18, 100, (SELECT plugin_feature_id FROM plugin_feature_seed WHERE name = 'Риск потери контроля')),
        ((SELECT character_id FROM character_seed WHERE name = 'Элиза Морроу'), 'Духовность', 64, 100, (SELECT plugin_feature_id FROM plugin_feature_seed WHERE name = 'Духовность')),
        ((SELECT character_id FROM character_seed WHERE name = 'Элиза Морроу'), 'Рассудок', 79, 100, (SELECT plugin_feature_id FROM plugin_feature_seed WHERE name = 'Рассудок')),
        ((SELECT character_id FROM character_seed WHERE name = 'Элиза Морроу'), 'Усвоение', 30, 100, (SELECT plugin_feature_id FROM plugin_feature_seed WHERE name = 'Усвоение')),
        ((SELECT character_id FROM character_seed WHERE name = 'Элиза Морроу'), 'Риск потери контроля', 22, 100, (SELECT plugin_feature_id FROM plugin_feature_seed WHERE name = 'Риск потери контроля'))
    RETURNING character_resource_id
),
character_ability_seed AS (
    INSERT INTO character_ability (character_id, ability_id, is_unlocked, uses_left, cooldown, metadata_json)
    VALUES
        ((SELECT character_id FROM character_seed WHERE name = 'Артур Вейн'), (SELECT ability_id FROM ability_seed WHERE name = 'Духовное зрение'), TRUE, 3, 0, '{"source":"Провидец"}'::JSONB),
        ((SELECT character_id FROM character_seed WHERE name = 'Артур Вейн'), (SELECT ability_id FROM ability_seed WHERE name = 'Гадание'), TRUE, 1, 0, '{"source":"Провидец"}'::JSONB),
        ((SELECT character_id FROM character_seed WHERE name = 'Артур Вейн'), (SELECT ability_id FROM ability_seed WHERE name = 'Интуиция опасности'), TRUE, NULL, 0, '{"source":"Провидец"}'::JSONB),
        ((SELECT character_id FROM character_seed WHERE name = 'Элиза Морроу'), (SELECT ability_id FROM ability_seed WHERE name = 'Ловкие руки'), TRUE, 4, 0, '{"source":"Мародёр"}'::JSONB),
        ((SELECT character_id FROM character_seed WHERE name = 'Элиза Морроу'), (SELECT ability_id FROM ability_seed WHERE name = 'Чутьё опасности'), TRUE, NULL, 0, '{"source":"Мародёр"}'::JSONB)
    RETURNING character_ability_id
),
investigation_seed AS (
    INSERT INTO investigation (campaign_id, name, description, status, visibility)
    VALUES (
        (SELECT campaign_id FROM campaign_seed),
        'Исчезновения в Восточном районе',
        'За две недели пропали шесть рабочих. Все перед исчезновением покупали лекарства у Морриса.',
        'open',
        'party_only'
    )
    RETURNING investigation_id
),
investigation_link_seed AS (
    INSERT INTO investigation_link (investigation_id, entity_type, entity_id, note, visibility)
    VALUES
        ((SELECT investigation_id FROM investigation_seed), 'item', (SELECT item_id FROM item_seed WHERE name = 'Запечатанное письмо'), 'Письмо указывает на встречу после полуночи.', 'party_only'),
        ((SELECT investigation_id FROM investigation_seed), 'item', (SELECT item_id FROM item_seed WHERE name = 'Старая карта района'), 'На карте есть подвалы у часовни.', 'party_only'),
        ((SELECT investigation_id FROM investigation_seed), 'item', (SELECT item_id FROM item_seed WHERE name = 'Флакон мутного зелья'), 'Пахнет травами из аптеки Морриса.', 'party_only'),
        ((SELECT investigation_id FROM investigation_seed), 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Мадам Вирна'), 'Видела серую маску у часовни.', 'gm_only')
    RETURNING investigation_id
),
session_log_seed AS (
    INSERT INTO session_log (
        campaign_id,
        title,
        summary_public,
        summary_private,
        session_date,
        created_by_user_id,
        visibility
    )
    VALUES (
        (SELECT campaign_id FROM campaign_seed),
        'Сессия 1 — След в тумане',
        'Группа прибыла в Восточный район, поговорила с инспектором Греем и вышла на аптеку Морриса.',
        'Моррис понял, что за ним следят. Ночью он попытается передать письмо человеку в серой маске.',
        CURRENT_DATE,
        (SELECT user_id FROM users_seed WHERE username = 'bogdan'),
        'party_only'
    )
    RETURNING session_log_id
),
session_event_seed AS (
    INSERT INTO session_event (
        session_log_id,
        campaign_id,
        event_type,
        title,
        description,
        related_entity_type,
        related_entity_id,
        visibility
    )
    VALUES
        ((SELECT session_log_id FROM session_log_seed), (SELECT campaign_id FROM campaign_seed), 'arrival', 'Персонажи прибыли в Восточный район.', 'Туман низкий, фонари горят жёлтым.', 'location', (SELECT location_id FROM location_seed WHERE name = 'Восточный район'), 'party_only'),
        ((SELECT session_log_id FROM session_log_seed), (SELECT campaign_id FROM campaign_seed), 'conversation', 'Инспектор Грей рассказал о пропавших рабочих.', 'Он показал список имён и быстро спрятал его обратно.', 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Инспектор Грей'), 'party_only'),
        ((SELECT session_log_id FROM session_log_seed), (SELECT campaign_id FROM campaign_seed), 'ability', 'Артур использовал духовное зрение в аптеке.', 'Следы тянулись к задней двери и вниз, к подвалу.', 'character', (SELECT character_id FROM character_seed WHERE name = 'Артур Вейн'), 'party_only'),
        ((SELECT session_log_id FROM session_log_seed), (SELECT campaign_id FROM campaign_seed), 'clue_found', 'Элиза нашла запечатанное письмо.', 'Серая печать была ещё мягкой.', 'item', (SELECT item_id FROM item_seed WHERE name = 'Запечатанное письмо'), 'party_only'),
        ((SELECT session_log_id FROM session_log_seed), (SELECT campaign_id FROM campaign_seed), 'sighting', 'В тумане появился человек в серой маске.', 'Он стоял у часовни и не двигался.', 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Человек в серой маске'), 'gm_only')
    RETURNING session_event_id
),
chat_seed AS (
    INSERT INTO campaign_chat (campaign_id, scene_id, name, chat_type)
    VALUES (
        (SELECT campaign_id FROM campaign_seed),
        (SELECT scene_id FROM scene_seed),
        'Сессия 1 — аптека Морриса',
        'session'
    )
    RETURNING chat_id
),
dice_roll_seed AS (
    INSERT INTO dice_roll (
        campaign_id,
        chat_id,
        scene_id,
        actor_user_id,
        actor_character_id,
        description,
        expression,
        dice_count,
        dice_type,
        modifier,
        visibility,
        result_total,
        result_details
    )
    VALUES
        (
            (SELECT campaign_id FROM campaign_seed),
            (SELECT chat_id FROM chat_seed),
            (SELECT scene_id FROM scene_seed),
            (SELECT user_id FROM users_seed WHERE username = 'dima'),
            (SELECT character_id FROM character_seed WHERE name = 'Артур Вейн'),
            'Осмотр следов у задней двери.',
            '1d20+3',
            1,
            20,
            3,
            'public',
            17,
            '{"rolls":[14],"modifier":3}'::JSONB
        ),
        (
            (SELECT campaign_id FROM campaign_seed),
            (SELECT chat_id FROM chat_seed),
            (SELECT scene_id FROM scene_seed),
            (SELECT user_id FROM users_seed WHERE username = 'alice'),
            (SELECT character_id FROM character_seed WHERE name = 'Элиза Морроу'),
            'Проверка странного осадка.',
            '1d100',
            1,
            100,
            0,
            'public',
            42,
            '{"rolls":[42],"modifier":0}'::JSONB
        )
    RETURNING roll_id, expression
),
chat_message_seed AS (
    INSERT INTO chat_message (
        chat_id,
        sender_user_id,
        sender_character_id,
        body,
        message_type,
        visibility,
        metadata_json,
        dice_roll_id
    )
    VALUES
        ((SELECT chat_id FROM chat_seed), (SELECT user_id FROM users_seed WHERE username = 'bogdan'), NULL, 'Туман стелется ниже фонарей. У аптеки Морриса мокрые следы ведут к задней двери.', 'text', 'party_only', '{}'::JSONB, NULL),
        ((SELECT chat_id FROM chat_seed), (SELECT user_id FROM users_seed WHERE username = 'dima'), (SELECT character_id FROM character_seed WHERE name = 'Артур Вейн'), 'Осматриваю дверь и пытаюсь понять, есть ли следы потустороннего.', 'action', 'party_only', '{}'::JSONB, NULL),
        ((SELECT chat_id FROM chat_seed), (SELECT user_id FROM users_seed WHERE username = 'bogdan'), NULL, 'Артур Вейн бросает 1d20+3: 17.', 'dice', 'public', '{"expression":"1d20+3","total":17}'::JSONB, (SELECT roll_id FROM dice_roll_seed WHERE expression = '1d20+3')),
        ((SELECT chat_id FROM chat_seed), (SELECT user_id FROM users_seed WHERE username = 'bogdan'), NULL, 'В духовном зрении следы темнеют у порога и уходят вниз.', 'text', 'party_only', '{}'::JSONB, NULL),
        ((SELECT chat_id FROM chat_seed), (SELECT user_id FROM users_seed WHERE username = 'alice'), (SELECT character_id FROM character_seed WHERE name = 'Элиза Морроу'), 'Пока он смотрит дверь, я проверю прилавок и ящики.', 'action', 'party_only', '{}'::JSONB, NULL),
        ((SELECT chat_id FROM chat_seed), (SELECT user_id FROM users_seed WHERE username = 'bogdan'), NULL, 'В нижнем ящике ты находишь письмо с серой печатью.', 'text', 'party_only', '{}'::JSONB, NULL),
        ((SELECT chat_id FROM chat_seed), (SELECT user_id FROM users_seed WHERE username = 'alice'), (SELECT character_id FROM character_seed WHERE name = 'Элиза Морроу'), 'Не открываю сразу. Сначала смотрю, свежий ли сургуч.', 'action', 'party_only', '{}'::JSONB, NULL),
        ((SELECT chat_id FROM chat_seed), (SELECT user_id FROM users_seed WHERE username = 'bogdan'), NULL, 'Элиза Морроу бросает 1d100: 42.', 'dice', 'public', '{"expression":"1d100","total":42}'::JSONB, (SELECT roll_id FROM dice_roll_seed WHERE expression = '1d100')),
        ((SELECT chat_id FROM chat_seed), (SELECT user_id FROM users_seed WHERE username = 'bogdan'), NULL, 'Сургуч мягкий. Письмо запечатали меньше часа назад.', 'text', 'party_only', '{}'::JSONB, NULL),
        ((SELECT chat_id FROM chat_seed), (SELECT user_id FROM users_seed WHERE username = 'bogdan'), NULL, 'За окном кто-то стоит в тумане. Серое лицо. Или маска.', 'text', 'party_only', '{}'::JSONB, NULL)
    RETURNING message_id
),
gm_note_seed AS (
    INSERT INTO gm_note (campaign_id, entity_type, entity_id, title, body, created_by_user_id, visibility)
    VALUES
        ((SELECT campaign_id FROM campaign_seed), 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Аптекарь Моррис'), 'Поведение Морриса', 'Если игроки давят на него, он нервничает и смотрит на дверь в подвал.', (SELECT user_id FROM users_seed WHERE username = 'bogdan'), 'gm_only'),
        ((SELECT campaign_id FROM campaign_seed), 'location', (SELECT location_id FROM location_seed WHERE name = 'Старая часовня'), 'Вход под алтарём', 'Вход под алтарём открывается только после полуночи.', (SELECT user_id FROM users_seed WHERE username = 'bogdan'), 'gm_only'),
        ((SELECT campaign_id FROM campaign_seed), 'investigation', (SELECT investigation_id FROM investigation_seed), 'Настоящая цель', 'Настоящая цель ритуала — найти подходящего носителя для зелья.', (SELECT user_id FROM users_seed WHERE username = 'bogdan'), 'gm_only')
    RETURNING gm_note_id
),
entity_relation_seed AS (
    INSERT INTO entity_relation (
        campaign_id,
        relation_kind,
        description,
        strength,
        value,
        visibility,
        source_entity_type,
        source_entity_id,
        target_entity_type,
        target_entity_id
    )
    VALUES
        ((SELECT campaign_id FROM campaign_seed), 'suspects', 'Артур подозревает Морриса.', -35, -35, 'party_only', 'character', (SELECT character_id FROM character_seed WHERE name = 'Артур Вейн'), 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Аптекарь Моррис')),
        ((SELECT campaign_id FROM campaign_seed), 'connected_to', 'Моррис связан с людьми в серых масках.', 70, 70, 'gm_only', 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Аптекарь Моррис'), 'faction_group', (SELECT group_id FROM group_seed WHERE name = 'Люди в серых масках')),
        ((SELECT campaign_id FROM campaign_seed), 'cautious_trust', 'Инспектор Грей осторожно доверяет персонажам.', 30, 30, 'party_only', 'npc', (SELECT npc_id FROM npc_seed WHERE name = 'Инспектор Грей'), 'character', (SELECT character_id FROM character_seed WHERE name = 'Артур Вейн')),
        ((SELECT campaign_id FROM campaign_seed), 'uses_location', 'Люди в серых масках используют старую часовню.', 80, 80, 'gm_only', 'faction_group', (SELECT group_id FROM group_seed WHERE name = 'Люди в серых масках'), 'location', (SELECT location_id FROM location_seed WHERE name = 'Старая часовня'))
    RETURNING relation_id
)
SELECT
    (SELECT campaign_id FROM campaign_seed) AS campaign_id,
    (SELECT COUNT(*) FROM users_seed) AS users_created,
    (SELECT COUNT(*) FROM character_seed) AS characters_created,
    (SELECT COUNT(*) FROM npc_seed) AS npcs_created,
    (SELECT COUNT(*) FROM item_seed) AS items_created,
    (SELECT COUNT(*) FROM location_seed) AS locations_created,
    (SELECT COUNT(*) FROM session_event_seed) AS session_events_created,
    (SELECT COUNT(*) FROM chat_message_seed) AS chat_messages_created;

COMMIT;
