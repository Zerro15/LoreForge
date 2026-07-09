import { FastifyRequest } from "fastify";
import { PoolClient } from "pg";
import { requireCampaignMember, requireGameMaster } from "../access/campaignAccess";
import { query, queryOne } from "../db";
import { toTokenDTO, toTokenListDTO } from "../dto/TokenDTO";

export type TokenVisibility = "public" | "gm_only" | "hidden";
export type TokenEntityType = "character" | "npc" | "marker";

export type CreateTokenInput = {
  entityType: TokenEntityType;
  entityId?: number | null;
  x: number;
  y: number;
  label?: string | null;
  size?: number;
  visibility?: TokenVisibility;
  imageAttachmentId?: number | null;
};

export type UpdateTokenInput = Partial<{
  x: number;
  y: number;
  label: string | null;
  size: number;
  visibility: TokenVisibility;
  imageAttachmentId: number | null;
}>;

export class TokenService {
  static tokenSelectSql() {
    return `
      SELECT
        st.scene_token_id,
        st.scene_id,
        st.campaign_id,
        st.entity_type,
        st.entity_id,
        st.x,
        st.y,
        st.image_attachment_id,
        st.label,
        st.size,
        st.visibility,
        st.status,
        st.created_by_user_id,
        st.created_at,
        st.updated_at,
        CASE
          WHEN st.entity_type = 'character' AND ch.character_id IS NOT NULL THEN JSONB_BUILD_OBJECT(
            'entity_type', 'character',
            'entity_id', ch.character_id,
            'name', ch.name,
            'portrait_url', cha.public_url
          )
          WHEN st.entity_type = 'npc' AND n.npc_id IS NOT NULL THEN JSONB_BUILD_OBJECT(
            'entity_type', 'npc',
            'entity_id', n.npc_id,
            'name', n.name,
            'portrait_url', npa.public_url
          )
          ELSE NULL
        END AS entity,
        CASE
          WHEN COALESCE(a.attachment_id, cha.attachment_id, npa.attachment_id) IS NULL THEN NULL
          ELSE JSONB_BUILD_OBJECT(
            'attachment_id', COALESCE(a.attachment_id, cha.attachment_id, npa.attachment_id),
            'filename', COALESCE(a.filename, cha.filename, npa.filename),
            'mime_type', COALESCE(a.mime_type, cha.mime_type, npa.mime_type),
            'file_size_bytes', COALESCE(a.file_size_bytes, cha.file_size_bytes, npa.file_size_bytes),
            'public_url', COALESCE(a.public_url, cha.public_url, npa.public_url),
            'metadata', COALESCE(a.metadata, cha.metadata, npa.metadata)
          )
        END AS image_attachment,
        COALESCE(a.public_url, cha.public_url, npa.public_url) AS image_url
      FROM scene_token st
      LEFT JOIN "character" ch
        ON st.entity_type = 'character'
       AND ch.character_id = st.entity_id
       AND ch.campaign_id = st.campaign_id
      LEFT JOIN attachment cha ON cha.attachment_id = ch.avatar_attachment_id
      LEFT JOIN npc n
        ON st.entity_type = 'npc'
       AND n.npc_id = st.entity_id
       AND n.campaign_id = st.campaign_id
      LEFT JOIN attachment npa ON npa.attachment_id = n.portrait_attachment_id
      LEFT JOIN attachment a ON a.attachment_id = st.image_attachment_id
    `;
  }

  static async listForRequest(
    request: FastifyRequest,
    campaignId: number,
    sceneId: number
  ) {
    const access = await requireCampaignMember(request, campaignId);
    const canViewHidden = access.permissions.canViewGMSecrets;

    const rows = await query(
      `
      ${TokenService.tokenSelectSql()}
      JOIN scene s ON s.scene_id = st.scene_id
      WHERE st.campaign_id = $1
        AND st.scene_id = $2
        AND s.campaign_id = $1
        AND st.status = 'active'
        AND (
          $3::BOOLEAN
          OR st.visibility = 'public'
        )
      ORDER BY st.entity_type, st.label NULLS LAST, st.scene_token_id
      `,
      [campaignId, sceneId, canViewHidden]
    );

    return toTokenListDTO(rows);
  }

  static async createForRequest(
    request: FastifyRequest,
    campaignId: number,
    sceneId: number,
    input: CreateTokenInput
  ) {
    const access = await requireGameMaster(request, campaignId);
    await TokenService.assertSceneInCampaign(campaignId, sceneId);
    await TokenService.assertEntityInCampaign(campaignId, input.entityType, input.entityId);

    const token = await queryOne(
      `
      INSERT INTO scene_token (
        scene_id,
        campaign_id,
        entity_type,
        entity_id,
        x,
        y,
        image_attachment_id,
        label,
        size,
        visibility,
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 1), COALESCE($10, 'public'), $11)
      RETURNING *
      `,
      [
        sceneId,
        campaignId,
        input.entityType,
        input.entityId ?? null,
        input.x,
        input.y,
        input.imageAttachmentId ?? null,
        input.label ?? null,
        input.size ?? 1,
        input.visibility ?? "public",
        access.user.user_id
      ]
    );

    return toTokenDTO(token!);
  }

  static async updateForRequest(
    request: FastifyRequest,
    campaignId: number,
    tokenId: number,
    input: UpdateTokenInput
  ) {
    await requireGameMaster(request, campaignId);

    const token = await queryOne(
      `
      UPDATE scene_token
      SET x = COALESCE($3, x),
          y = COALESCE($4, y),
          label = COALESCE($5, label),
          size = COALESCE($6, size),
          visibility = COALESCE($7, visibility),
          image_attachment_id = COALESCE($8, image_attachment_id),
          updated_at = NOW()
      WHERE campaign_id = $1
        AND scene_token_id = $2
        AND status = 'active'
      RETURNING *
      `,
      [
        campaignId,
        tokenId,
        input.x ?? null,
        input.y ?? null,
        input.label ?? null,
        input.size ?? null,
        input.visibility ?? null,
        input.imageAttachmentId ?? null
      ]
    );

    return token ? toTokenDTO(token) : null;
  }

  static async archiveForRequest(
    request: FastifyRequest,
    campaignId: number,
    tokenId: number
  ) {
    await requireGameMaster(request, campaignId);

    const token = await queryOne(
      `
      UPDATE scene_token
      SET status = 'archived',
          updated_at = NOW()
      WHERE campaign_id = $1
        AND scene_token_id = $2
      RETURNING *
      `,
      [campaignId, tokenId]
    );

    return token ? toTokenDTO(token) : null;
  }

  static async ensureCharacterTokenForScene(
    client: PoolClient,
    options: {
      campaignId: number;
      sceneId: number;
      characterId: number;
      createdByUserId: string | number;
      x?: number;
      y?: number;
    }
  ) {
    const character = await client.query<{ name: string }>(
      `
      SELECT name
      FROM "character"
      WHERE campaign_id = $1
        AND character_id = $2
      LIMIT 1
      `,
      [options.campaignId, options.characterId]
    );

    if (!character.rows[0]) {
      return null;
    }

    const existing = await client.query(
      `
      UPDATE scene_token
      SET scene_id = $1,
          x = COALESCE($4, x),
          y = COALESCE($5, y),
          status = 'active',
          visibility = 'public',
          updated_at = NOW()
      WHERE campaign_id = $2
        AND entity_type = 'character'
        AND entity_id = $3
      RETURNING *
      `,
      [
        options.sceneId,
        options.campaignId,
        options.characterId,
        options.x ?? null,
        options.y ?? null
      ]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const token = await client.query(
      `
      INSERT INTO scene_token (
        scene_id,
        campaign_id,
        entity_type,
        entity_id,
        x,
        y,
        label,
        size,
        visibility,
        created_by_user_id
      )
      VALUES ($1, $2, 'character', $3, $4, $5, $6, 1, 'public', $7)
      ON CONFLICT DO NOTHING
      RETURNING *
      `,
      [
        options.sceneId,
        options.campaignId,
        options.characterId,
        options.x ?? 50,
        options.y ?? 50,
        character.rows[0].name,
        options.createdByUserId
      ]
    );

    return token.rows[0] ?? null;
  }

  private static async assertSceneInCampaign(campaignId: number, sceneId: number) {
    const scene = await queryOne(
      "SELECT scene_id FROM scene WHERE campaign_id = $1 AND scene_id = $2 AND status <> 'archived'",
      [campaignId, sceneId]
    );

    if (!scene) {
      const error = new Error("Scene not found");
      error.name = "NotFound";
      throw error;
    }
  }

  private static async assertEntityInCampaign(
    campaignId: number,
    entityType: TokenEntityType,
    entityId?: number | null
  ) {
    if (entityType === "marker") {
      return;
    }

    if (!entityId) {
      const error = new Error("Entity id is required for this token type");
      error.name = "ValidationError";
      throw error;
    }

    const table = entityType === "character" ? '"character"' : "npc";
    const idColumn = entityType === "character" ? "character_id" : "npc_id";
    const entity = await queryOne(
      `SELECT ${idColumn} FROM ${table} WHERE campaign_id = $1 AND ${idColumn} = $2 LIMIT 1`,
      [campaignId, entityId]
    );

    if (!entity) {
      const error = new Error("Token entity not found");
      error.name = "NotFound";
      throw error;
    }
  }
}
