import { FastifyRequest } from "fastify";
import { PoolClient, QueryResultRow } from "pg";
import { requireCampaignMember, requireGameMaster } from "../access/campaignAccess";
import { query, queryOne, withTransaction } from "../db";
import { toVisionDTO } from "../dto/VisionDTO";
import { RevealedData, VisionArea } from "../domain/vision";

export type RevealInput = {
  userId: number;
  area: VisionArea;
};

export type HideAreaInput = {
  userId?: number | null;
  area: VisionArea;
};

const fullMapData: RevealedData = {
  mode: "all",
  areas: [{ type: "rect", x: 0, y: 0, width: 100, height: 100 }]
};

const emptyData: RevealedData = {
  mode: "none",
  areas: []
};

function normalizeRevealedData(value: unknown): RevealedData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...emptyData };
  }

  const data = value as RevealedData;

  return {
    mode: data.mode ?? "partial",
    areas: Array.isArray(data.areas) ? data.areas : [],
    hiddenAreas: Array.isArray(data.hiddenAreas) ? data.hiddenAreas : []
  };
}

function appendArea(data: unknown, area: VisionArea): RevealedData {
  const normalized = normalizeRevealedData(data);

  return {
    ...normalized,
    mode: normalized.mode === "all" ? "all" : "partial",
    areas: [...(normalized.areas ?? []), area]
  };
}

function appendHiddenArea(data: unknown, area: VisionArea): RevealedData {
  const normalized = normalizeRevealedData(data);

  return {
    ...normalized,
    hiddenAreas: [...(normalized.hiddenAreas ?? []), area]
  };
}

async function assertSceneInCampaign(campaignId: number, sceneId: number, client?: PoolClient) {
  const text = `
  SELECT scene_id::TEXT AS scene_id
  FROM scene
  WHERE campaign_id = $1
    AND scene_id = $2
    AND status <> 'archived'
  LIMIT 1
  `;
  const params = [campaignId, sceneId];
  const row = client
    ? (await client.query<{ scene_id: string }>(text, params)).rows[0]
    : await queryOne<{ scene_id: string }>(text, params);

  if (!row) {
    const error = new Error("Scene not found");
    error.name = "NotFound";
    throw error;
  }
}

async function assertUserInCampaign(
  campaignId: number,
  userId: number,
  client?: PoolClient
) {
  const text = `
  SELECT user_id::TEXT AS user_id
  FROM campaign_member
  WHERE campaign_id = $1
    AND user_id = $2
    AND is_active = TRUE
  LIMIT 1
  `;
  const params = [campaignId, userId];
  const row = client
    ? (await client.query<{ user_id: string }>(text, params)).rows[0]
    : await queryOne<{ user_id: string }>(text, params);

  if (!row) {
    const error = new Error("Campaign membership required");
    error.name = "Forbidden";
    throw error;
  }
}

export class VisionService {
  static async getForRequest(
    request: FastifyRequest,
    campaignId: number,
    sceneId: number
  ) {
    const access = await requireCampaignMember(request, campaignId);
    await assertSceneInCampaign(campaignId, sceneId);

    const canManageVision = access.permissions.canManageLocations;
    const layers = await query<QueryResultRow>(
      `
      SELECT
        scene_visibility_layer_id::TEXT AS scene_visibility_layer_id,
        scene_id::TEXT AS scene_id,
        campaign_id::TEXT AS campaign_id,
        type,
        geometry_data,
        visibility,
        created_by_user_id::TEXT AS created_by_user_id,
        created_at,
        updated_at
      FROM scene_visibility_layer
      WHERE campaign_id = $1
        AND scene_id = $2
        AND ($3::BOOLEAN OR visibility = 'public')
      ORDER BY scene_visibility_layer_id
      `,
      [campaignId, sceneId, access.permissions.canViewGMSecrets]
    );

    const playerVisibility = await queryOne<{
      revealed_data: unknown;
    }>(
      `
      SELECT revealed_data
      FROM player_scene_visibility
      WHERE campaign_id = $1
        AND scene_id = $2
        AND user_id = $3
      LIMIT 1
      `,
      [campaignId, sceneId, access.user.user_id]
    );

    return toVisionDTO({
      campaign_id: String(campaignId),
      scene_id: String(sceneId),
      viewer_user_id: String(access.user.user_id),
      viewer_role: access.permissions.role,
      can_manage_vision: canManageVision,
      revealed_data: access.permissions.canViewGMSecrets
        ? fullMapData
        : normalizeRevealedData(playerVisibility?.revealed_data),
      layers
    });
  }

  static async revealForRequest(
    request: FastifyRequest,
    campaignId: number,
    sceneId: number,
    input: RevealInput
  ) {
    const access = await requireGameMaster(request, campaignId);

    return withTransaction(async (client) => {
      await assertSceneInCampaign(campaignId, sceneId, client);
      await assertUserInCampaign(campaignId, input.userId, client);

      const current = await client.query<{ revealed_data: unknown }>(
        `
        SELECT revealed_data
        FROM player_scene_visibility
        WHERE campaign_id = $1
          AND scene_id = $2
          AND user_id = $3
        LIMIT 1
        `,
        [campaignId, sceneId, input.userId]
      );

      const revealedData = appendArea(current.rows[0]?.revealed_data, input.area);

      const visibility = await client.query<QueryResultRow>(
        `
        INSERT INTO player_scene_visibility (
          campaign_id,
          scene_id,
          user_id,
          revealed_data
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (scene_id, user_id)
        DO UPDATE SET
          revealed_data = EXCLUDED.revealed_data,
          updated_at = NOW()
        RETURNING
          player_scene_visibility_id::TEXT AS player_scene_visibility_id,
          campaign_id::TEXT AS campaign_id,
          scene_id::TEXT AS scene_id,
          user_id::TEXT AS user_id,
          revealed_data,
          updated_at
        `,
        [campaignId, sceneId, input.userId, revealedData]
      );

      await client.query(
        `
        INSERT INTO scene_visibility_layer (
          campaign_id,
          scene_id,
          type,
          geometry_data,
          visibility,
          created_by_user_id
        )
        VALUES ($1, $2, 'revealed_area', $3, 'gm_only', $4)
        `,
        [campaignId, sceneId, input.area, access.user.user_id]
      );

      return visibility.rows[0];
    });
  }

  static async revealAllForRequest(
    request: FastifyRequest,
    campaignId: number,
    sceneId: number,
    userId: number
  ) {
    await requireGameMaster(request, campaignId);

    return withTransaction(async (client) => {
      await assertSceneInCampaign(campaignId, sceneId, client);
      await assertUserInCampaign(campaignId, userId, client);

      const visibility = await client.query<QueryResultRow>(
        `
        INSERT INTO player_scene_visibility (
          campaign_id,
          scene_id,
          user_id,
          revealed_data
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (scene_id, user_id)
        DO UPDATE SET
          revealed_data = EXCLUDED.revealed_data,
          updated_at = NOW()
        RETURNING
          player_scene_visibility_id::TEXT AS player_scene_visibility_id,
          campaign_id::TEXT AS campaign_id,
          scene_id::TEXT AS scene_id,
          user_id::TEXT AS user_id,
          revealed_data,
          updated_at
        `,
        [campaignId, sceneId, userId, fullMapData]
      );

      return visibility.rows[0];
    });
  }

  static async hideAreaForRequest(
    request: FastifyRequest,
    campaignId: number,
    sceneId: number,
    input: HideAreaInput
  ) {
    const access = await requireGameMaster(request, campaignId);

    return withTransaction(async (client) => {
      await assertSceneInCampaign(campaignId, sceneId, client);

      if (input.userId) {
        await assertUserInCampaign(campaignId, input.userId, client);

        const current = await client.query<{ revealed_data: unknown }>(
          `
          SELECT revealed_data
          FROM player_scene_visibility
          WHERE campaign_id = $1
            AND scene_id = $2
            AND user_id = $3
          LIMIT 1
          `,
          [campaignId, sceneId, input.userId]
        );

        const revealedData = appendHiddenArea(current.rows[0]?.revealed_data, input.area);

        const visibility = await client.query<QueryResultRow>(
          `
          INSERT INTO player_scene_visibility (
            campaign_id,
            scene_id,
            user_id,
            revealed_data
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (scene_id, user_id)
          DO UPDATE SET
            revealed_data = EXCLUDED.revealed_data,
            updated_at = NOW()
          RETURNING
            player_scene_visibility_id::TEXT AS player_scene_visibility_id,
            campaign_id::TEXT AS campaign_id,
            scene_id::TEXT AS scene_id,
            user_id::TEXT AS user_id,
            revealed_data,
            updated_at
          `,
          [campaignId, sceneId, input.userId, revealedData]
        );

        return visibility.rows[0];
      }

      const layer = await client.query<QueryResultRow>(
        `
        INSERT INTO scene_visibility_layer (
          campaign_id,
          scene_id,
          type,
          geometry_data,
          visibility,
          created_by_user_id
        )
        VALUES ($1, $2, 'blocked_area', $3, 'gm_only', $4)
        RETURNING
          scene_visibility_layer_id::TEXT AS scene_visibility_layer_id,
          campaign_id::TEXT AS campaign_id,
          scene_id::TEXT AS scene_id,
          type,
          geometry_data,
          visibility,
          created_at,
          updated_at
        `,
        [campaignId, sceneId, input.area, access.user.user_id]
      );

      return layer.rows[0];
    });
  }
}
