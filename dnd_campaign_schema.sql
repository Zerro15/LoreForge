BEGIN;

CREATE TABLE IF NOT EXISTS app_user (
    user_id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE,
    display_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profile (
    user_id BIGINT PRIMARY KEY REFERENCES app_user(user_id) ON DELETE CASCADE,
    full_name TEXT,
    bio TEXT,
    locale TEXT,
    timezone TEXT,
    preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_account (
    auth_account_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES app_user(user_id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_session (
    auth_session_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    session_token_hash TEXT NOT NULL UNIQUE,
    refresh_token_hash TEXT UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification_token (
    email_verification_token_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_token (
    password_reset_token_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign (
    campaign_id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    setting_name TEXT,
    description TEXT,
    gm_user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
    public_journal TEXT,
    gm_journal TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, gm_user_id)
);

CREATE TABLE IF NOT EXISTS campaign_member (
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('gm', 'player')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (campaign_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_one_gm
    ON campaign_member(campaign_id)
    WHERE role = 'gm';

CREATE TABLE IF NOT EXISTS location (
    location_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    parent_location_id BIGINT REFERENCES location(location_id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    location_type TEXT,
    public_description TEXT,
    secret_description TEXT,
    state_text TEXT,
    map_url TEXT,
    grid_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    grid_cell_size NUMERIC(10, 2) NOT NULL DEFAULT 1,
    grid_offset_x NUMERIC(10, 2) NOT NULL DEFAULT 0,
    grid_offset_y NUMERIC(10, 2) NOT NULL DEFAULT 0,
    grid_color TEXT,
    grid_opacity NUMERIC(4, 3) CHECK (grid_opacity IS NULL OR (grid_opacity >= 0 AND grid_opacity <= 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, name)
);

CREATE TABLE IF NOT EXISTS scene (
    scene_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    location_id BIGINT NOT NULL REFERENCES location(location_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scene_type TEXT,
    public_description TEXT,
    gm_description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (location_id, name)
);

CREATE TABLE IF NOT EXISTS scene_mask (
    scene_mask_id BIGSERIAL PRIMARY KEY,
    scene_id BIGINT NOT NULL REFERENCES scene(scene_id) ON DELETE CASCADE,
    mask_type TEXT NOT NULL CHECK (mask_type IN ('hidden', 'unknown', 'fog')),
    geometry JSONB NOT NULL DEFAULT '{}'::JSONB,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scene_player_state (
    scene_id BIGINT NOT NULL REFERENCES scene(scene_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    familiarity_state TEXT NOT NULL DEFAULT 'unknown' CHECK (familiarity_state IN ('unknown', 'known')),
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    note TEXT,
    PRIMARY KEY (scene_id, user_id)
);

CREATE TABLE IF NOT EXISTS faction_group (
    group_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    group_type TEXT NOT NULL DEFAULT 'group',
    public_description TEXT,
    secret_description TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, name)
);

CREATE TABLE IF NOT EXISTS character (
    character_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    owner_user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
    current_location_id BIGINT REFERENCES location(location_id) ON DELETE SET NULL,
    current_scene_id BIGINT REFERENCES scene(scene_id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    public_description TEXT,
    secret_description TEXT,
    notes TEXT,
    status_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, name)
);

CREATE TABLE IF NOT EXISTS npc (
    npc_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    group_id BIGINT REFERENCES faction_group(group_id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    title TEXT,
    public_description TEXT,
    secret_description TEXT,
    gm_secrets TEXT,
    campaign_journal TEXT,
    status_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, name)
);

CREATE TABLE IF NOT EXISTS scene_presence (
    scene_presence_id BIGSERIAL PRIMARY KEY,
    scene_id BIGINT NOT NULL REFERENCES scene(scene_id) ON DELETE CASCADE,
    entity_kind TEXT NOT NULL CHECK (entity_kind IN ('character', 'npc', 'group')),
    character_id BIGINT REFERENCES character(character_id) ON DELETE CASCADE,
    npc_id BIGINT REFERENCES npc(npc_id) ON DELETE CASCADE,
    group_id BIGINT REFERENCES faction_group(group_id) ON DELETE CASCADE,
    x NUMERIC(10, 2),
    y NUMERIC(10, 2),
    z NUMERIC(10, 2),
    placement JSONB NOT NULL DEFAULT '{}'::JSONB,
    note TEXT,
    is_visible_to_players BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT scene_presence_exactly_one CHECK (
        (CASE WHEN character_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN npc_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN group_id IS NULL THEN 0 ELSE 1 END) = 1
    ),
    CONSTRAINT scene_presence_kind_match CHECK (
        (entity_kind = 'character' AND character_id IS NOT NULL AND npc_id IS NULL AND group_id IS NULL) OR
        (entity_kind = 'npc' AND npc_id IS NOT NULL AND character_id IS NULL AND group_id IS NULL) OR
        (entity_kind = 'group' AND group_id IS NOT NULL AND character_id IS NULL AND npc_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS player_npc_access (
    user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    npc_id BIGINT NOT NULL REFERENCES npc(npc_id) ON DELETE CASCADE,
    note TEXT,
    PRIMARY KEY (user_id, npc_id)
);

CREATE TABLE IF NOT EXISTS player_location_access (
    user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    location_id BIGINT NOT NULL REFERENCES location(location_id) ON DELETE CASCADE,
    note TEXT,
    PRIMARY KEY (user_id, location_id)
);

CREATE TABLE IF NOT EXISTS character_known_npc (
    character_id BIGINT NOT NULL REFERENCES character(character_id) ON DELETE CASCADE,
    npc_id BIGINT NOT NULL REFERENCES npc(npc_id) ON DELETE CASCADE,
    note TEXT,
    PRIMARY KEY (character_id, npc_id)
);

CREATE TABLE IF NOT EXISTS character_known_location (
    character_id BIGINT NOT NULL REFERENCES character(character_id) ON DELETE CASCADE,
    location_id BIGINT NOT NULL REFERENCES location(location_id) ON DELETE CASCADE,
    note TEXT,
    PRIMARY KEY (character_id, location_id)
);

CREATE TABLE IF NOT EXISTS attachment (
    attachment_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    owner_user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
    filename TEXT NOT NULL,
    mime_type TEXT,
    file_size_bytes BIGINT,
    storage_kind TEXT NOT NULL DEFAULT 'db' CHECK (storage_kind IN ('db')),
    content BYTEA,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attachment_access (
    attachment_id BIGINT NOT NULL REFERENCES attachment(attachment_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    granted_by_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (attachment_id, user_id)
);

CREATE TABLE IF NOT EXISTS scene_image (
    scene_image_id BIGSERIAL PRIMARY KEY,
    scene_id BIGINT NOT NULL REFERENCES scene(scene_id) ON DELETE CASCADE,
    attachment_id BIGINT NOT NULL REFERENCES attachment(attachment_id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    x NUMERIC(10, 2) NOT NULL DEFAULT 0,
    y NUMERIC(10, 2) NOT NULL DEFAULT 0,
    width NUMERIC(10, 2),
    height NUMERIC(10, 2),
    rotation_degrees NUMERIC(8, 2) NOT NULL DEFAULT 0,
    z_index INTEGER NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    edit_state JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS token (
    token_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    character_id BIGINT NOT NULL REFERENCES character(character_id) ON DELETE CASCADE,
    owner_user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    width_cells NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (width_cells > 0),
    height_cells NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (height_cells > 0),
    image_attachment_id BIGINT REFERENCES attachment(attachment_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS token_placement (
    token_placement_id BIGSERIAL PRIMARY KEY,
    token_id BIGINT NOT NULL REFERENCES token(token_id) ON DELETE CASCADE,
    scene_id BIGINT NOT NULL REFERENCES scene(scene_id) ON DELETE CASCADE,
    x NUMERIC(10, 2) NOT NULL DEFAULT 0,
    y NUMERIC(10, 2) NOT NULL DEFAULT 0,
    width_cells NUMERIC(10, 2) CHECK (width_cells IS NULL OR width_cells > 0),
    height_cells NUMERIC(10, 2) CHECK (height_cells IS NULL OR height_cells > 0),
    rotation_degrees NUMERIC(8, 2) NOT NULL DEFAULT 0,
    z_index INTEGER NOT NULL DEFAULT 0,
    is_visible_to_players BOOLEAN NOT NULL DEFAULT TRUE,
    placement JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (token_id, scene_id)
);

CREATE TABLE IF NOT EXISTS item (
    item_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'generic',
    public_description TEXT,
    secret_description TEXT,
    notes TEXT,
    is_world_item BOOLEAN NOT NULL DEFAULT FALSE,
    gm_can_activate_plugins BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, name)
);

CREATE TABLE IF NOT EXISTS inventory (
    inventory_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    owner_kind TEXT NOT NULL CHECK (owner_kind IN ('character', 'npc', 'location', 'campaign')),
    character_id BIGINT REFERENCES character(character_id) ON DELETE CASCADE,
    npc_id BIGINT REFERENCES npc(npc_id) ON DELETE CASCADE,
    location_id BIGINT REFERENCES location(location_id) ON DELETE CASCADE,
    campaign_owner_id BIGINT REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inventory_owner_exactly_one CHECK (
        (CASE WHEN character_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN npc_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN location_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN campaign_owner_id IS NULL THEN 0 ELSE 1 END) = 1
    ),
    CONSTRAINT inventory_owner_kind_match CHECK (
        (owner_kind = 'character' AND character_id IS NOT NULL AND npc_id IS NULL AND location_id IS NULL AND campaign_owner_id IS NULL) OR
        (owner_kind = 'npc' AND npc_id IS NOT NULL AND character_id IS NULL AND location_id IS NULL AND campaign_owner_id IS NULL) OR
        (owner_kind = 'location' AND location_id IS NOT NULL AND character_id IS NULL AND npc_id IS NULL AND campaign_owner_id IS NULL) OR
        (owner_kind = 'campaign' AND campaign_owner_id IS NOT NULL AND character_id IS NULL AND npc_id IS NULL AND location_id IS NULL)
    ),
    UNIQUE NULLS NOT DISTINCT (character_id),
    UNIQUE NULLS NOT DISTINCT (npc_id),
    UNIQUE NULLS NOT DISTINCT (location_id),
    UNIQUE NULLS NOT DISTINCT (campaign_owner_id)
);

CREATE TABLE IF NOT EXISTS inventory_entry (
    inventory_entry_id BIGSERIAL PRIMARY KEY,
    inventory_id BIGINT NOT NULL REFERENCES inventory(inventory_id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES item(item_id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    notes TEXT,
    approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    requested_by_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    approved_by_gm_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    UNIQUE (inventory_id, item_id)
);

CREATE TABLE IF NOT EXISTS plugin (
    plugin_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    plugin_type TEXT NOT NULL CHECK (
        plugin_type IN (
            'state',
            'stat',
            'ability',
            'proficiency_bonus',
            'description',
            'credit',
            'mixed',
            'other'
        )
    ),
    description TEXT,
    is_hidden_from_other_players BOOLEAN NOT NULL DEFAULT TRUE,
    is_visible_to_owner BOOLEAN NOT NULL DEFAULT TRUE,
    is_always_visible_to_gm BOOLEAN NOT NULL DEFAULT TRUE,
    gm_interaction_only BOOLEAN NOT NULL DEFAULT FALSE,
    gm_can_edit BOOLEAN NOT NULL DEFAULT TRUE,
    gm_can_delete BOOLEAN NOT NULL DEFAULT TRUE,
    gm_can_add BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_by_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, name)
);

CREATE TABLE IF NOT EXISTS plugin_component (
    parent_plugin_id BIGINT NOT NULL REFERENCES plugin(plugin_id) ON DELETE CASCADE,
    child_plugin_id BIGINT NOT NULL REFERENCES plugin(plugin_id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    PRIMARY KEY (parent_plugin_id, child_plugin_id),
    CONSTRAINT plugin_component_no_self_ref CHECK (parent_plugin_id <> child_plugin_id)
);

CREATE TABLE IF NOT EXISTS plugin_assignment (
    assignment_id BIGSERIAL PRIMARY KEY,
    plugin_id BIGINT NOT NULL REFERENCES plugin(plugin_id) ON DELETE CASCADE,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    owner_kind TEXT NOT NULL CHECK (owner_kind IN ('character', 'npc', 'item', 'campaign')),
    character_id BIGINT REFERENCES character(character_id) ON DELETE CASCADE,
    npc_id BIGINT REFERENCES npc(npc_id) ON DELETE CASCADE,
    item_id BIGINT REFERENCES item(item_id) ON DELETE CASCADE,
    campaign_owner_id BIGINT REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    activated_by_gm_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    requested_by_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    approved_by_gm_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT plugin_assignment_exactly_one CHECK (
        (CASE WHEN character_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN npc_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN item_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN campaign_owner_id IS NULL THEN 0 ELSE 1 END) = 1
    ),
    CONSTRAINT plugin_assignment_kind_match CHECK (
        (owner_kind = 'character' AND character_id IS NOT NULL AND npc_id IS NULL AND item_id IS NULL AND campaign_owner_id IS NULL) OR
        (owner_kind = 'npc' AND npc_id IS NOT NULL AND character_id IS NULL AND item_id IS NULL AND campaign_owner_id IS NULL) OR
        (owner_kind = 'item' AND item_id IS NOT NULL AND character_id IS NULL AND npc_id IS NULL AND campaign_owner_id IS NULL) OR
        (owner_kind = 'campaign' AND campaign_owner_id IS NOT NULL AND character_id IS NULL AND npc_id IS NULL AND item_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS entity_relation (
    relation_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    source_kind TEXT NOT NULL CHECK (source_kind IN ('character', 'npc', 'group')),
    source_character_id BIGINT REFERENCES character(character_id) ON DELETE CASCADE,
    source_npc_id BIGINT REFERENCES npc(npc_id) ON DELETE CASCADE,
    source_group_id BIGINT REFERENCES faction_group(group_id) ON DELETE CASCADE,
    target_kind TEXT NOT NULL CHECK (target_kind IN ('character', 'npc', 'group')),
    target_character_id BIGINT REFERENCES character(character_id) ON DELETE CASCADE,
    target_npc_id BIGINT REFERENCES npc(npc_id) ON DELETE CASCADE,
    target_group_id BIGINT REFERENCES faction_group(group_id) ON DELETE CASCADE,
    strength SMALLINT CHECK (strength BETWEEN -100 AND 100),
    relation_kind TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT relation_source_exactly_one CHECK (
        (CASE WHEN source_character_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN source_npc_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN source_group_id IS NULL THEN 0 ELSE 1 END) = 1
    ),
    CONSTRAINT relation_target_exactly_one CHECK (
        (CASE WHEN target_character_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN target_npc_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN target_group_id IS NULL THEN 0 ELSE 1 END) = 1
    ),
    CONSTRAINT relation_source_kind_match CHECK (
        (source_kind = 'character' AND source_character_id IS NOT NULL AND source_npc_id IS NULL AND source_group_id IS NULL) OR
        (source_kind = 'npc' AND source_npc_id IS NOT NULL AND source_character_id IS NULL AND source_group_id IS NULL) OR
        (source_kind = 'group' AND source_group_id IS NOT NULL AND source_character_id IS NULL AND source_npc_id IS NULL)
    ),
    CONSTRAINT relation_target_kind_match CHECK (
        (target_kind = 'character' AND target_character_id IS NOT NULL AND target_npc_id IS NULL AND target_group_id IS NULL) OR
        (target_kind = 'npc' AND target_npc_id IS NOT NULL AND target_character_id IS NULL AND target_group_id IS NULL) OR
        (target_kind = 'group' AND target_group_id IS NOT NULL AND target_character_id IS NULL AND target_npc_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS campaign_chat (
    chat_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    scene_id BIGINT REFERENCES scene(scene_id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    chat_type TEXT NOT NULL DEFAULT 'campaign',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, name)
);

CREATE TABLE IF NOT EXISTS chat_message (
    message_id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES campaign_chat(chat_id) ON DELETE CASCADE,
    sender_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    sender_character_id BIGINT REFERENCES character(character_id) ON DELETE SET NULL,
    sender_npc_id BIGINT REFERENCES npc(npc_id) ON DELETE SET NULL,
    parent_message_id BIGINT REFERENCES chat_message(message_id) ON DELETE SET NULL,
    attachment_id BIGINT REFERENCES attachment(attachment_id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_message_sender_present CHECK (
        sender_user_id IS NOT NULL OR sender_character_id IS NOT NULL OR sender_npc_id IS NOT NULL
    )
);

CREATE TABLE IF NOT EXISTS dice_roll (
    roll_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    chat_id BIGINT REFERENCES campaign_chat(chat_id) ON DELETE SET NULL,
    scene_id BIGINT REFERENCES scene(scene_id) ON DELETE SET NULL,
    actor_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    actor_character_id BIGINT REFERENCES character(character_id) ON DELETE SET NULL,
    actor_npc_id BIGINT REFERENCES npc(npc_id) ON DELETE SET NULL,
    description TEXT,
    expression TEXT NOT NULL,
    dice_count INTEGER CHECK (dice_count > 0),
    dice_type INTEGER CHECK (dice_type > 0),
    modifier INTEGER NOT NULL DEFAULT 0,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'gm_only', 'private')),
    result_total INTEGER,
    result_details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dice_roll_actor_present CHECK (
        actor_user_id IS NOT NULL OR actor_character_id IS NOT NULL OR actor_npc_id IS NOT NULL
    )
);

CREATE TABLE IF NOT EXISTS gm_request (
    request_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    requester_user_id BIGINT NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
    requester_character_id BIGINT REFERENCES character(character_id) ON DELETE SET NULL,
    request_type TEXT NOT NULL CHECK (
        request_type IN (
            'inventory_add',
            'inventory_remove',
            'plugin_add',
            'plugin_remove',
            'action',
            'scene_change',
            'custom'
        )
    ),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'applied')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    target_kind TEXT CHECK (target_kind IN ('character', 'npc', 'item', 'scene', 'location', 'campaign')),
    target_character_id BIGINT REFERENCES character(character_id) ON DELETE SET NULL,
    target_npc_id BIGINT REFERENCES npc(npc_id) ON DELETE SET NULL,
    target_item_id BIGINT REFERENCES item(item_id) ON DELETE SET NULL,
    target_scene_id BIGINT REFERENCES scene(scene_id) ON DELETE SET NULL,
    target_location_id BIGINT REFERENCES location(location_id) ON DELETE SET NULL,
    target_campaign_id BIGINT REFERENCES campaign(campaign_id) ON DELETE SET NULL,
    requested_item_id BIGINT REFERENCES item(item_id) ON DELETE SET NULL,
    requested_plugin_id BIGINT REFERENCES plugin(plugin_id) ON DELETE SET NULL,
    requested_quantity NUMERIC(12, 2),
    action_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    gm_comment TEXT,
    resolved_by_gm_user_id BIGINT REFERENCES app_user(user_id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gm_request_effect (
    request_effect_id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES gm_request(request_id) ON DELETE CASCADE,
    effect_type TEXT NOT NULL CHECK (
        effect_type IN (
            'inventory_entry',
            'plugin_assignment',
            'attachment_access',
            'custom'
        )
    ),
    inventory_entry_id BIGINT REFERENCES inventory_entry(inventory_entry_id) ON DELETE SET NULL,
    plugin_assignment_id BIGINT REFERENCES plugin_assignment(assignment_id) ON DELETE SET NULL,
    attachment_id BIGINT REFERENCES attachment(attachment_id) ON DELETE SET NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investigation (
    investigation_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaign(campaign_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
    UNIQUE (campaign_id, name)
);

CREATE TABLE IF NOT EXISTS investigation_link (
    investigation_id BIGINT NOT NULL REFERENCES investigation(investigation_id) ON DELETE CASCADE,
    npc_id BIGINT REFERENCES npc(npc_id) ON DELETE CASCADE,
    location_id BIGINT REFERENCES location(location_id) ON DELETE CASCADE,
    group_id BIGINT REFERENCES faction_group(group_id) ON DELETE CASCADE,
    note TEXT,
    CONSTRAINT investigation_link_target_present CHECK (
        npc_id IS NOT NULL OR location_id IS NOT NULL OR group_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_campaign_gm_user_id ON campaign(gm_user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_member_user_id ON campaign_member(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_account_email ON auth_account(email);
CREATE INDEX IF NOT EXISTS idx_auth_session_user_id ON auth_session(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_user_id ON email_verification_token(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_token(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_scene_location_id ON scene(location_id);
CREATE INDEX IF NOT EXISTS idx_scene_image_scene_id ON scene_image(scene_id, z_index);
CREATE INDEX IF NOT EXISTS idx_scene_mask_scene_id ON scene_mask(scene_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_scene_player_state_user_id ON scene_player_state(user_id, familiarity_state);
CREATE INDEX IF NOT EXISTS idx_scene_presence_scene_id ON scene_presence(scene_id);
CREATE INDEX IF NOT EXISTS idx_character_campaign_id ON character(campaign_id);
CREATE INDEX IF NOT EXISTS idx_npc_campaign_id ON npc(campaign_id);
CREATE INDEX IF NOT EXISTS idx_location_campaign_id ON location(campaign_id);
CREATE INDEX IF NOT EXISTS idx_attachment_campaign_id ON attachment(campaign_id);
CREATE INDEX IF NOT EXISTS idx_token_character_id ON token(character_id);
CREATE INDEX IF NOT EXISTS idx_token_placement_scene_id ON token_placement(scene_id, z_index);
CREATE INDEX IF NOT EXISTS idx_token_placement_token_id ON token_placement(token_id);
CREATE INDEX IF NOT EXISTS idx_plugin_campaign_id ON plugin(campaign_id);
CREATE INDEX IF NOT EXISTS idx_plugin_assignment_character_id ON plugin_assignment(character_id);
CREATE INDEX IF NOT EXISTS idx_plugin_assignment_item_id ON plugin_assignment(item_id);
CREATE INDEX IF NOT EXISTS idx_relation_campaign_id ON entity_relation(campaign_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_chat_id ON chat_message(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dice_roll_campaign_id ON dice_roll(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gm_request_campaign_status ON gm_request(campaign_id, status, created_at);

COMMIT;
