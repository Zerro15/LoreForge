import { FastifyInstance } from "fastify";
import { query } from "../db";

export async function pluginsRoutes(app: FastifyInstance) {
  app.get("/api/world-plugins", async () => {
    return query(
      `
      SELECT
        wp.world_plugin_id,
        wp.name,
        wp.slug,
        wp.description,
        wp.type,
        wp.created_at,
        wp.updated_at,
        COALESCE(features.features, '[]'::JSONB) AS features
      FROM world_plugin wp
      LEFT JOIN LATERAL (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'plugin_feature_id', pf.plugin_feature_id,
            'feature_type', pf.feature_type,
            'name', pf.name,
            'description', pf.description,
            'config_json', pf.config_json
          )
          ORDER BY pf.feature_type, pf.name
        ) AS features
        FROM plugin_feature pf
        WHERE pf.world_plugin_id = wp.world_plugin_id
      ) features ON TRUE
      ORDER BY wp.name
      `
    );
  });
}

