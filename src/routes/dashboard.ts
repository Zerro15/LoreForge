import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getCampaignAccess } from "../access/campaignAccess";
import { query, queryOne } from "../db";

const campaignParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/campaigns/:campaignId/dashboard", async (request, reply) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const access = await getCampaignAccess(request, campaignId);

    if (!access) {
      return reply.code(403).send({ error: "Campaign membership required" });
    }

    const campaign = await queryOne(
      `
      SELECT
        c.campaign_id,
        c.name AS title,
        c.setting_name,
        c.description,
        c.status,
        c.public_journal,
        CASE WHEN $2::BOOLEAN THEN c.gm_journal ELSE NULL END AS gm_journal,
        c.created_at,
        c.updated_at
      FROM campaign c
      WHERE c.campaign_id = $1
      `,
      [campaignId, access.permissions.canViewGMSecrets]
    );

    if (!campaign) {
      return reply.code(404).send({ error: "Campaign not found" });
    }

    const [
      activePlugin,
      members,
      stats,
      characters,
      npcs,
      locations,
      recentMessages,
      recentDiceRolls,
      recentSessionEvents,
      investigations
    ] = await Promise.all([
      queryOne(
        `
        SELECT
          wp.world_plugin_id,
          wp.name,
          wp.slug,
          wp.description,
          cp.campaign_plugin_id,
          cp.is_active,
          cp.config_json
        FROM campaign_plugin cp
        JOIN world_plugin wp ON wp.world_plugin_id = cp.world_plugin_id
        WHERE cp.campaign_id = $1 AND cp.is_active = TRUE
        ORDER BY cp.created_at DESC
        LIMIT 1
        `,
        [campaignId]
      ),
      query(
        `
        SELECT
          cm.user_id,
          u.username,
          u.display_name,
          cm.role,
          cm.is_active,
          cm.joined_at
        FROM campaign_member cm
        JOIN app_user u ON u.user_id = cm.user_id
        WHERE cm.campaign_id = $1
        ORDER BY cm.role, u.display_name
        `,
        [campaignId]
      ),
      queryOne(
        `
        SELECT
          (SELECT COUNT(*)::INT FROM "character" WHERE campaign_id = $1) AS "charactersCount",
          (SELECT COUNT(*)::INT FROM npc WHERE campaign_id = $1) AS "npcsCount",
          (SELECT COUNT(*)::INT FROM location WHERE campaign_id = $1) AS "locationsCount",
          (SELECT COUNT(*)::INT FROM investigation WHERE campaign_id = $1) AS "investigationsCount",
          (SELECT COUNT(*)::INT FROM session_event WHERE campaign_id = $1) AS "sessionEventsCount"
        `,
        [campaignId]
      ),
      query(
        `
        SELECT
          ch.character_id,
          ch.name,
          ch.public_description,
          ch.status_text,
          u.display_name AS owner_display_name
        FROM "character" ch
        JOIN app_user u ON u.user_id = ch.owner_user_id
        WHERE ch.campaign_id = $1
        ORDER BY ch.name
        `,
        [campaignId]
      ),
      query(
        `
        SELECT
          npc_id,
          name,
          title,
          public_description,
          status_text,
          visibility
        FROM npc
        WHERE campaign_id = $1
          AND ($2::BOOLEAN OR visibility IN ('public', 'party_only'))
        ORDER BY name
        `,
        [campaignId, access.permissions.canViewGMSecrets]
      ),
      query(
        `
        SELECT
          location_id,
          parent_location_id,
          name,
          location_type,
          public_description,
          state_text,
          visibility
        FROM location
        WHERE campaign_id = $1
          AND (
            $2::BOOLEAN
            OR (
              status <> 'archived'
              AND (expires_at IS NULL OR expires_at > NOW())
              AND visibility IN ('public', 'party_only')
            )
          )
        ORDER BY parent_location_id NULLS FIRST, name
        `,
        [campaignId, access.permissions.canViewGMSecrets]
      ),
      query(
        `
        SELECT
          m.message_id,
          m.body AS content,
          m.message_type,
          m.visibility,
          m.created_at,
          u.display_name AS sender_user,
          ch.name AS sender_character,
          n.name AS sender_npc
        FROM chat_message m
        JOIN campaign_chat cc ON cc.chat_id = m.chat_id
        LEFT JOIN app_user u ON u.user_id = m.sender_user_id
        LEFT JOIN "character" ch ON ch.character_id = m.sender_character_id
        LEFT JOIN npc n ON n.npc_id = m.sender_npc_id
        WHERE cc.campaign_id = $1
          AND (
            $2::BOOLEAN
            OR m.visibility IN ('public', 'party_only')
            OR (
              m.visibility = 'player_only'
              AND (
                m.sender_user_id = $3
                OR m.metadata_json->>'targetUserId' = $4
              )
            )
          )
        ORDER BY m.created_at DESC
        LIMIT 10
        `,
        [
          campaignId,
          access.permissions.canViewGMSecrets,
          access.user.user_id,
          String(access.user.user_id)
        ]
      ),
      query(
        `
        SELECT
          roll_id,
          description,
          expression,
          visibility,
          result_total,
          result_details,
          created_at
        FROM dice_roll
        WHERE campaign_id = $1
          AND (
            $2::BOOLEAN
            OR visibility IN ('public', 'party_only')
            OR (visibility = 'player_only' AND actor_user_id = $3)
          )
        ORDER BY created_at DESC
        LIMIT 10
        `,
        [campaignId, access.permissions.canViewGMSecrets, access.user.user_id]
      ),
      query(
        `
        SELECT
          session_event_id,
          event_type,
          title,
          description,
          related_entity_type,
          related_entity_id,
          visibility,
          created_at
        FROM session_event
        WHERE campaign_id = $1
          AND ($2::BOOLEAN OR visibility IN ('public', 'party_only'))
        ORDER BY created_at DESC
        LIMIT 10
        `,
        [campaignId, access.permissions.canViewGMSecrets]
      ),
      query(
        `
        SELECT
          investigation_id,
          name,
          description,
          status,
          visibility
        FROM investigation
        WHERE campaign_id = $1
          AND ($2::BOOLEAN OR visibility IN ('public', 'party_only'))
        ORDER BY name
        `,
        [campaignId, access.permissions.canViewGMSecrets]
      )
    ]);

    return {
      campaign,
      currentMember: access.permissions,
      activePlugin,
      members,
      stats,
      characters,
      npcs,
      locations,
      recentMessages,
      recentDiceRolls,
      recentSessionEvents,
      investigations
    };
  });
}

