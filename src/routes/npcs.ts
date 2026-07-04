import { FastifyInstance } from "fastify";
import { z } from "zod";
import { NPCService } from "../services/NPCService";

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

export async function npcsRoutes(app: FastifyInstance) {
  app.get("/api/campaigns/:campaignId/npcs", async (request) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    return NPCService.listForRequest(request, campaignId);
  });

  app.get("/api/campaigns/:campaignId/npcs/:npcId", async (request, reply) => {
    const { campaignId, npcId } = npcParamsSchema.parse(request.params);
    const npc = await NPCService.getForRequest(request, campaignId, npcId);

    if (!npc) {
      return reply.code(404).send({ error: "NPC not found or unavailable" });
    }

    return npc;
  });

  app.post("/api/campaigns/:campaignId/npcs", async (request, reply) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const body = npcBodySchema.parse(request.body);
    const npc = await NPCService.createForRequest(request, campaignId, body);

    return reply.code(201).send(npc);
  });

  app.patch("/api/campaigns/:campaignId/npcs/:npcId", async (request, reply) => {
    const { campaignId, npcId } = npcParamsSchema.parse(request.params);
    const body = npcPatchSchema.parse(request.body);
    const npc = await NPCService.updateForRequest(
      request,
      campaignId,
      npcId,
      body
    );

    if (!npc) {
      return reply.code(404).send({ error: "NPC not found" });
    }

    return npc;
  });

  app.delete("/api/campaigns/:campaignId/npcs/:npcId", async (request, reply) => {
    const { campaignId, npcId } = npcParamsSchema.parse(request.params);
    const archived = await NPCService.archiveForRequest(request, campaignId, npcId);

    if (!archived) {
      return reply.code(404).send({ error: "NPC not found" });
    }

    return { ok: true, npc: archived };
  });

  app.get("/api/campaigns/:campaignId/tags", async (request) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    return NPCService.listTagsForRequest(request, campaignId);
  });

  app.post("/api/campaigns/:campaignId/tags", async (request, reply) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const body = tagBodySchema.parse(request.body);
    const tag = await NPCService.createTagForRequest(request, campaignId, body);

    return reply.code(201).send(tag);
  });
}
