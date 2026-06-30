BEGIN;

-- LoreForge architecture upgrade migration.
-- Apply after the existing dnd_campaign_schema.sql.
-- The migration keeps existing product logic and adds stronger domain boundaries.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility_scope') THEN
        CREATE DOMAIN visibility_scope AS TEXT
        CHECK (VALUE IN (
            'public',
            'party_only',
            'player_only',
            'gm_only',
            'hidden_until_discovered'
        ));
    END IF;
END $$;

-- 1. Common updated_at fields for editable entities.

ALTER TABLE campaign ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE campaign_member ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE location ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE scene ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE scene_mask ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE scene_player_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE faction_group ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE character ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE npc ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE scene_presence ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE player_npc_access ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE player_location_access ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE character_known_npc ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE character_known_location ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE attachment ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE attachment_access ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE scene_image ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE token ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE token_placement ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE item ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE inventory_entry ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE plugin ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE plugin_component ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE plugin_component ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE plugin_assignment ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE entity_relation ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE campaign_chat ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE dice_roll ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gm_request ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gm_request_effect ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE investigation ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE investigation_link ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE investigation_link ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Campaign lifecycle and cover.

ALTER TABLE campaign
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE campaign
    ADD COLUMN IF NOT EXISTS cover_attachment_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaign_status_check'
    ) THEN
        ALTER TABLE campaign
            ADD CONSTRAINT campaign_status_check
            CHECK (status IN ('draft', 'recruiting', 'active', 'paused', 'finished', 'archived'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaign_cover_attachment_fk'
    ) THEN
        ALTER TABLE campaign
            ADD CONSTRAINT campaign_cover_attachment_fk
            FOREIGN KEY (cover_attachment_id)
            REFERENCES attachment(attachment_id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Unified visibility fields.
-- Existing public_description/secret_description fields remain as content layers.
-- visibility defines default access to the entity as a whole.

ALTER TABLE npc ADD COLUMN IF NOT EXISTS visibility visibility_scope NOT NULL DEFAULT 'hidden_until_discovered';
ALTER TABLE location ADD COLUMN IF NOT EXISTS visibility visibility_scope NOT NULL DEFAULT 'hidden_until_discovered';
ALTER TABLE item ADD COLUMN IF NOT EXISTS visibility visibility_scope NOT NULL DEFAULT 'hidden_until_discovered';

ALTER TABLE attachment ADD COLUMN IF NOT EXISTS visibility visibility_scope;
UPDATE attachment
SET visibility = CASE WHEN is_public THEN 'public' ELSE 'gm_only' END
WHERE visibility IS NULL;
ALTER TABLE attachment ALTER COLUMN visibility SET DEFAULT 'gm_only';
ALTER TABLE attachment ALTER COLUMN visibility SET NOT NULL;

ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS visibility visibility_scope NOT NULL DEFAULT 'party_only';
ALTER TABLE entity_relation ADD COLUMN IF NOT EXISTS visibility visibility_scope NOT NULL DEFAULT 'gm_only';
ALTER TABLE investigation ADD COLUMN IF NOT EXISTS visibility visibility_scope NOT NULL DEFAULT 'party_only';
ALTER TABLE investigation_link ADD COLUMN IF NOT EXISTS visibility visibility_scope NOT NULL DEFAULT 'gm_only';
ALTER TABLE scene_presence ADD COLUMN IF NOT EXISTS visibility visibility_scope NOT NULL DEFAULT 'party_only';
ALTER TABLE scene_image ADD COLUMN IF NOT EXISTS visibility visibility_scope NOT NULL DEFAULT 'party_only';
ALTER TABLE token_placement ADD COLUMN IF NOT EXISTS visibility visibility_scope NOT NULL DEFAULT 'party_only';

-- Replace dice_roll's older private visibility with player_only, then expand allowed values.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dice_roll_visibility_check'
    ) THEN
        ALTER TABLE dice_roll DROP CONSTRAINT dice_roll_visibility_check;
    END IF;
END $$;

UPDATE dice_roll SET visibility = 'player_only' WHERE visibility = 'private';

ALTER TABLE dice_roll
    ALTER COLUMN visibility SET DEFAULT 'public';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dice_roll_visibility_scope_check'
    ) THEN
        ALTER TABLE dice_roll
            ADD CONSTRAINT dice_roll_visibility_scope_check
            CHECK (visibility IN ('public', 'party_only', 'player_only', 'gm_only', 'hidden_until_discovered'));
    END IF;
END $$;

-- 4. Session journal.

CREATE TABLE IF NOT EXISTS session_log (
    session_log_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary_public TEXT,
    summary_private TEXT,
    session_date DATE,
    created_by_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    visibility visibility_scope NOT NULL DEFAULT 'party_only',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_event (
    session_event_id BIGSERIAL PRIMARY KEY,
    session_log_id BIGINT NOT NULL REFERENCES session_log(session_log_id) ON DELETE CASCADE,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    related_entity_type TEXT,
    related_entity_id BIGINT,
    visibility visibility_scope NOT NULL DEFAULT 'party_only',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Target plugin architecture.
-- Existing plugin/plugin_component/plugin_assignment stay for migration compatibility.

CREATE TABLE IF NOT EXISTS world_plugin (
    world_plugin_id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('system', 'custom')),
    created_by_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plugin_feature (
    plugin_feature_id BIGSERIAL PRIMARY KEY,
    world_plugin_id BIGINT NOT NULL REFERENCES world_plugin(world_plugin_id) ON DELETE CASCADE,
    feature_type TEXT NOT NULL CHECK (
        feature_type IN (
            'stat',
            'resource',
            'class',
            'pathway',
            'sequence',
            'ability',
            'state',
            'item_type',
            'potion',
            'ritual',
            'artifact',
            'organization',
            'rule',
            'risk'
        )
    ),
    name TEXT NOT NULL,
    description TEXT,
    config_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (world_plugin_id, feature_type, name)
);

CREATE TABLE IF NOT EXISTS campaign_plugin (
    campaign_plugin_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    world_plugin_id BIGINT NOT NULL REFERENCES world_plugin(world_plugin_id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    config_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, world_plugin_id)
);

-- Optional bridge from legacy campaign-level plugin rows to the new feature model.
ALTER TABLE plugin ADD COLUMN IF NOT EXISTS source_plugin_feature_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'plugin_source_plugin_feature_fk'
    ) THEN
        ALTER TABLE plugin
            ADD CONSTRAINT plugin_source_plugin_feature_fk
            FOREIGN KEY (source_plugin_feature_id)
            REFERENCES plugin_feature(plugin_feature_id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Character stats and resources.

CREATE TABLE IF NOT EXISTS character_stat (
    character_stat_id BIGSERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL REFERENCES character(character_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value NUMERIC(14, 4) NOT NULL DEFAULT 0,
    source_plugin_feature_id BIGINT REFERENCES plugin_feature(plugin_feature_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (character_id, name)
);

CREATE TABLE IF NOT EXISTS character_resource (
    character_resource_id BIGSERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL REFERENCES character(character_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    current_value NUMERIC(14, 4) NOT NULL DEFAULT 0,
    max_value NUMERIC(14, 4),
    source_plugin_feature_id BIGINT REFERENCES plugin_feature(plugin_feature_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (character_id, name)
);

-- 7. Abilities.

CREATE TABLE IF NOT EXISTS ability (
    ability_id BIGSERIAL PRIMARY KEY,
    world_plugin_id BIGINT NOT NULL REFERENCES world_plugin(world_plugin_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    ability_type TEXT NOT NULL DEFAULT 'active' CHECK (ability_type IN ('active', 'passive', 'reaction', 'ritual')),
    resource_cost_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    risk_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    config_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (world_plugin_id, name)
);

CREATE TABLE IF NOT EXISTS character_ability (
    character_ability_id BIGSERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL REFERENCES character(character_id) ON DELETE CASCADE,
    ability_id BIGINT NOT NULL REFERENCES ability(ability_id) ON DELETE CASCADE,
    is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    uses_left INTEGER,
    cooldown INTEGER,
    metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (character_id, ability_id)
);

-- 8. Campaign invites and richer roles.

CREATE TABLE IF NOT EXISTS campaign_invite (
    campaign_invite_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    invited_email TEXT,
    invited_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    invite_token TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('owner', 'gm', 'co_gm', 'player', 'viewer')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT campaign_invite_target_present CHECK (
        invited_email IS NOT NULL OR invited_user_id IS NOT NULL
    )
);

-- Keep current campaign_member.role compatible, then expand the allowed product roles.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaign_member_role_check'
    ) THEN
        ALTER TABLE campaign_member DROP CONSTRAINT campaign_member_role_check;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaign_member_role_v2_check'
    ) THEN
        ALTER TABLE campaign_member
            ADD CONSTRAINT campaign_member_role_v2_check
            CHECK (role IN ('owner', 'gm', 'co_gm', 'player', 'viewer'));
    END IF;
END $$;

-- 9. Chat messages and dice rendering.

ALTER TABLE chat_message
    ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';

ALTER TABLE chat_message
    ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE chat_message
    ADD COLUMN IF NOT EXISTS dice_roll_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chat_message_type_check'
    ) THEN
        ALTER TABLE chat_message
            ADD CONSTRAINT chat_message_type_check
            CHECK (message_type IN ('text', 'system', 'dice', 'action', 'gm_note'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chat_message_dice_roll_fk'
    ) THEN
        ALTER TABLE chat_message
            ADD CONSTRAINT chat_message_dice_roll_fk
            FOREIGN KEY (dice_roll_id)
            REFERENCES dice_roll(roll_id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 10. GM notes.

CREATE TABLE IF NOT EXISTS gm_note (
    gm_note_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    entity_type TEXT,
    entity_id BIGINT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_by_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    visibility visibility_scope NOT NULL DEFAULT 'gm_only',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Tags.

CREATE TABLE IF NOT EXISTS tag (
    tag_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, name)
);

CREATE TABLE IF NOT EXISTS entity_tag (
    entity_tag_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tag(tag_id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, tag_id, entity_type, entity_id)
);

-- 12. Polymorphic investigation links.
-- Existing npc_id/location_id/group_id columns remain for backward compatibility.

ALTER TABLE investigation_link ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE investigation_link ADD COLUMN IF NOT EXISTS entity_id BIGINT;

UPDATE investigation_link
SET
    entity_type = CASE
        WHEN npc_id IS NOT NULL THEN 'npc'
        WHEN location_id IS NOT NULL THEN 'location'
        WHEN group_id IS NOT NULL THEN 'faction_group'
        ELSE entity_type
    END,
    entity_id = CASE
        WHEN npc_id IS NOT NULL THEN npc_id
        WHEN location_id IS NOT NULL THEN location_id
        WHEN group_id IS NOT NULL THEN group_id
        ELSE entity_id
    END
WHERE entity_type IS NULL OR entity_id IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'investigation_link_target_present'
    ) THEN
        ALTER TABLE investigation_link DROP CONSTRAINT investigation_link_target_present;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'investigation_link_entity_present'
    ) THEN
        ALTER TABLE investigation_link
            ADD CONSTRAINT investigation_link_entity_present
            CHECK (
                (entity_type IS NOT NULL AND entity_id IS NOT NULL)
                OR npc_id IS NOT NULL
                OR location_id IS NOT NULL
                OR group_id IS NOT NULL
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'investigation_link_entity_type_check'
    ) THEN
        ALTER TABLE investigation_link
            ADD CONSTRAINT investigation_link_entity_type_check
            CHECK (
                entity_type IS NULL OR entity_type IN (
                    'character',
                    'npc',
                    'location',
                    'item',
                    'scene',
                    'attachment',
                    'faction_group',
                    'entity_relation',
                    'session_event'
                )
            );
    END IF;
END $$;

-- 13. Polymorphic entity relations.
-- Existing source_* and target_* columns remain for compatibility.

ALTER TABLE entity_relation ADD COLUMN IF NOT EXISTS source_entity_type TEXT;
ALTER TABLE entity_relation ADD COLUMN IF NOT EXISTS source_entity_id BIGINT;
ALTER TABLE entity_relation ADD COLUMN IF NOT EXISTS target_entity_type TEXT;
ALTER TABLE entity_relation ADD COLUMN IF NOT EXISTS target_entity_id BIGINT;
ALTER TABLE entity_relation ADD COLUMN IF NOT EXISTS value SMALLINT;

ALTER TABLE entity_relation ALTER COLUMN source_kind DROP NOT NULL;
ALTER TABLE entity_relation ALTER COLUMN target_kind DROP NOT NULL;

UPDATE entity_relation
SET
    source_entity_type = CASE
        WHEN source_character_id IS NOT NULL THEN 'character'
        WHEN source_npc_id IS NOT NULL THEN 'npc'
        WHEN source_group_id IS NOT NULL THEN 'faction_group'
        ELSE source_entity_type
    END,
    source_entity_id = CASE
        WHEN source_character_id IS NOT NULL THEN source_character_id
        WHEN source_npc_id IS NOT NULL THEN source_npc_id
        WHEN source_group_id IS NOT NULL THEN source_group_id
        ELSE source_entity_id
    END,
    target_entity_type = CASE
        WHEN target_character_id IS NOT NULL THEN 'character'
        WHEN target_npc_id IS NOT NULL THEN 'npc'
        WHEN target_group_id IS NOT NULL THEN 'faction_group'
        ELSE target_entity_type
    END,
    target_entity_id = CASE
        WHEN target_character_id IS NOT NULL THEN target_character_id
        WHEN target_npc_id IS NOT NULL THEN target_npc_id
        WHEN target_group_id IS NOT NULL THEN target_group_id
        ELSE target_entity_id
    END,
    value = COALESCE(value, strength)
WHERE source_entity_type IS NULL
   OR source_entity_id IS NULL
   OR target_entity_type IS NULL
   OR target_entity_id IS NULL
   OR value IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'entity_relation_source_kind_check'
    ) THEN
        ALTER TABLE entity_relation DROP CONSTRAINT entity_relation_source_kind_check;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'entity_relation_target_kind_check'
    ) THEN
        ALTER TABLE entity_relation DROP CONSTRAINT entity_relation_target_kind_check;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'relation_source_exactly_one'
    ) THEN
        ALTER TABLE entity_relation DROP CONSTRAINT relation_source_exactly_one;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'relation_target_exactly_one'
    ) THEN
        ALTER TABLE entity_relation DROP CONSTRAINT relation_target_exactly_one;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'relation_source_kind_match'
    ) THEN
        ALTER TABLE entity_relation DROP CONSTRAINT relation_source_kind_match;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'relation_target_kind_match'
    ) THEN
        ALTER TABLE entity_relation DROP CONSTRAINT relation_target_kind_match;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'entity_relation_poly_source_present'
    ) THEN
        ALTER TABLE entity_relation
            ADD CONSTRAINT entity_relation_poly_source_present
            CHECK (source_entity_type IS NOT NULL AND source_entity_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'entity_relation_poly_target_present'
    ) THEN
        ALTER TABLE entity_relation
            ADD CONSTRAINT entity_relation_poly_target_present
            CHECK (target_entity_type IS NOT NULL AND target_entity_id IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'entity_relation_poly_type_check'
    ) THEN
        ALTER TABLE entity_relation
            ADD CONSTRAINT entity_relation_poly_type_check
            CHECK (
                source_entity_type IN ('character', 'npc', 'faction_group', 'location', 'item', 'investigation')
                AND target_entity_type IN ('character', 'npc', 'faction_group', 'location', 'item', 'investigation')
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'entity_relation_value_check'
    ) THEN
        ALTER TABLE entity_relation
            ADD CONSTRAINT entity_relation_value_check
            CHECK (value IS NULL OR value BETWEEN -100 AND 100);
    END IF;
END $$;

-- 14. Audit log.

CREATE TABLE IF NOT EXISTS audit_log (
    audit_log_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id BIGINT,
    before_json JSONB,
    after_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Indexes for new access patterns.

CREATE INDEX IF NOT EXISTS idx_campaign_status ON campaign(status);
CREATE INDEX IF NOT EXISTS idx_campaign_cover_attachment_id ON campaign(cover_attachment_id);
CREATE INDEX IF NOT EXISTS idx_campaign_member_campaign_role ON campaign_member(campaign_id, role);

CREATE INDEX IF NOT EXISTS idx_npc_campaign_visibility ON npc(campaign_id, visibility);
CREATE INDEX IF NOT EXISTS idx_location_campaign_visibility ON location(campaign_id, visibility);
CREATE INDEX IF NOT EXISTS idx_item_campaign_visibility ON item(campaign_id, visibility);
CREATE INDEX IF NOT EXISTS idx_attachment_campaign_visibility ON attachment(campaign_id, visibility);
CREATE INDEX IF NOT EXISTS idx_chat_message_visibility ON chat_message(visibility, created_at);
CREATE INDEX IF NOT EXISTS idx_dice_roll_visibility ON dice_roll(visibility, created_at);
CREATE INDEX IF NOT EXISTS idx_entity_relation_visibility ON entity_relation(campaign_id, visibility);
CREATE INDEX IF NOT EXISTS idx_investigation_visibility ON investigation(campaign_id, visibility);
CREATE INDEX IF NOT EXISTS idx_investigation_link_visibility ON investigation_link(visibility);

CREATE INDEX IF NOT EXISTS idx_session_log_campaign_id ON session_log(campaign_id, session_date);
CREATE INDEX IF NOT EXISTS idx_session_log_created_by_user_id ON session_log(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_session_log_visibility ON session_log(campaign_id, visibility);
CREATE INDEX IF NOT EXISTS idx_session_event_session_log_id ON session_event(session_log_id, created_at);
CREATE INDEX IF NOT EXISTS idx_session_event_campaign_id ON session_event(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_session_event_related_entity ON session_event(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_session_event_visibility ON session_event(campaign_id, visibility);

CREATE INDEX IF NOT EXISTS idx_world_plugin_slug ON world_plugin(slug);
CREATE INDEX IF NOT EXISTS idx_plugin_feature_world_plugin_id ON plugin_feature(world_plugin_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_campaign_plugin_campaign_id ON campaign_plugin(campaign_id, is_active);
CREATE INDEX IF NOT EXISTS idx_campaign_plugin_world_plugin_id ON campaign_plugin(world_plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_source_plugin_feature_id ON plugin(source_plugin_feature_id);

CREATE INDEX IF NOT EXISTS idx_character_stat_character_id ON character_stat(character_id);
CREATE INDEX IF NOT EXISTS idx_character_stat_source_plugin_feature_id ON character_stat(source_plugin_feature_id);
CREATE INDEX IF NOT EXISTS idx_character_resource_character_id ON character_resource(character_id);
CREATE INDEX IF NOT EXISTS idx_character_resource_source_plugin_feature_id ON character_resource(source_plugin_feature_id);

CREATE INDEX IF NOT EXISTS idx_ability_world_plugin_id ON ability(world_plugin_id);
CREATE INDEX IF NOT EXISTS idx_character_ability_character_id ON character_ability(character_id);
CREATE INDEX IF NOT EXISTS idx_character_ability_ability_id ON character_ability(ability_id);

CREATE INDEX IF NOT EXISTS idx_campaign_invite_campaign_status ON campaign_invite(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_invite_invited_user_id ON campaign_invite(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_invite_invited_email ON campaign_invite(invited_email);
CREATE INDEX IF NOT EXISTS idx_campaign_invite_expires_at ON campaign_invite(expires_at);

CREATE INDEX IF NOT EXISTS idx_chat_message_dice_roll_id ON chat_message(dice_roll_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_type ON chat_message(chat_id, message_type, created_at);

CREATE INDEX IF NOT EXISTS idx_gm_note_campaign_id ON gm_note(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gm_note_entity ON gm_note(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gm_note_visibility ON gm_note(campaign_id, visibility);

CREATE INDEX IF NOT EXISTS idx_tag_campaign_id ON tag(campaign_id);
CREATE INDEX IF NOT EXISTS idx_entity_tag_campaign_entity ON entity_tag(campaign_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tag_tag_id ON entity_tag(tag_id);

CREATE INDEX IF NOT EXISTS idx_investigation_link_entity ON investigation_link(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relation_source_entity ON entity_relation(source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relation_target_entity ON entity_relation(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relation_campaign_created ON entity_relation(campaign_id, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_log_campaign_created ON audit_log(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

COMMIT;
