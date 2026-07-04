import { FastifyInstance } from "fastify";
import { PoolClient } from "pg";
import { z } from "zod";
import {
  getCampaignAccess,
  requireCampaignMember,
  requireGameMaster
} from "../access/campaignAccess";
import { query, queryOne, withTransaction } from "../db";

const campaignParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

const npcParamsSchema = campaignParamsSchema.extend({
  npcId: z.coerce.number().int().positive()
});

const visibilitySchema = z.enum([
  "public",
  "party_only",
  "player_only",
  "gm_only",
  "hidden_until_discovered"
]);

const npcBodySchema = z.object({
  name: z.string().trim().min(2),
  title: z.string().trim().optional().nullable(),
  publicDescription: z.string().trim().optional().nullable(),
  secretDescription: z.string().trim().optional().nullable(),
  gmSecrets: z.string().trim().optional().nullable(),
  campaignJournal: z.string().trim().optional().nullable(),
  locationId: z.coerce.number().int().positive().optional().nullable(),
  visibility: visibilitySchema.default("hidden_until_discovered"),
  statusText: z.string().trim().optional().nullable(),
  tagIds: z.array(z.coerce.number().int().positive()).default([])
});

const npcPatchSchema = npcBodySchema.partial();

const tagBodySchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().trim().max(40).optional().nullable()
});

type Queryable = Pick<PoolClient, "query">;

async function replaceNpcTags(
  client: Queryable,
  campaignId: number,
  npcId: number,
  tagIds: number[]
) {
  await client.query(
    "DELETE FROM entity_tag WHERE campaign_id = $1 AND entity_type = 'npc' AND entity_id = $2",
    [campaignId, npcId]
  );

  const uniqueTagIds = Array.from(new Set(tagIds));

  if (uniqueTagIds.length === 0) {
    return;
  }

  const validTags = await client.query<{ tag_id: number }>(
    `
    SELECT tag_id
    FROM tag
    WHERE campaign_id = $1 AND tag_id = ANY($2::BIGINT[])
    `,
    [campaignId, uniqueTagIds]
  );

  if (validTags.rows.length !== uniqueTagIds.length) {
    const error = new Error("Some tags do not belong to this campaign");
    error.name = "Forbidden";
    throw error;
  }

  await client.query(
    `
    INSERT INTO entity_tag (campaign_id, tag_id, entity_type, entity_id)
    SELECT $1, tag_id, 'npc', $3
    FROM tag
    WHERE campaign_id = $1 AND tag_id = ANY($2::BIGINT[])
    ON CONFLICT (campaign_id, tag_id, entity_type, entity_id) DO NOTHING
    `,
    [campaignId, uniqueTagIds, npcId]
  );
}

async function selectNpc(
  campaignId: number,
  npcId: number,
  canViewSecrets: boolean,
  client?: Queryable
) {
  const sql = `
  SELECT
    n.npc_id,
    n.campaign_id,
    n.group_id,
    n.name,
    n.title,
    n.public_description,
    CASE WHEN $3::BOOLEAN THEN n.secret_description ELSE NULL END AS secret_description,
    CASE WHEN $3::BOOLEAN THEN n.gm_secrets ELSE NULL END AS gm_secrets,
    CASE WHEN $3::BOOLEAN THEN n.campaign_journal ELSE NULL END AS campaign_journal,
    n.status_text,
    n.visibility,
    n.status,
    n.archived_at,
    n.created_at,
    n.updated_at,
    COALESCE(
      JSON_AGG(
        DISTINCT JSONB_BUILD_OBJECT(
          'tag_id', t.tag_id,
          'name', t.name,
          'color', t.color
        )
      ) FILTER (WHERE t.tag_id IS NOT NULL),
      '[]'
    ) AS tags
  FROM npc n
  LEFT JOIN entity_tag et ON et.entity_type = 'npc' AND et.entity_id = n.npc_id
  LEFT JOIN tag t ON t.tag_id = et.tag_id
  WHERE n.campaign_id = $1
    AND n.npc_id = $2
    AND n.status <> 'archived'
    AND ($3::BOOLEAN OR n.visibility IN ('public', 'party_only'))
  GROUP BY n.npc_id
  `;

  const params = [campaignId, npcId, canViewSecrets];

  if (client) {
    const result = await client.query(sql, params);
    return result.rows[0] ?? null;
  }

  return queryOne(sql, params);
}

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
        n.campaign_id,
        n.name,
        n.title,
        n.public_description,
        CASE WHEN $2::BOOLEAN THEN n.secret_description ELSE NULL END AS secret_description,
        CASE WHEN $2::BOOLEAN THEN n.gm_secrets ELSE NULL END AS gm_secrets,
        CASE WHEN $2::BOOLEAN THEN n.campaign_journal ELSE NULL END AS campaign_journal,
        n.status_text,
        n.visibility,
        n.status,
        n.archived_at,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'tag_id', t.tag_id,
              'name', t.name,
              'color', t.color
            )
          ) FILTER (WHERE t.tag_id IS NOT NULL),
          '[]'
        ) AS tags
      FROM npc n
      LEFT JOIN entity_tag et ON et.entity_type = 'npc' AND et.entity_id = n.npc_id
      LEFT JOIN tag t ON t.tag_id = et.tag_id
      WHERE n.campaign_id = $1
        AND n.status <> 'archived'
        AND ($2::BOOLEAN OR n.visibility IN ('public', 'party_only'))
      GROUP BY n.npc_id
      ORDER BY n.name
      `,
      [campaignId, access.permissions.canViewGMSecrets]
    );
  });

  app.get("/api/campaigns/:campaignId/npcs/:npcId", async (request, reply) => {
    const { campaignId, npcId } = npcParamsSchema.parse(request.params);
    const access = await requireCampaignMember(request, campaignId);

    const npc = await selectNpc(
      campaignId,
      npcId,
      access.permissions.canViewGMSecrets
    );

    if (!npc) {
      return reply.code(404).send({ error: "NPC not found or unavailable" });
    }

    return npc;
  });

  app.post("/api/campaigns/:campaignId/npcs", async (request, reply) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const access = await requireGameMaster(request, campaignId);
    const body = npcBodySchema.parse(request.body);

    const npc = await withTransaction(async (client) => {
      const inserted = await client.query<{ npc_id: number }>(
        `
        INSERT INTO npc (
          campaign_id,
          name,
          title,
          public_description,
          secret_description,
          gm_secrets,
          campaign_journal,
          status_text,
          visibility,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
        RETURNING npc_id
        `,
        [
          campaignId,
          body.name,
          body.title ?? null,
          body.publicDescription ?? null,
          body.secretDescription ?? null,
          body.gmSecrets ?? null,
          body.campaignJournal ?? null,
          body.statusText ?? null,
          body.visibility
        ]
      );

      const npcId = inserted.rows[0].npc_id;
      await replaceNpcTags(client, campaignId, npcId, body.tagIds);

      const created = await selectNpc(
        campaignId,
        npcId,
        access.permissions.canViewGMSecrets,
        client
      );

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, after_json)
        VALUES ($1, $2, 'npc.create', 'npc', $3, $4)
        `,
        [campaignId, access.user.user_id, npcId, JSON.stringify(created)]
      );

      return created;
    });

    return reply.code(201).send(npc);
  });

  app.patch("/api/campaigns/:campaignId/npcs/:npcId", async (request, reply) => {
    const { campaignId, npcId } = npcParamsSchema.parse(request.params);
    const access = await requireGameMaster(request, campaignId);
    const body = npcPatchSchema.parse(request.body);

    const npc = await withTransaction(async (client) => {
      const before = await selectNpc(campaignId, npcId, true, client);

      if (!before) {
        return null;
      }

      await client.query(
        `
        UPDATE npc
        SET
          name = CASE WHEN $3::BOOLEAN THEN $4 ELSE name END,
          title = CASE WHEN $5::BOOLEAN THEN $6 ELSE title END,
          public_description = CASE WHEN $7::BOOLEAN THEN $8 ELSE public_description END,
          secret_description = CASE WHEN $9::BOOLEAN THEN $10 ELSE secret_description END,
          gm_secrets = CASE WHEN $11::BOOLEAN THEN $12 ELSE gm_secrets END,
          campaign_journal = CASE WHEN $13::BOOLEAN THEN $14 ELSE campaign_journal END,
          visibility = CASE WHEN $15::BOOLEAN THEN $16 ELSE visibility END,
          status_text = CASE WHEN $17::BOOLEAN THEN $18 ELSE status_text END,
          updated_at = NOW()
        WHERE campaign_id = $1 AND npc_id = $2 AND status <> 'archived'
        `,
        [
          campaignId,
          npcId,
          Object.hasOwn(body, "name"),
          body.name ?? null,
          Object.hasOwn(body, "title"),
          body.title ?? null,
          Object.hasOwn(body, "publicDescription"),
          body.publicDescription ?? null,
          Object.hasOwn(body, "secretDescription"),
          body.secretDescription ?? null,
          Object.hasOwn(body, "gmSecrets"),
          body.gmSecrets ?? null,
          Object.hasOwn(body, "campaignJournal"),
          body.campaignJournal ?? null,
          Object.hasOwn(body, "visibility"),
          body.visibility ?? null,
          Object.hasOwn(body, "statusText"),
          body.statusText ?? null
        ]
      );

      if (Object.hasOwn(body, "tagIds")) {
        await replaceNpcTags(client, campaignId, npcId, body.tagIds ?? []);
      }

      const updated = await selectNpc(
        campaignId,
        npcId,
        access.permissions.canViewGMSecrets,
        client
      );

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, before_json, after_json)
        VALUES ($1, $2, 'npc.update', 'npc', $3, $4, $5)
        `,
        [
          campaignId,
          access.user.user_id,
          npcId,
          JSON.stringify(before),
          JSON.stringify(updated)
        ]
      );

      return updated;
    });

    if (!npc) {
      return reply.code(404).send({ error: "NPC not found" });
    }

    return npc;
  });

  app.delete("/api/campaigns/:campaignId/npcs/:npcId", async (request, reply) => {
    const { campaignId, npcId } = npcParamsSchema.parse(request.params);
    const access = await requireGameMaster(request, campaignId);

    const archived = await withTransaction(async (client) => {
      const before = await selectNpc(campaignId, npcId, true, client);

      if (!before) {
        return null;
      }

      const result = await client.query(
        `
        UPDATE npc
        SET status = 'archived',
            archived_at = NOW(),
            updated_at = NOW()
        WHERE campaign_id = $1 AND npc_id = $2 AND status <> 'archived'
        RETURNING *
        `,
        [campaignId, npcId]
      );

      await client.query(
        `
        INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, before_json, after_json)
        VALUES ($1, $2, 'npc.archive', 'npc', $3, $4, $5)
        `,
        [
          campaignId,
          access.user.user_id,
          npcId,
          JSON.stringify(before),
          JSON.stringify(result.rows[0])
        ]
      );

      return result.rows[0] ?? null;
    });

    if (!archived) {
      return reply.code(404).send({ error: "NPC not found" });
    }

    return { ok: true, npc: archived };
  });

  app.get("/api/campaigns/:campaignId/tags", async (request) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    await requireCampaignMember(request, campaignId);

    return query(
      `
      SELECT tag_id, campaign_id, name, color, created_at, updated_at
      FROM tag
      WHERE campaign_id = $1
      ORDER BY name
      `,
      [campaignId]
    );
  });

  app.post("/api/campaigns/:campaignId/tags", async (request, reply) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const access = await requireGameMaster(request, campaignId);
    const body = tagBodySchema.parse(request.body);

    const tag = await queryOne(
      `
      INSERT INTO tag (campaign_id, name, color)
      VALUES ($1, $2, $3)
      ON CONFLICT (campaign_id, name)
      DO UPDATE SET color = EXCLUDED.color, updated_at = NOW()
      RETURNING tag_id, campaign_id, name, color, created_at, updated_at
      `,
      [campaignId, body.name, body.color ?? null]
    );

    await query(
      `
      INSERT INTO audit_log (campaign_id, user_id, action, entity_type, entity_id, after_json)
      VALUES ($1, $2, 'tag.upsert', 'tag', $3, $4)
      `,
      [campaignId, access.user.user_id, tag?.tag_id, JSON.stringify(tag)]
    );

    return reply.code(201).send(tag);
  });
}
