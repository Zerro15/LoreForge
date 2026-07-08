import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireCampaignMember, requireGameMaster } from "../access/campaignAccess";
import { query, queryOne, withTransaction } from "../db";
import { toSceneDTO, toSceneListDTO } from "../dto/SceneDTO";
import {
  imageMimeTypes,
  LocationService,
  uploadRoot
} from "../services/LocationService";
import { realtimeRooms } from "../realtime/rooms";
import { SceneService } from "../services/SceneService";

const campaignParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

const locationParamsSchema = campaignParamsSchema.extend({
  locationId: z.coerce.number().int().positive()
});

const sceneParamsSchema = campaignParamsSchema.extend({
  sceneId: z.coerce.number().int().positive()
});

const visibilitySchema = z.enum([
  "public",
  "party_only",
  "player_only",
  "gm_only",
  "hidden_until_discovered"
]);

const sceneBodySchema = z.object({
  name: z.string().trim().min(2),
  sceneType: z.string().trim().optional().nullable(),
  publicDescription: z.string().trim().optional().nullable(),
  gmDescription: z.string().trim().optional().nullable(),
  visibility: visibilitySchema.default("party_only"),
  sortOrder: z.coerce.number().int().default(0)
});

const scenePatchSchema = sceneBodySchema.partial().extend({
  status: z.enum(["active", "hidden", "archived"]).optional()
});

const movePlayerBodySchema = z.object({
  userId: z.coerce.number().int().positive(),
  characterId: z.coerce.number().int().positive().optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable()
});

function sceneListQuery() {
  return `
    SELECT
      s.scene_id,
      s.campaign_id,
      s.location_id,
      s.name,
      s.scene_type,
      s.public_description,
      CASE WHEN $2::BOOLEAN THEN s.gm_description ELSE NULL END AS gm_description,
      s.sort_order,
      s.is_active,
      s.visibility,
      s.status,
      s.archived_at,
      s.created_at,
      s.updated_at,
      (c.active_scene_id = s.scene_id) AS is_active_scene,
      (cm.current_scene_id = s.scene_id) AS is_current_for_user,
      (sps.user_id IS NOT NULL AND sps.familiarity_state = 'known') AS has_player_access,
      JSONB_BUILD_OBJECT(
        'location_id', l.location_id,
        'name', l.name,
        'visibility', l.visibility,
        'status', l.status
      ) AS location,
      image.image AS image
    FROM scene s
    JOIN campaign c ON c.campaign_id = s.campaign_id
    JOIN location l ON l.location_id = s.location_id
    LEFT JOIN campaign_member cm
      ON cm.campaign_id = s.campaign_id
     AND cm.user_id = $3
     AND cm.is_active = TRUE
    LEFT JOIN scene_player_state sps
      ON sps.scene_id = s.scene_id
     AND sps.user_id = $3
     AND sps.familiarity_state = 'known'
    LEFT JOIN LATERAL (
      SELECT JSONB_BUILD_OBJECT(
        'scene_image_id', si.scene_image_id,
        'name', si.name,
        'visibility', si.visibility,
        'attachment', JSONB_BUILD_OBJECT(
          'attachment_id', a.attachment_id,
          'filename', a.filename,
          'mime_type', a.mime_type,
          'file_size_bytes', a.file_size_bytes,
          'public_url', a.public_url,
          'metadata', a.metadata
        )
      ) AS image
      FROM scene_image si
      JOIN attachment a ON a.attachment_id = si.attachment_id
      WHERE si.scene_id = s.scene_id
        AND ($2::BOOLEAN OR si.visibility IN ('public', 'party_only'))
      ORDER BY si.z_index DESC, si.created_at DESC
      LIMIT 1
    ) image ON TRUE
    WHERE s.campaign_id = $1
      AND ($5::BIGINT IS NULL OR s.location_id = $5)
      AND (
        $2::BOOLEAN
        OR (
          s.status <> 'archived'
          AND l.status <> 'archived'
          AND (
            s.visibility = 'public'
            OR ($4::BOOLEAN = FALSE AND s.visibility = 'party_only')
            OR sps.user_id IS NOT NULL
            OR cm.current_scene_id = s.scene_id
          )
        )
      )
    ORDER BY l.name, s.sort_order, s.name
  `;
}

export async function scenesRoutes(app: FastifyInstance) {
  app.get("/api/campaigns/:campaignId/scenes", async (request) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const auth = await requireCampaignMember(request, campaignId);
    const locationId = z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .parse((request.query as { locationId?: string }).locationId);
    const scenes = await query(sceneListQuery(), [
      campaignId,
      auth.permissions.canManageLocations,
      auth.user.user_id,
      auth.member.role === "viewer",
      locationId ?? null
    ]);

    return toSceneListDTO(scenes);
  });

  app.get("/api/campaigns/:campaignId/locations/:locationId/scenes", async (request) => {
    const { campaignId, locationId } = locationParamsSchema.parse(request.params);
    const auth = await requireCampaignMember(request, campaignId);
    const scenes = await query(sceneListQuery(), [
      campaignId,
      auth.permissions.canManageLocations,
      auth.user.user_id,
      auth.member.role === "viewer",
      locationId
    ]);

    return toSceneListDTO(scenes);
  });

  app.get("/api/campaigns/:campaignId/scenes/:sceneId", async (request, reply) => {
    const { campaignId, sceneId } = sceneParamsSchema.parse(request.params);
    const auth = await requireCampaignMember(request, campaignId);
    const scenes = await query(sceneListQuery(), [
      campaignId,
      auth.permissions.canManageLocations,
      auth.user.user_id,
      auth.member.role === "viewer",
      null
    ]);
    const scene = scenes.find((item) => String(item.scene_id) === String(sceneId));

    if (!scene) {
      return reply.code(404).send({ error: "Scene not found or unavailable" });
    }

    return toSceneDTO(scene);
  });

  app.post("/api/campaigns/:campaignId/locations/:locationId/scenes", async (request, reply) => {
    const { campaignId, locationId } = locationParamsSchema.parse(request.params);
    await requireGameMaster(request, campaignId);
    const body = sceneBodySchema.parse(request.body);

    const scene = await queryOne(
      `
      INSERT INTO scene (
        campaign_id,
        location_id,
        name,
        scene_type,
        public_description,
        gm_description,
        visibility,
        sort_order,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING *
      `,
      [
        campaignId,
        locationId,
        body.name,
        body.sceneType ?? null,
        body.publicDescription ?? null,
        body.gmDescription ?? null,
        body.visibility,
        body.sortOrder
      ]
    );

    return reply.code(201).send(toSceneDTO(scene!));
  });

  app.patch("/api/campaigns/:campaignId/scenes/:sceneId", async (request, reply) => {
    const { campaignId, sceneId } = sceneParamsSchema.parse(request.params);
    await requireGameMaster(request, campaignId);
    const body = scenePatchSchema.parse(request.body);

    const scene = await queryOne(
      `
      UPDATE scene
      SET name = COALESCE($3, name),
          scene_type = COALESCE($4, scene_type),
          public_description = COALESCE($5, public_description),
          gm_description = COALESCE($6, gm_description),
          visibility = COALESCE($7, visibility),
          sort_order = COALESCE($8, sort_order),
          status = COALESCE($9, status),
          archived_at = CASE WHEN $9 = 'archived' THEN NOW() ELSE archived_at END,
          updated_at = NOW()
      WHERE campaign_id = $1
        AND scene_id = $2
      RETURNING *
      `,
      [
        campaignId,
        sceneId,
        body.name ?? null,
        body.sceneType ?? null,
        body.publicDescription ?? null,
        body.gmDescription ?? null,
        body.visibility ?? null,
        body.sortOrder ?? null,
        body.status ?? null
      ]
    );

    if (!scene) {
      return reply.code(404).send({ error: "Scene not found" });
    }

    return toSceneDTO(scene);
  });

  app.delete("/api/campaigns/:campaignId/scenes/:sceneId", async (request, reply) => {
    const { campaignId, sceneId } = sceneParamsSchema.parse(request.params);
    await requireGameMaster(request, campaignId);

    const scene = await queryOne(
      `
      UPDATE scene
      SET status = 'archived',
          archived_at = NOW(),
          updated_at = NOW()
      WHERE campaign_id = $1
        AND scene_id = $2
      RETURNING *
      `,
      [campaignId, sceneId]
    );

    if (!scene) {
      return reply.code(404).send({ error: "Scene not found" });
    }

    return { ok: true, scene: toSceneDTO(scene) };
  });

  app.post("/api/campaigns/:campaignId/scenes/:sceneId/activate", async (request, reply) => {
    const { campaignId, sceneId } = sceneParamsSchema.parse(request.params);
    const auth = await requireGameMaster(request, campaignId);

    const scene = await withTransaction(async (client) => {
      const activeScene = await SceneService.setActiveScene(client, campaignId, sceneId);
      await LocationService.writeLocationEvent(client, {
        campaignId,
        userId: auth.user.user_id,
        eventType: "scene_activated",
        title: `Active scene: ${activeScene.name}`,
        description: "GM changed the active play scene.",
        locationId: activeScene.location_id,
        chatMessage: `GM changes the active scene: ${activeScene.name}.`
      });
      return activeScene;
    });

    realtimeRooms.broadcast(campaignId, {
      type: "scene.changed",
      payload: {
        campaignId: String(campaignId),
        sceneId: String(scene.scene_id),
        locationId: String(scene.location_id),
        visibility: scene.visibility
      }
    });

    return { ok: true, activeSceneId: String(scene.scene_id), activeLocationId: String(scene.location_id) };
  });

  app.post("/api/campaigns/:campaignId/scenes/:sceneId/image", async (request, reply) => {
    const { campaignId, sceneId } = sceneParamsSchema.parse(request.params);
    const auth = await requireGameMaster(request, campaignId);

    const scene = await queryOne<{ scene_id: string }>(
      "SELECT scene_id FROM scene WHERE campaign_id = $1 AND scene_id = $2",
      [campaignId, sceneId]
    );

    if (!scene) {
      return reply.code(404).send({ error: "Scene not found" });
    }

    const file = await request.file();

    if (!file) {
      return reply.code(400).send({ error: "Image file is required" });
    }

    if (!imageMimeTypes.has(file.mimetype)) {
      return reply.code(400).send({ error: "Only PNG, JPEG and WEBP images are supported" });
    }

    const buffer = await file.toBuffer();

    if (buffer.length > 10 * 1024 * 1024) {
      return reply.code(400).send({ error: "Image is larger than 10MB" });
    }

    const filename = LocationService.safeUploadedFilename(file.filename);
    const relativeDir = path.join("campaigns", String(campaignId), "scenes");
    const absoluteDir = path.join(uploadRoot, relativeDir);
    const absolutePath = path.join(absoluteDir, filename);
    const publicUrl = `/uploads/${relativeDir.replaceAll(path.sep, "/")}/${filename}`;

    await mkdir(absoluteDir, { recursive: true });
    await writeFile(absolutePath, buffer);

    const sceneImage = await withTransaction(async (client) => {
      const inserted = await client.query(
        `
        INSERT INTO attachment (
          campaign_id,
          owner_user_id,
          filename,
          mime_type,
          file_size_bytes,
          storage_kind,
          storage_path,
          public_url,
          metadata,
          is_public,
          visibility
        )
        VALUES ($1, $2, $3, $4, $5, 'local', $6, $7, $8, TRUE, 'party_only')
        RETURNING *
        `,
        [
          campaignId,
          auth.user.user_id,
          file.filename,
          file.mimetype,
          buffer.length,
          absolutePath,
          publicUrl,
          JSON.stringify({
            originalFilename: file.filename,
            uploadedFor: "scene_map",
            sceneId
          })
        ]
      );

      const image = await client.query(
        `
        INSERT INTO scene_image (
          scene_id,
          attachment_id,
          name,
          visibility,
          z_index
        )
        VALUES ($1, $2, $3, 'party_only', 0)
        RETURNING *
        `,
        [sceneId, inserted.rows[0].attachment_id, file.filename]
      );

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, after_json)
        VALUES ($1, $2, 'scene.image.upload', 'scene_image', $3, $4)
        `,
        [
          campaignId,
          auth.user.user_id,
          image.rows[0].scene_image_id,
          JSON.stringify({
            sceneImage: image.rows[0],
            attachment: inserted.rows[0]
          })
        ]
      );

      return {
        sceneImage: image.rows[0],
        attachment: inserted.rows[0]
      };
    });

    return reply.code(201).send(sceneImage);
  });

  app.post("/api/campaigns/:campaignId/scenes/:sceneId/move-player", async (request, reply) => {
    const { campaignId, sceneId } = sceneParamsSchema.parse(request.params);
    const auth = await requireGameMaster(request, campaignId);
    const body = movePlayerBodySchema.parse(request.body);

    const result = await withTransaction(async (client) => {
      const scene = await SceneService.movePlayerToScene(client, {
        campaignId,
        sceneId,
        gmUserId: auth.user.user_id,
        userId: body.userId,
        characterId: body.characterId ?? null,
        reason: body.reason ?? null
      });

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, after_json)
        VALUES ($1, $2, 'scene.player.move', 'scene', $3, $4)
        `,
        [
          campaignId,
          auth.user.user_id,
          sceneId,
          JSON.stringify({
            userId: body.userId,
            characterId: body.characterId ?? null,
            scene
          })
        ]
      );

      return scene;
    });

    realtimeRooms.broadcast(campaignId, {
      type: "player.moved",
      payload: {
        campaignId: String(campaignId),
        userId: String(body.userId),
        characterId: body.characterId ? String(body.characterId) : null,
        sceneId: String(sceneId),
        visibility: result.visibility
      }
    });

    return reply.code(200).send({ ok: true, scene: result });
  });
}
