import { PoolClient } from "pg";
import { LocationService } from "./LocationService";
import { TokenService } from "./TokenService";

export class SceneService {
  static async setActiveScene(
    client: PoolClient,
    campaignId: number,
    sceneId: number
  ) {
    const scene = await client.query<{
      scene_id: number;
      location_id: number;
      name: string;
      visibility: string;
    }>(
      `
      SELECT scene_id, location_id, name, visibility
      FROM scene
      WHERE campaign_id = $1
        AND scene_id = $2
        AND status <> 'archived'
      LIMIT 1
      `,
      [campaignId, sceneId]
    );

    if (!scene.rows[0]) {
      const error = new Error("Scene not found");
      error.name = "NotFound";
      throw error;
    }

    await client.query(
      `
      UPDATE campaign
      SET active_location_id = $1,
          active_scene_id = $2,
          updated_at = NOW()
      WHERE campaign_id = $3
      `,
      [scene.rows[0].location_id, sceneId, campaignId]
    );

    return scene.rows[0];
  }

  static async grantSceneAccess(
    client: PoolClient,
    options: {
      campaignId: number;
      sceneId: number;
      userId: number;
      note?: string | null;
    }
  ) {
    await client.query(
      `
      INSERT INTO scene_player_state (
        scene_id,
        user_id,
        familiarity_state,
        first_seen_at,
        last_seen_at,
        note,
        updated_at
      )
      VALUES ($1, $2, 'known', NOW(), NOW(), $3, NOW())
      ON CONFLICT (scene_id, user_id)
      DO UPDATE SET
        familiarity_state = 'known',
        last_seen_at = NOW(),
        note = EXCLUDED.note,
        updated_at = NOW()
      `,
      [options.sceneId, options.userId, options.note ?? null]
    );
  }

  static async movePlayerToScene(
    client: PoolClient,
    options: {
      campaignId: number;
      gmUserId: string | number;
      userId: number;
      sceneId: number;
      characterId?: number | null;
      reason?: string | null;
    }
  ) {
    const scene = await client.query<{
      scene_id: number;
      location_id: number;
      name: string;
      location_name: string;
      visibility: string;
    }>(
      `
      SELECT
        s.scene_id,
        s.location_id,
        s.name,
        s.visibility,
        l.name AS location_name
      FROM scene s
      JOIN location l ON l.location_id = s.location_id
      WHERE s.campaign_id = $1
        AND s.scene_id = $2
        AND s.status <> 'archived'
        AND l.status <> 'archived'
      LIMIT 1
      `,
      [options.campaignId, options.sceneId]
    );

    if (!scene.rows[0]) {
      const error = new Error("Scene not found");
      error.name = "NotFound";
      throw error;
    }

    await client.query(
      `
      INSERT INTO player_location_access (
        campaign_id,
        user_id,
        location_id,
        granted_by_user_id,
        note,
        reason,
        revoked_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $5, NULL, NOW())
      ON CONFLICT (user_id, location_id)
      DO UPDATE SET
        campaign_id = EXCLUDED.campaign_id,
        granted_by_user_id = EXCLUDED.granted_by_user_id,
        note = EXCLUDED.note,
        reason = EXCLUDED.reason,
        revoked_at = NULL,
        updated_at = NOW()
      `,
      [
        options.campaignId,
        options.userId,
        scene.rows[0].location_id,
        options.gmUserId,
        options.reason ?? "Player moved to scene by GM."
      ]
    );

    await SceneService.grantSceneAccess(client, {
      campaignId: options.campaignId,
      sceneId: options.sceneId,
      userId: options.userId,
      note: options.reason ?? null
    });

    await client.query(
      `
      UPDATE campaign_member
      SET current_location_id = $1,
          current_scene_id = $2,
          updated_at = NOW()
      WHERE campaign_id = $3
        AND user_id = $4
        AND is_active = TRUE
      `,
      [
        scene.rows[0].location_id,
        options.sceneId,
        options.campaignId,
        options.userId
      ]
    );

    if (options.characterId) {
      await client.query(
        `
        UPDATE "character"
        SET current_location_id = $1,
            current_scene_id = $2,
            updated_at = NOW()
        WHERE campaign_id = $3
          AND character_id = $4
        `,
        [
          scene.rows[0].location_id,
          options.sceneId,
          options.campaignId,
          options.characterId
        ]
      );

      await TokenService.ensureCharacterTokenForScene(client, {
        campaignId: options.campaignId,
        sceneId: options.sceneId,
        characterId: options.characterId,
        createdByUserId: options.gmUserId
      });
    }

    await LocationService.writeLocationEvent(client, {
      campaignId: options.campaignId,
      userId: String(options.gmUserId),
      eventType: "player_scene_moved",
      title: `Player moved to scene: ${scene.rows[0].name}`,
      description: options.reason ?? null,
      locationId: scene.rows[0].location_id,
      chatMessage: `GM moves a player to scene: ${scene.rows[0].name}.`
    });

    return scene.rows[0];
  }
}
