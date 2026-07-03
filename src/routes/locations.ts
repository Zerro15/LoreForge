import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { PoolClient } from "pg";
import { z } from "zod";
import {
  canCreateTravelRequest,
  getCampaignAccess,
  requireCampaignMember,
  requireGameMaster
} from "../access/campaignAccess";
import { query, queryOne, withTransaction } from "../db";

const campaignParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

const locationParamsSchema = campaignParamsSchema.extend({
  locationId: z.coerce.number().int().positive()
});

const gmRequestParamsSchema = campaignParamsSchema.extend({
  requestId: z.coerce.number().int().positive()
});

const visibilitySchema = z.enum([
  "public",
  "party_only",
  "player_only",
  "gm_only",
  "hidden_until_discovered"
]);

const locationBodySchema = z.object({
  name: z.string().trim().min(2),
  publicDescription: z.string().trim().optional().nullable(),
  secretDescription: z.string().trim().optional().nullable(),
  parentLocationId: z.coerce.number().int().positive().optional().nullable(),
  visibility: visibilitySchema.default("hidden_until_discovered"),
  locationType: z.string().trim().optional().nullable(),
  stateText: z.string().trim().optional().nullable(),
  isEventLocation: z.boolean().default(false),
  expiresAt: z.string().datetime().optional().nullable()
});

const locationPatchSchema = locationBodySchema.partial().extend({
  status: z.enum(["active", "hidden", "archived"]).optional()
});

const accessBodySchema = z.object({
  userId: z.coerce.number().int().positive(),
  reason: z.string().trim().max(500).optional().nullable()
});

const travelRequestBodySchema = z.object({
  targetLocationId: z.coerce.number().int().positive(),
  characterId: z.coerce.number().int().positive().optional().nullable(),
  message: z.string().trim().max(1000).optional().nullable()
});

const gmResolutionBodySchema = z.object({
  response: z.string().trim().max(1000).optional().nullable()
});

const imageMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const uploadRoot = path.resolve(process.cwd(), "uploads");

async function ensureCampaignChat(client: PoolClient, campaignId: number) {
  const existing = await client.query<{ chat_id: number }>(
    `
    SELECT chat_id
    FROM campaign_chat
    WHERE campaign_id = $1
    ORDER BY created_at ASC
    LIMIT 1
    `,
    [campaignId]
  );

  if (existing.rows[0]) {
    return existing.rows[0].chat_id;
  }

  const inserted = await client.query<{ chat_id: number }>(
    `
    INSERT INTO campaign_chat (campaign_id, name, chat_type)
    VALUES ($1, 'Основной чат', 'campaign')
    RETURNING chat_id
    `,
    [campaignId]
  );

  return inserted.rows[0].chat_id;
}

async function ensureSystemSessionLog(client: PoolClient, campaignId: number, userId: string) {
  const existing = await client.query<{ session_log_id: number }>(
    `
    SELECT session_log_id
    FROM session_log
    WHERE campaign_id = $1
    ORDER BY session_date DESC NULLS LAST, created_at DESC
    LIMIT 1
    `,
    [campaignId]
  );

  if (existing.rows[0]) {
    return existing.rows[0].session_log_id;
  }

  const inserted = await client.query<{ session_log_id: number }>(
    `
    INSERT INTO session_log (
      campaign_id,
      title,
      summary_public,
      visibility,
      created_by_user_id,
      session_date
    )
    VALUES ($1, 'Системный журнал локаций', 'События управления локациями.', 'party_only', $2, CURRENT_DATE)
    RETURNING session_log_id
    `,
    [campaignId, userId]
  );

  return inserted.rows[0].session_log_id;
}

async function writeLocationEvent(
  client: PoolClient,
  options: {
    campaignId: number;
    userId: string;
    eventType: string;
    title: string;
    description?: string | null;
    locationId?: number | null;
    chatMessage?: string | null;
    visibility?: string;
  }
) {
  const sessionLogId = await ensureSystemSessionLog(
    client,
    options.campaignId,
    options.userId
  );

  await client.query(
    `
    INSERT INTO session_event (
      session_log_id,
      campaign_id,
      event_type,
      title,
      description,
      related_entity_type,
      related_entity_id,
      visibility
    )
    VALUES ($1, $2, $3, $4, $5, 'location', $6, $7)
    `,
    [
      sessionLogId,
      options.campaignId,
      options.eventType,
      options.title,
      options.description ?? null,
      options.locationId ?? null,
      options.visibility ?? "party_only"
    ]
  );

  if (options.chatMessage) {
    const chatId = await ensureCampaignChat(client, options.campaignId);

    await client.query(
      `
      INSERT INTO chat_message (
        chat_id,
        sender_user_id,
        body,
        message_type,
        visibility,
        metadata_json
      )
      VALUES ($1, $2, $3, 'system', $4, $5)
      `,
      [
        chatId,
        options.userId,
        options.chatMessage,
        options.visibility ?? "party_only",
        JSON.stringify({
          eventType: options.eventType,
          locationId: options.locationId ?? null
        })
      ]
    );
  }
}

function toNullableDate(value: string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function safeUploadedFilename(originalName: string) {
  const extension = path.extname(originalName).toLowerCase();
  const allowed = new Set([".png", ".jpg", ".jpeg", ".webp"]);
  const finalExtension = allowed.has(extension) ? extension : ".img";

  return `${randomUUID()}${finalExtension}`;
}

function getMimeTypeByPath(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  return "application/octet-stream";
}

async function setActiveLocation(client: PoolClient, campaignId: number, locationId: number) {
  await client.query(
    `
    UPDATE campaign
    SET active_location_id = $1,
        updated_at = NOW()
    WHERE campaign_id = $2
    `,
    [locationId, campaignId]
  );
}

export async function locationsRoutes(app: FastifyInstance) {
  app.get("/uploads/*", async (request, reply) => {
    const wildcard = (request.params as { "*": string })["*"];
    const decoded = decodeURIComponent(wildcard);
    const filePath = path.resolve(uploadRoot, decoded);

    if (!filePath.startsWith(uploadRoot)) {
      return reply.code(400).send({ error: "Invalid upload path" });
    }

    return reply.type(getMimeTypeByPath(filePath)).send(createReadStream(filePath));
  });

  app.get("/api/campaigns/:campaignId/locations", async (request) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const auth = await requireCampaignMember(request, campaignId);
    const userId = auth.user.user_id;
    const canManageLocations = auth.permissions.canManageLocations;
    const isViewer = auth.member.role === "viewer";

    return query(
      `
      SELECT
        l.location_id,
        l.campaign_id,
        l.parent_location_id,
        l.name,
        l.location_type,
        l.public_description,
        CASE WHEN $2::BOOLEAN THEN l.secret_description ELSE NULL END AS secret_description,
        l.state_text,
        l.map_url,
        l.grid_enabled,
        l.visibility,
        l.status,
        l.is_event_location,
        l.expires_at,
        l.archived_at,
        l.cover_attachment_id,
        l.created_at,
        l.updated_at,
        (c.active_location_id = l.location_id) AS is_active_location,
        (pla.user_id IS NOT NULL AND pla.revoked_at IS NULL) AS has_player_access,
        CASE
          WHEN a.attachment_id IS NULL THEN NULL
          ELSE JSONB_BUILD_OBJECT(
            'attachment_id', a.attachment_id,
            'filename', a.filename,
            'mime_type', a.mime_type,
            'file_size_bytes', a.file_size_bytes,
            'public_url', a.public_url,
            'metadata', a.metadata
          )
        END AS cover_attachment
      FROM location l
      JOIN campaign c ON c.campaign_id = l.campaign_id
      LEFT JOIN attachment a ON a.attachment_id = l.cover_attachment_id
      LEFT JOIN player_location_access pla
        ON pla.location_id = l.location_id
       AND pla.user_id = $3
       AND pla.revoked_at IS NULL
      WHERE l.campaign_id = $1
        AND (
          $2::BOOLEAN
          OR (
            l.status <> 'archived'
            AND (l.expires_at IS NULL OR l.expires_at > NOW())
            AND (
              l.visibility = 'public'
              OR ($4::BOOLEAN = FALSE AND l.visibility = 'party_only')
              OR pla.user_id IS NOT NULL
            )
          )
        )
      ORDER BY l.parent_location_id NULLS FIRST, l.name
      `,
      [campaignId, canManageLocations, userId, isViewer]
    );
  });

  app.get("/api/campaigns/:campaignId/locations/:locationId", async (request, reply) => {
    const { campaignId, locationId } = locationParamsSchema.parse(request.params);
    const auth = await requireCampaignMember(request, campaignId);
    const userId = auth.user.user_id;
    const canManageLocations = auth.permissions.canManageLocations;
    const isViewer = auth.member.role === "viewer";

    const location = await queryOne(
      `
      SELECT
        l.location_id,
        l.campaign_id,
        l.parent_location_id,
        l.name,
        l.location_type,
        l.public_description,
        CASE WHEN $3::BOOLEAN THEN l.secret_description ELSE NULL END AS secret_description,
        l.state_text,
        l.map_url,
        l.grid_enabled,
        l.visibility,
        l.status,
        l.is_event_location,
        l.expires_at,
        l.archived_at,
        l.cover_attachment_id,
        l.created_at,
        l.updated_at,
        (c.active_location_id = l.location_id) AS is_active_location,
        (pla.user_id IS NOT NULL AND pla.revoked_at IS NULL) AS has_player_access,
        CASE
          WHEN p.location_id IS NULL THEN NULL
          ELSE JSONB_BUILD_OBJECT(
            'location_id', p.location_id,
            'name', p.name
          )
        END AS parent,
        COALESCE(children.children, '[]'::JSONB) AS children,
        CASE
          WHEN a.attachment_id IS NULL THEN NULL
          ELSE JSONB_BUILD_OBJECT(
            'attachment_id', a.attachment_id,
            'filename', a.filename,
            'mime_type', a.mime_type,
            'file_size_bytes', a.file_size_bytes,
            'public_url', a.public_url,
            'metadata', a.metadata
          )
        END AS cover_attachment
      FROM location l
      JOIN campaign c ON c.campaign_id = l.campaign_id
      LEFT JOIN location p ON p.location_id = l.parent_location_id
      LEFT JOIN attachment a ON a.attachment_id = l.cover_attachment_id
      LEFT JOIN player_location_access pla
        ON pla.location_id = l.location_id
       AND pla.user_id = $4
       AND pla.revoked_at IS NULL
      LEFT JOIN LATERAL (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'location_id', child.location_id,
            'name', child.name,
            'visibility', child.visibility,
            'status', child.status
          )
          ORDER BY child.name
        ) AS children
        FROM location child
        WHERE child.parent_location_id = l.location_id
      ) children ON TRUE
      WHERE l.campaign_id = $1
        AND l.location_id = $2
        AND (
          $3::BOOLEAN
          OR (
            l.status <> 'archived'
            AND (l.expires_at IS NULL OR l.expires_at > NOW())
            AND (
              l.visibility = 'public'
              OR ($5::BOOLEAN = FALSE AND l.visibility = 'party_only')
              OR pla.user_id IS NOT NULL
            )
          )
        )
      GROUP BY l.location_id, c.active_location_id, pla.user_id, p.location_id, a.attachment_id, children.children
      `,
      [campaignId, locationId, canManageLocations, userId, isViewer]
    );

    if (!location) {
      return reply.code(404).send({ error: "Location not found or unavailable" });
    }

    return location;
  });

  app.post("/api/campaigns/:campaignId/locations", async (request, reply) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const auth = await requireGameMaster(request, campaignId);
    const body = locationBodySchema.parse(request.body);

    const location = await queryOne(
      `
      INSERT INTO location (
        campaign_id,
        parent_location_id,
        name,
        location_type,
        public_description,
        secret_description,
        state_text,
        visibility,
        is_event_location,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        campaignId,
        body.parentLocationId ?? null,
        body.name,
        body.locationType ?? null,
        body.publicDescription ?? null,
        body.secretDescription ?? null,
        body.stateText ?? null,
        body.visibility,
        body.isEventLocation,
        toNullableDate(body.expiresAt)
      ]
    );

    await query(
      `
      INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, after_json)
      VALUES ($1, $2, 'location.create', 'location', $3, $4)
      `,
      [campaignId, auth.user.user_id, location?.location_id, JSON.stringify(location)]
    );

    return reply.code(201).send(location);
  });

  app.patch("/api/campaigns/:campaignId/locations/:locationId", async (request, reply) => {
    const { campaignId, locationId } = locationParamsSchema.parse(request.params);
    const auth = await requireGameMaster(request, campaignId);
    const body = locationPatchSchema.parse(request.body);

    const before = await queryOne(
      "SELECT * FROM location WHERE campaign_id = $1 AND location_id = $2",
      [campaignId, locationId]
    );

    if (!before) {
      return reply.code(404).send({ error: "Location not found" });
    }

    const location = await queryOne(
      `
      UPDATE location
      SET
        name = COALESCE($3, name),
        public_description = COALESCE($4, public_description),
        secret_description = COALESCE($5, secret_description),
        parent_location_id = COALESCE($6, parent_location_id),
        visibility = COALESCE($7, visibility),
        location_type = COALESCE($8, location_type),
        state_text = COALESCE($9, state_text),
        is_event_location = COALESCE($10, is_event_location),
        expires_at = COALESCE($11, expires_at),
        status = COALESCE($12, status),
        archived_at = CASE WHEN $12 = 'archived' THEN NOW() ELSE archived_at END,
        updated_at = NOW()
      WHERE campaign_id = $1 AND location_id = $2
      RETURNING *
      `,
      [
        campaignId,
        locationId,
        body.name ?? null,
        body.publicDescription ?? null,
        body.secretDescription ?? null,
        body.parentLocationId ?? null,
        body.visibility ?? null,
        body.locationType ?? null,
        body.stateText ?? null,
        body.isEventLocation ?? null,
        toNullableDate(body.expiresAt),
        body.status ?? null
      ]
    );

    await query(
      `
      INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, before_json, after_json)
      VALUES ($1, $2, 'location.update', 'location', $3, $4, $5)
      `,
      [
        campaignId,
        auth.user.user_id,
        locationId,
        JSON.stringify(before),
        JSON.stringify(location)
      ]
    );

    return location;
  });

  app.delete("/api/campaigns/:campaignId/locations/:locationId", async (request, reply) => {
    const { campaignId, locationId } = locationParamsSchema.parse(request.params);
    const auth = await requireGameMaster(request, campaignId);

    const location = await queryOne(
      `
      UPDATE location
      SET status = 'archived',
          archived_at = NOW(),
          updated_at = NOW()
      WHERE campaign_id = $1 AND location_id = $2
      RETURNING *
      `,
      [campaignId, locationId]
    );

    if (!location) {
      return reply.code(404).send({ error: "Location not found" });
    }

    await query(
      `
      INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, after_json)
      VALUES ($1, $2, 'location.archive', 'location', $3, $4)
      `,
      [campaignId, auth.user.user_id, locationId, JSON.stringify(location)]
    );

    return { ok: true, location };
  });

  app.post("/api/campaigns/:campaignId/locations/:locationId/activate", async (request, reply) => {
    const { campaignId, locationId } = locationParamsSchema.parse(request.params);
    const auth = await requireGameMaster(request, campaignId);

    const location = await queryOne<{ location_id: string; name: string }>(
      `
      SELECT location_id, name
      FROM location
      WHERE campaign_id = $1 AND location_id = $2 AND status <> 'archived'
      `,
      [campaignId, locationId]
    );

    if (!location) {
      return reply.code(404).send({ error: "Location not found" });
    }

    await withTransaction(async (client) => {
      await setActiveLocation(client, campaignId, locationId);
      await writeLocationEvent(client, {
        campaignId,
        userId: auth.user.user_id,
        eventType: "location_activated",
        title: `Активная локация: ${location.name}`,
        description: "ГМ сменил центральную сцену игровой комнаты.",
        locationId,
        chatMessage: `ГМ меняет активную локацию: ${location.name}.`
      });
    });

    return { ok: true, activeLocationId: String(locationId) };
  });

  app.post("/api/campaigns/:campaignId/locations/:locationId/image", async (request, reply) => {
    const { campaignId, locationId } = locationParamsSchema.parse(request.params);
    const auth = await requireGameMaster(request, campaignId);

    const location = await queryOne(
      "SELECT location_id FROM location WHERE campaign_id = $1 AND location_id = $2",
      [campaignId, locationId]
    );

    if (!location) {
      return reply.code(404).send({ error: "Location not found" });
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

    const filename = safeUploadedFilename(file.filename);
    const relativeDir = path.join("campaigns", String(campaignId), "locations");
    const absoluteDir = path.join(uploadRoot, relativeDir);
    const absolutePath = path.join(absoluteDir, filename);
    const publicUrl = `/uploads/${relativeDir.replaceAll(path.sep, "/")}/${filename}`;

    await mkdir(absoluteDir, { recursive: true });
    await writeFile(absolutePath, buffer);

    const attachment = await withTransaction(async (client) => {
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
            uploadedFor: "location_cover",
            locationId
          })
        ]
      );

      await client.query(
        `
        UPDATE location
        SET cover_attachment_id = $1,
            updated_at = NOW()
        WHERE campaign_id = $2 AND location_id = $3
        `,
        [inserted.rows[0].attachment_id, campaignId, locationId]
      );

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, after_json)
        VALUES ($1, $2, 'location.image.upload', 'attachment', $3, $4)
        `,
        [
          campaignId,
          auth.user.user_id,
          inserted.rows[0].attachment_id,
          JSON.stringify(inserted.rows[0])
        ]
      );

      return inserted.rows[0];
    });

    return reply.code(201).send({ attachment });
  });

  app.post("/api/campaigns/:campaignId/locations/:locationId/grant-access", async (request, reply) => {
    const { campaignId, locationId } = locationParamsSchema.parse(request.params);
    const auth = await requireGameMaster(request, campaignId);
    const body = accessBodySchema.parse(request.body);

    const result = await withTransaction(async (client) => {
      const location = await client.query<{ name: string }>(
        "SELECT name FROM location WHERE campaign_id = $1 AND location_id = $2",
        [campaignId, locationId]
      );

      if (!location.rows[0]) {
        throw new Error("Location not found");
      }

      const access = await client.query(
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
        RETURNING *
        `,
        [campaignId, body.userId, locationId, auth.user.user_id, body.reason ?? null]
      );

      await writeLocationEvent(client, {
        campaignId,
        userId: auth.user.user_id,
        eventType: "location_access_granted",
        title: `Открыт доступ к локации: ${location.rows[0].name}`,
        description: body.reason ?? null,
        locationId,
        chatMessage: `ГМ открывает доступ к локации: ${location.rows[0].name}.`
      });

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, after_json)
        VALUES ($1, $2, 'location.access.grant', 'location', $3, $4)
        `,
        [campaignId, auth.user.user_id, locationId, JSON.stringify(access.rows[0])]
      );

      return access.rows[0];
    });

    return { ok: true, access: result };
  });

  app.post("/api/campaigns/:campaignId/locations/:locationId/revoke-access", async (request, reply) => {
    const { campaignId, locationId } = locationParamsSchema.parse(request.params);
    const auth = await requireGameMaster(request, campaignId);
    const body = accessBodySchema.parse(request.body);

    const access = await withTransaction(async (client) => {
      const updated = await client.query(
        `
        UPDATE player_location_access
        SET revoked_at = NOW(),
            reason = $4,
            note = $4,
            updated_at = NOW()
        WHERE campaign_id = $1
          AND location_id = $2
          AND user_id = $3
        RETURNING *
        `,
        [campaignId, locationId, body.userId, body.reason ?? null]
      );

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, after_json)
        VALUES ($1, $2, 'location.access.revoke', 'location', $3, $4)
        `,
        [campaignId, auth.user.user_id, locationId, JSON.stringify(updated.rows[0] ?? {})]
      );

      return updated.rows[0] ?? null;
    });

    return { ok: true, access };
  });

  app.post("/api/campaigns/:campaignId/location-travel-requests", async (request, reply) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const auth = await requireCampaignMember(request, campaignId);

    if (!canCreateTravelRequest(auth.member.role)) {
      return reply.code(403).send({ error: "Only players can create travel requests" });
    }

    const body = travelRequestBodySchema.parse(request.body);

    const requestRow = await queryOne(
      `
      INSERT INTO gm_request (
        campaign_id,
        requester_user_id,
        requester_character_id,
        request_type,
        title,
        description,
        target_kind,
        target_location_id,
        action_payload,
        status
      )
      VALUES ($1, $2, $3, 'location_travel', 'Запрос перехода в локацию', $4, 'location', $5, $6, 'pending')
      RETURNING *
      `,
      [
        campaignId,
        auth.user.user_id,
        body.characterId ?? null,
        body.message ?? null,
        body.targetLocationId,
        JSON.stringify({ message: body.message ?? null })
      ]
    );

    return reply.code(201).send(requestRow);
  });

  app.get("/api/campaigns/:campaignId/gm-requests", async (request) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    await requireGameMaster(request, campaignId);

    return query(
      `
      SELECT
        gr.request_id,
        gr.request_type,
        gr.status,
        gr.title,
        gr.description AS message,
        gr.gm_comment,
        gr.created_at,
        gr.resolved_at,
        JSONB_BUILD_OBJECT(
          'user_id', u.user_id,
          'display_name', u.display_name,
          'username', u.username
        ) AS requester,
        CASE
          WHEN ch.character_id IS NULL THEN NULL
          ELSE JSONB_BUILD_OBJECT(
            'character_id', ch.character_id,
            'name', ch.name
          )
        END AS character,
        JSONB_BUILD_OBJECT(
          'location_id', l.location_id,
          'name', l.name,
          'visibility', l.visibility,
          'status', l.status
        ) AS target_location
      FROM gm_request gr
      JOIN app_user u ON u.user_id = gr.requester_user_id
      LEFT JOIN "character" ch ON ch.character_id = gr.requester_character_id
      LEFT JOIN location l ON l.location_id = gr.target_location_id
      WHERE gr.campaign_id = $1
        AND gr.request_type = 'location_travel'
        AND gr.status = 'pending'
      ORDER BY gr.created_at ASC
      `,
      [campaignId]
    );
  });

  app.post("/api/campaigns/:campaignId/gm-requests/:requestId/approve", async (request, reply) => {
    const { campaignId, requestId } = gmRequestParamsSchema.parse(request.params);
    const auth = await requireGameMaster(request, campaignId);
    const body = gmResolutionBodySchema.parse(request.body);

    const result = await withTransaction(async (client) => {
      const requestRow = await client.query<{
        request_id: number;
        requester_user_id: number;
        requester_character_id: number | null;
        target_location_id: number;
        target_location_name: string;
      }>(
        `
        SELECT
          gr.request_id,
          gr.requester_user_id,
          gr.requester_character_id,
          gr.target_location_id,
          l.name AS target_location_name
        FROM gm_request gr
        JOIN location l ON l.location_id = gr.target_location_id
        WHERE gr.campaign_id = $1
          AND gr.request_id = $2
          AND gr.request_type = 'location_travel'
          AND gr.status = 'pending'
        FOR UPDATE OF gr
        `,
        [campaignId, requestId]
      );

      const travelRequest = requestRow.rows[0];

      if (!travelRequest) {
        throw new Error("Pending travel request not found");
      }

      await client.query(
        `
        UPDATE gm_request
        SET status = 'approved',
            gm_comment = $3,
            resolved_by_gm_user_id = $4,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE campaign_id = $1 AND request_id = $2
        `,
        [campaignId, requestId, body.response ?? null, auth.user.user_id]
      );

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
          campaignId,
          travelRequest.requester_user_id,
          travelRequest.target_location_id,
          auth.user.user_id,
          body.response ?? "Переход одобрен ГМ."
        ]
      );

      if (travelRequest.requester_character_id) {
        await client.query(
          `
          UPDATE "character"
          SET current_location_id = $1,
              updated_at = NOW()
          WHERE campaign_id = $2 AND character_id = $3
          `,
          [
            travelRequest.target_location_id,
            campaignId,
            travelRequest.requester_character_id
          ]
        );
      }

      await setActiveLocation(client, campaignId, travelRequest.target_location_id);

      await writeLocationEvent(client, {
        campaignId,
        userId: auth.user.user_id,
        eventType: "location_travel_approved",
        title: `Переход одобрен: ${travelRequest.target_location_name}`,
        description: body.response ?? null,
        locationId: travelRequest.target_location_id,
        chatMessage:
          body.response ??
          `ГМ одобряет переход в локацию: ${travelRequest.target_location_name}.`
      });

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, after_json)
        VALUES ($1, $2, 'location.travel.approve', 'gm_request', $3, $4)
        `,
        [
          campaignId,
          auth.user.user_id,
          requestId,
          JSON.stringify({
            targetLocationId: travelRequest.target_location_id,
            response: body.response ?? null
          })
        ]
      );

      return { ok: true, requestId, targetLocationId: travelRequest.target_location_id };
    });

    return result;
  });

  app.post("/api/campaigns/:campaignId/gm-requests/:requestId/reject", async (request, reply) => {
    const { campaignId, requestId } = gmRequestParamsSchema.parse(request.params);
    const auth = await requireGameMaster(request, campaignId);
    const body = gmResolutionBodySchema.parse(request.body);

    const result = await withTransaction(async (client) => {
      const requestRow = await client.query<{
        request_id: number;
        requester_user_id: number;
        target_location_id: number | null;
        target_location_name: string | null;
      }>(
        `
        SELECT
          gr.request_id,
          gr.requester_user_id,
          gr.target_location_id,
          l.name AS target_location_name
        FROM gm_request gr
        LEFT JOIN location l ON l.location_id = gr.target_location_id
        WHERE gr.campaign_id = $1
          AND gr.request_id = $2
          AND gr.request_type = 'location_travel'
          AND gr.status = 'pending'
        FOR UPDATE OF gr
        `,
        [campaignId, requestId]
      );

      const travelRequest = requestRow.rows[0];

      if (!travelRequest) {
        throw new Error("Pending travel request not found");
      }

      await client.query(
        `
        UPDATE gm_request
        SET status = 'rejected',
            gm_comment = $3,
            resolved_by_gm_user_id = $4,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE campaign_id = $1 AND request_id = $2
        `,
        [campaignId, requestId, body.response ?? null, auth.user.user_id]
      );

      const chatId = await ensureCampaignChat(client, campaignId);
      await client.query(
        `
        INSERT INTO chat_message (
          chat_id,
          sender_user_id,
          body,
          message_type,
          visibility,
          metadata_json
        )
        VALUES ($1, $2, $3, 'system', 'player_only', $4)
        `,
        [
          chatId,
          auth.user.user_id,
          body.response ?? "ГМ отклонил запрос перехода.",
          JSON.stringify({
            requestId,
            targetLocationId: travelRequest.target_location_id,
            targetUserId: travelRequest.requester_user_id
          })
        ]
      );

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, after_json)
        VALUES ($1, $2, 'location.travel.reject', 'gm_request', $3, $4)
        `,
        [
          campaignId,
          auth.user.user_id,
          requestId,
          JSON.stringify({
            targetLocationId: travelRequest.target_location_id,
            response: body.response ?? null
          })
        ]
      );

      return { ok: true, requestId };
    });

    return result;
  });
}

