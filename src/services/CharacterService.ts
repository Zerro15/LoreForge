import { FastifyRequest } from "fastify";
import { PoolClient } from "pg";
import {
  CampaignAccess,
  requireCampaignMember
} from "../access/campaignAccess";
import { query, queryOne, withTransaction } from "../db";
import {
  toCharacterDTO,
  toCharacterListDTO
} from "../dto/CharacterDTO";
import {
  canArchiveCharacter,
  canCreateCharacter,
  canEditCharacter,
  canManageAnyCharacter
} from "../domain/character/rules";

export type CharacterInput = {
  name: string;
  title?: string | null;
  publicDescription?: string | null;
  privateNotes?: string | null;
  gmNotes?: string | null;
  statusText?: string | null;
  visibility: string;
  status?: string;
  ownerUserId?: number | null;
};

export type CharacterPatchInput = Partial<CharacterInput>;

type Queryable = Pick<PoolClient, "query">;

function hasOwnField<T extends object>(body: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function forbid(message: string) {
  const error = new Error(message);
  error.name = "Forbidden";
  throw error;
}

function canSeeRow(access: CampaignAccess, row: { owner_user_id?: unknown }) {
  if (canManageAnyCharacter(access.permissions.role)) {
    return true;
  }

  return true;
}

async function assertOwnerInCampaign(
  client: Queryable,
  campaignId: number,
  ownerUserId: number | null | undefined
) {
  if (ownerUserId == null) {
    return;
  }

  const result = await client.query(
    `
    SELECT 1
    FROM campaign_member
    WHERE campaign_id = $1
      AND user_id = $2
      AND is_active = TRUE
    LIMIT 1
    `,
    [campaignId, ownerUserId]
  );

  if (result.rowCount === 0) {
    forbid("Character owner must be an active campaign member");
  }
}

function normalizeCreateInput(
  access: CampaignAccess,
  body: CharacterInput
): CharacterInput {
  const role = access.permissions.role;

  if (!canCreateCharacter(role)) {
    forbid("Character creation is not allowed for this role");
  }

  if (canManageAnyCharacter(role)) {
    return body;
  }

  if (
    (body.ownerUserId != null && String(body.ownerUserId) !== access.user.user_id) ||
    body.gmNotes != null ||
    body.status != null ||
    body.visibility === "gm_only" ||
    body.visibility === "hidden_until_discovered"
  ) {
    forbid("Players can only create their own playable characters");
  }

  return {
    ...body,
    ownerUserId: Number(access.user.user_id),
    gmNotes: null,
    status: "active",
    visibility: body.visibility === "public" ? "public" : "party_only"
  };
}

function assertPatchAllowed(
  access: CampaignAccess,
  ownerUserId: string | null,
  body: CharacterPatchInput
) {
  const role = access.permissions.role;

  if (!canEditCharacter(role, access.user.user_id, ownerUserId)) {
    forbid("Character edit is not allowed for this role");
  }

  if (canManageAnyCharacter(role)) {
    return;
  }

  if (
    hasOwnField(body, "ownerUserId") ||
    hasOwnField(body, "gmNotes") ||
    hasOwnField(body, "visibility") ||
    hasOwnField(body, "status")
  ) {
    forbid("Players cannot edit GM-only character fields");
  }
}

async function selectCharacter(
  campaignId: number,
  characterId: number,
  access: CampaignAccess,
  client?: Queryable
) {
  const sql = `
  SELECT
    ch.character_id,
    ch.campaign_id,
    ch.owner_user_id,
    ch.created_by_user_id,
    ch.current_location_id,
    ch.current_scene_id,
    ch.avatar_attachment_id,
    ch.name,
    ch.title,
    ch.public_description,
    ch.private_notes,
    ch.gm_notes,
    ch.secret_description,
    ch.notes,
    ch.status_text,
    ch.visibility,
    ch.status,
    ch.archived_at,
    ch.created_at,
    ch.updated_at,
    CASE WHEN u.user_id IS NULL THEN NULL ELSE JSONB_BUILD_OBJECT(
      'user_id', u.user_id::TEXT,
      'username', u.username,
      'display_name', u.display_name
    ) END AS owner,
    COALESCE(stats.stats, '[]'::JSONB) AS stats,
    COALESCE(resources.resources, '[]'::JSONB) AS resources,
    COALESCE(abilities.abilities, '[]'::JSONB) AS abilities
  FROM "character" ch
  LEFT JOIN app_user u ON u.user_id = ch.owner_user_id
  LEFT JOIN LATERAL (
    SELECT JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'character_stat_id', cs.character_stat_id,
        'name', cs.name,
        'value', cs.value,
        'source_plugin_feature_id', cs.source_plugin_feature_id
      )
      ORDER BY cs.name
    ) AS stats
    FROM character_stat cs
    WHERE cs.character_id = ch.character_id
  ) stats ON TRUE
  LEFT JOIN LATERAL (
    SELECT JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'character_resource_id', cr.character_resource_id,
        'name', cr.name,
        'current_value', cr.current_value,
        'max_value', cr.max_value,
        'source_plugin_feature_id', cr.source_plugin_feature_id
      )
      ORDER BY cr.name
    ) AS resources
    FROM character_resource cr
    WHERE cr.character_id = ch.character_id
  ) resources ON TRUE
  LEFT JOIN LATERAL (
    SELECT JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'character_ability_id', ca.character_ability_id,
        'ability_id', a.ability_id,
        'name', a.name,
        'description', a.description,
        'ability_type', a.ability_type,
        'is_unlocked', ca.is_unlocked,
        'uses_left', ca.uses_left,
        'cooldown', ca.cooldown,
        'metadata_json', ca.metadata_json
      )
      ORDER BY a.name
    ) AS abilities
    FROM character_ability ca
    JOIN ability a ON a.ability_id = ca.ability_id
    WHERE ca.character_id = ch.character_id
  ) abilities ON TRUE
  WHERE ch.campaign_id = $1
    AND ch.character_id = $2
    AND ch.status <> 'archived'
    AND ($3::BOOLEAN OR ch.visibility IN ('public', 'party_only'))
  `;

  const params = [campaignId, characterId, canManageAnyCharacter(access.permissions.role)];

  const row = client
    ? (await client.query(sql, params)).rows[0] ?? null
    : await queryOne(sql, params);

  if (!row || !canSeeRow(access, row)) {
    return null;
  }

  return row;
}

export class CharacterService {
  static async listForRequest(request: FastifyRequest, campaignId: number) {
    const access = await requireCampaignMember(request, campaignId);
    const canManage = canManageAnyCharacter(access.permissions.role);

    const rows = await query(
      `
      SELECT
        ch.character_id,
        ch.campaign_id,
        ch.owner_user_id,
        ch.created_by_user_id,
        ch.current_location_id,
        ch.current_scene_id,
        ch.avatar_attachment_id,
        ch.name,
        ch.title,
        ch.public_description,
        ch.private_notes,
        ch.gm_notes,
        ch.secret_description,
        ch.notes,
        ch.status_text,
        ch.visibility,
        ch.status,
        ch.archived_at,
        ch.created_at,
        ch.updated_at,
        CASE WHEN u.user_id IS NULL THEN NULL ELSE JSONB_BUILD_OBJECT(
          'user_id', u.user_id::TEXT,
          'username', u.username,
          'display_name', u.display_name
        ) END AS owner,
        COALESCE(stats.stats, '[]'::JSONB) AS stats,
        COALESCE(resources.resources, '[]'::JSONB) AS resources,
        COALESCE(abilities.abilities, '[]'::JSONB) AS abilities
      FROM "character" ch
      LEFT JOIN app_user u ON u.user_id = ch.owner_user_id
      LEFT JOIN LATERAL (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'character_stat_id', cs.character_stat_id,
            'name', cs.name,
            'value', cs.value,
            'source_plugin_feature_id', cs.source_plugin_feature_id
          )
          ORDER BY cs.name
        ) AS stats
        FROM character_stat cs
        WHERE cs.character_id = ch.character_id
      ) stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'character_resource_id', cr.character_resource_id,
            'name', cr.name,
            'current_value', cr.current_value,
            'max_value', cr.max_value,
            'source_plugin_feature_id', cr.source_plugin_feature_id
          )
          ORDER BY cr.name
        ) AS resources
        FROM character_resource cr
        WHERE cr.character_id = ch.character_id
      ) resources ON TRUE
      LEFT JOIN LATERAL (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'character_ability_id', ca.character_ability_id,
            'ability_id', a.ability_id,
            'name', a.name,
            'description', a.description,
            'ability_type', a.ability_type,
            'is_unlocked', ca.is_unlocked,
            'uses_left', ca.uses_left,
            'cooldown', ca.cooldown,
            'metadata_json', ca.metadata_json
          )
          ORDER BY a.name
        ) AS abilities
        FROM character_ability ca
        JOIN ability a ON a.ability_id = ca.ability_id
        WHERE ca.character_id = ch.character_id
      ) abilities ON TRUE
      WHERE ch.campaign_id = $1
        AND ch.status <> 'archived'
        AND ($2::BOOLEAN OR ch.visibility IN ('public', 'party_only'))
      ORDER BY ch.name
      `,
      [campaignId, canManage]
    );

    return toCharacterListDTO(rows, access);
  }

  static async getForRequest(
    request: FastifyRequest,
    campaignId: number,
    characterId: number
  ) {
    const access = await requireCampaignMember(request, campaignId);
    const character = await selectCharacter(campaignId, characterId, access);

    return character ? toCharacterDTO(character, access) : null;
  }

  static async createForRequest(
    request: FastifyRequest,
    campaignId: number,
    body: CharacterInput
  ) {
    const access = await requireCampaignMember(request, campaignId);
    const input = normalizeCreateInput(access, body);

    const character = await withTransaction(async (client) => {
      await assertOwnerInCampaign(client, campaignId, input.ownerUserId);

      const inserted = await client.query<{ character_id: number }>(
        `
        INSERT INTO "character" (
          campaign_id,
          owner_user_id,
          created_by_user_id,
          name,
          title,
          public_description,
          private_notes,
          gm_notes,
          status_text,
          visibility,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
        RETURNING character_id
        `,
        [
          campaignId,
          input.ownerUserId ?? null,
          access.user.user_id,
          input.name,
          input.title ?? null,
          input.publicDescription ?? null,
          input.privateNotes ?? null,
          input.gmNotes ?? null,
          input.statusText ?? null,
          input.visibility
        ]
      );

      const characterId = inserted.rows[0].character_id;
      const created = await selectCharacter(campaignId, characterId, access, client);

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, after_json)
        VALUES ($1, $2, 'character.create', 'character', $3, $4)
        `,
        [campaignId, access.user.user_id, characterId, JSON.stringify(created)]
      );

      return created;
    });

    return character ? toCharacterDTO(character, access) : null;
  }

  static async updateForRequest(
    request: FastifyRequest,
    campaignId: number,
    characterId: number,
    body: CharacterPatchInput
  ) {
    const access = await requireCampaignMember(request, campaignId);

    const character = await withTransaction(async (client) => {
      const before = await selectCharacter(campaignId, characterId, access, client);

      if (!before) {
        return null;
      }

      assertPatchAllowed(
        access,
        before.owner_user_id ? String(before.owner_user_id) : null,
        body
      );

      if (canManageAnyCharacter(access.permissions.role)) {
        await assertOwnerInCampaign(client, campaignId, body.ownerUserId);
      }

      await client.query(
        `
        UPDATE "character"
        SET
          name = CASE WHEN $3::BOOLEAN THEN $4 ELSE name END,
          title = CASE WHEN $5::BOOLEAN THEN $6 ELSE title END,
          public_description = CASE WHEN $7::BOOLEAN THEN $8 ELSE public_description END,
          private_notes = CASE WHEN $9::BOOLEAN THEN $10 ELSE private_notes END,
          gm_notes = CASE WHEN $11::BOOLEAN THEN $12 ELSE gm_notes END,
          status_text = CASE WHEN $13::BOOLEAN THEN $14 ELSE status_text END,
          visibility = CASE WHEN $15::BOOLEAN THEN $16 ELSE visibility END,
          status = CASE WHEN $17::BOOLEAN THEN $18 ELSE status END,
          owner_user_id = CASE WHEN $19::BOOLEAN THEN $20 ELSE owner_user_id END,
          updated_at = NOW()
        WHERE campaign_id = $1
          AND character_id = $2
          AND status <> 'archived'
        `,
        [
          campaignId,
          characterId,
          hasOwnField(body, "name"),
          body.name ?? null,
          hasOwnField(body, "title"),
          body.title ?? null,
          hasOwnField(body, "publicDescription"),
          body.publicDescription ?? null,
          hasOwnField(body, "privateNotes"),
          body.privateNotes ?? null,
          hasOwnField(body, "gmNotes"),
          body.gmNotes ?? null,
          hasOwnField(body, "statusText"),
          body.statusText ?? null,
          hasOwnField(body, "visibility"),
          body.visibility ?? null,
          hasOwnField(body, "status"),
          body.status ?? null,
          hasOwnField(body, "ownerUserId"),
          body.ownerUserId ?? null
        ]
      );

      const updated = await selectCharacter(campaignId, characterId, access, client);

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, before_json, after_json)
        VALUES ($1, $2, 'character.update', 'character', $3, $4, $5)
        `,
        [
          campaignId,
          access.user.user_id,
          characterId,
          JSON.stringify(before),
          JSON.stringify(updated)
        ]
      );

      return updated;
    });

    return character ? toCharacterDTO(character, access) : null;
  }

  static async archiveForRequest(
    request: FastifyRequest,
    campaignId: number,
    characterId: number
  ) {
    const access = await requireCampaignMember(request, campaignId);

    const archived = await withTransaction(async (client) => {
      const before = await selectCharacter(campaignId, characterId, access, client);

      if (!before) {
        return null;
      }

      if (
        !canArchiveCharacter(
          access.permissions.role,
          access.user.user_id,
          before.owner_user_id ? String(before.owner_user_id) : null
        )
      ) {
        forbid("Character archive is not allowed for this role");
      }

      await client.query(
        `
        UPDATE "character"
        SET status = 'archived',
            archived_at = NOW(),
            updated_at = NOW()
        WHERE campaign_id = $1
          AND character_id = $2
          AND status <> 'archived'
        `,
        [campaignId, characterId]
      );

      const after = {
        ...before,
        status: "archived",
        archived_at: new Date().toISOString()
      };

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, before_json, after_json)
        VALUES ($1, $2, 'character.archive', 'character', $3, $4, $5)
        `,
        [
          campaignId,
          access.user.user_id,
          characterId,
          JSON.stringify(before),
          JSON.stringify(after)
        ]
      );

      return after;
    });

    return archived ? toCharacterDTO(archived, access) : null;
  }
}
