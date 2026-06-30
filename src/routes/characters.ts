import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db";

const campaignParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

export async function charactersRoutes(app: FastifyInstance) {
  app.get("/api/campaigns/:campaignId/characters", async (request) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);

    return query(
      `
      SELECT
        ch.character_id,
        ch.name,
        ch.public_description,
        ch.secret_description,
        ch.notes,
        ch.status_text,
        ch.current_location_id,
        ch.current_scene_id,
        ch.created_at,
        ch.updated_at,
        JSONB_BUILD_OBJECT(
          'user_id', u.user_id,
          'username', u.username,
          'display_name', u.display_name
        ) AS owner,
        COALESCE(stats.stats, '[]'::JSONB) AS stats,
        COALESCE(resources.resources, '[]'::JSONB) AS resources,
        COALESCE(abilities.abilities, '[]'::JSONB) AS abilities
      FROM "character" ch
      JOIN app_user u ON u.user_id = ch.owner_user_id
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
      ORDER BY ch.name
      `,
      [campaignId]
    );
  });
}

