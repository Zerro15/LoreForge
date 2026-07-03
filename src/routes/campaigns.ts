import { FastifyInstance } from "fastify";
import { PoolClient } from "pg";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireAuthenticatedUser
} from "../access/campaignAccess";
import { query, withTransaction } from "../db";

const createCampaignBodySchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional().nullable(),
  visibility: z.enum(["private", "public"]).default("private"),
  maxPlayers: z.coerce.number().int().min(1).max(20).default(6),
  worldPluginId: z.coerce.number().int().positive().optional().nullable()
});

async function ensureMistboundPlugin(client: PoolClient) {
  const existing = await client.query<{ world_plugin_id: number }>(
    "SELECT world_plugin_id FROM world_plugin WHERE slug = 'mistbound' LIMIT 1"
  );

  if (existing.rows[0]) {
    return existing.rows[0].world_plugin_id;
  }

  const inserted = await client.query<{ world_plugin_id: number }>(
    `
    INSERT INTO world_plugin (name, slug, description, type)
    VALUES (
      'Mistbound',
      'mistbound',
      'Пути, последовательности, зелья, духовность и риск потери контроля.',
      'system'
    )
    RETURNING world_plugin_id
    `
  );

  return inserted.rows[0].world_plugin_id;
}

export async function campaignsRoutes(app: FastifyInstance) {
  app.get("/api/campaigns", async (request) => {
    const currentUser = requireAuthenticatedUser(await getAuthenticatedUser(request));

    return query(
      `
      SELECT
        c.campaign_id,
        c.name AS title,
        c.description,
        c.status,
        c.created_at,
        c.updated_at,
        wp.name AS active_plugin_name,
        COUNT(DISTINCT cm.user_id)::INT AS members_count,
        COUNT(DISTINCT ch.character_id)::INT AS characters_count,
        COUNT(DISTINCT n.npc_id)::INT AS npcs_count,
        COUNT(DISTINCT l.location_id)::INT AS locations_count
      FROM campaign c
      JOIN campaign_member current_member
        ON current_member.campaign_id = c.campaign_id
       AND current_member.user_id = $1
       AND current_member.is_active = TRUE
      LEFT JOIN campaign_member cm ON cm.campaign_id = c.campaign_id AND cm.is_active = TRUE
      LEFT JOIN "character" ch ON ch.campaign_id = c.campaign_id
      LEFT JOIN npc n ON n.campaign_id = c.campaign_id
      LEFT JOIN location l ON l.campaign_id = c.campaign_id
      LEFT JOIN campaign_plugin cp ON cp.campaign_id = c.campaign_id AND cp.is_active = TRUE
      LEFT JOIN world_plugin wp ON wp.world_plugin_id = cp.world_plugin_id
      GROUP BY c.campaign_id, wp.name
      ORDER BY c.created_at DESC
      `,
      [currentUser.user_id]
    );
  });

  app.post("/api/campaigns", async (request, reply) => {
    const currentUser = requireAuthenticatedUser(await getAuthenticatedUser(request));
    const body = createCampaignBodySchema.parse(request.body);

    const campaign = await withTransaction(async (client) => {
      const pluginId = body.worldPluginId ?? (await ensureMistboundPlugin(client));
      const plugin = await client.query<{ name: string }>(
        "SELECT name FROM world_plugin WHERE world_plugin_id = $1",
        [pluginId]
      );
      const settingName = plugin.rows[0]?.name ?? "Mistbound";

      const insertedCampaign = await client.query(
        `
        INSERT INTO campaign (
          name,
          setting_name,
          description,
          gm_user_id,
          public_journal,
          status,
          visibility,
          max_players
        )
        VALUES ($1, $2, $3, $4, $3, 'active', $5, $6)
        RETURNING
          campaign_id,
          name AS title,
          description,
          status,
          visibility,
          max_players,
          created_at,
          updated_at
        `,
        [
          body.title,
          settingName,
          body.description ?? null,
          currentUser.user_id,
          body.visibility,
          body.maxPlayers
        ]
      );

      const campaignId = insertedCampaign.rows[0].campaign_id;

      await client.query(
        `
        INSERT INTO campaign_member (campaign_id, user_id, role, is_active)
        VALUES ($1, $2, 'owner', TRUE)
        ON CONFLICT (campaign_id, user_id)
        DO UPDATE SET role = 'owner', is_active = TRUE, updated_at = NOW()
        `,
        [campaignId, currentUser.user_id]
      );

      await client.query(
        `
        INSERT INTO campaign_plugin (campaign_id, world_plugin_id, is_active, config_json)
        VALUES ($1, $2, TRUE, '{}'::JSONB)
        `,
        [campaignId, pluginId]
      );

      await client.query(
        `
        INSERT INTO campaign_chat (campaign_id, name, chat_type)
        VALUES ($1, 'Основной чат', 'campaign')
        `,
        [campaignId]
      );

      return insertedCampaign.rows[0];
    });

    return reply.code(201).send(campaign);
  });
}

