import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getCampaignAccess } from "../access/campaignAccess";
import { query } from "../db";

const campaignParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

export async function npcsRoutes(app: FastifyInstance) {
  app.get("/api/campaigns/:campaignId/npcs", async (request) => {
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
        n.npc_id,
        n.name,
        n.title,
        n.public_description,
        CASE WHEN $2::BOOLEAN THEN n.secret_description ELSE NULL END AS secret_description,
        CASE WHEN $2::BOOLEAN THEN n.gm_secrets ELSE NULL END AS gm_secrets,
        CASE WHEN $2::BOOLEAN THEN n.campaign_journal ELSE NULL END AS campaign_journal,
        n.status_text,
        n.visibility,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'tag_id', t.tag_id,
              'name', t.name,
              'color', t.color
            )
          ) FILTER (WHERE t.tag_id IS NOT NULL),
          '[]'
        ) AS tags,
        'Access control is planned for GM-only fields' AS access_control_note
      FROM npc n
      LEFT JOIN entity_tag et ON et.entity_type = 'npc' AND et.entity_id = n.npc_id
      LEFT JOIN tag t ON t.tag_id = et.tag_id
      WHERE n.campaign_id = $1
        AND ($2::BOOLEAN OR n.visibility IN ('public', 'party_only'))
      GROUP BY n.npc_id
      ORDER BY n.name
      `,
      [campaignId, access.permissions.canViewGMSecrets]
    );
  });
}

