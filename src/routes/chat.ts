import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getCampaignAccess } from "../access/campaignAccess";
import { query } from "../db";

const campaignParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

export async function chatRoutes(app: FastifyInstance) {
  app.get("/api/campaigns/:campaignId/chat", async (request) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const access = await getCampaignAccess(request, campaignId);

    if (!access) {
      const error = new Error("Campaign membership required");
      error.name = "Forbidden";
      throw error;
    }

    return query(
      `
      SELECT
        m.message_id,
        m.message_type,
        m.body AS content,
        m.visibility,
        m.metadata_json,
        m.created_at,
        JSONB_BUILD_OBJECT(
          'user_id', u.user_id,
          'display_name', u.display_name,
          'character_id', ch.character_id,
          'character_name', ch.name,
          'npc_id', n.npc_id,
          'npc_name', n.name
        ) AS sender,
        CASE
          WHEN dr.roll_id IS NULL THEN NULL
          ELSE JSONB_BUILD_OBJECT(
            'roll_id', dr.roll_id,
            'description', dr.description,
            'expression', dr.expression,
            'dice_count', dr.dice_count,
            'dice_type', dr.dice_type,
            'modifier', dr.modifier,
            'visibility', dr.visibility,
            'result_total', dr.result_total,
            'result_details', dr.result_details,
            'created_at', dr.created_at
          )
        END AS dice_roll
      FROM chat_message m
      JOIN campaign_chat cc ON cc.chat_id = m.chat_id
      LEFT JOIN app_user u ON u.user_id = m.sender_user_id
      LEFT JOIN "character" ch ON ch.character_id = m.sender_character_id
      LEFT JOIN npc n ON n.npc_id = m.sender_npc_id
      LEFT JOIN dice_roll dr ON dr.roll_id = m.dice_roll_id
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
      LIMIT 50
      `,
      [campaignId, access.permissions.canViewGMSecrets, access.user.user_id, String(access.user.user_id)]
    );
  });
}
