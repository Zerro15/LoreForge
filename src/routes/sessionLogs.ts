import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getCampaignAccess } from "../access/campaignAccess";
import { query } from "../db";

const campaignParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

export async function sessionLogsRoutes(app: FastifyInstance) {
  app.get("/api/campaigns/:campaignId/session-log", async (request) => {
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
        sl.session_log_id,
        sl.title,
        sl.summary_public,
        CASE WHEN $2::BOOLEAN THEN sl.summary_private ELSE NULL END AS summary_private,
        sl.session_date,
        sl.visibility,
        sl.created_at,
        sl.updated_at,
        JSONB_BUILD_OBJECT(
          'user_id', u.user_id,
          'display_name', u.display_name
        ) AS created_by,
        COALESCE(events.events, '[]'::JSONB) AS events
      FROM session_log sl
      LEFT JOIN app_user u ON u.user_id = sl.created_by_user_id
      LEFT JOIN LATERAL (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'session_event_id', se.session_event_id,
            'event_type', se.event_type,
            'title', se.title,
            'description', se.description,
            'related_entity_type', se.related_entity_type,
            'related_entity_id', se.related_entity_id,
            'visibility', se.visibility,
            'created_at', se.created_at,
            'updated_at', se.updated_at
          )
          ORDER BY se.created_at ASC, se.session_event_id ASC
        ) AS events
        FROM session_event se
        WHERE se.session_log_id = sl.session_log_id
          AND ($2::BOOLEAN OR se.visibility IN ('public', 'party_only'))
      ) events ON TRUE
      WHERE sl.campaign_id = $1
        AND ($2::BOOLEAN OR sl.visibility IN ('public', 'party_only'))
      ORDER BY sl.session_date DESC NULLS LAST, sl.created_at DESC
      `,
      [campaignId, access.permissions.canViewGMSecrets]
    );
  });
}
