import { FastifyInstance } from "fastify";
import { z } from "zod";
import { TokenService } from "../services/TokenService";

const campaignParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

const sceneTokenParamsSchema = campaignParamsSchema.extend({
  sceneId: z.coerce.number().int().positive()
});

const tokenParamsSchema = campaignParamsSchema.extend({
  tokenId: z.coerce.number().int().positive()
});

const tokenVisibilitySchema = z.enum(["public", "gm_only", "hidden"]);

const tokenBodySchema = z.object({
  entityType: z.enum(["character", "npc", "marker"]),
  entityId: z.coerce.number().int().positive().optional().nullable(),
  x: z.coerce.number().min(0).max(100).default(50),
  y: z.coerce.number().min(0).max(100).default(50),
  label: z.string().trim().max(80).optional().nullable(),
  size: z.coerce.number().positive().max(10).default(1),
  visibility: tokenVisibilitySchema.default("public"),
  imageAttachmentId: z.coerce.number().int().positive().optional().nullable()
});

const tokenPatchSchema = z.object({
  x: z.coerce.number().min(0).max(100).optional(),
  y: z.coerce.number().min(0).max(100).optional(),
  label: z.string().trim().max(80).optional().nullable(),
  size: z.coerce.number().positive().max(10).optional(),
  visibility: tokenVisibilitySchema.optional(),
  imageAttachmentId: z.coerce.number().int().positive().optional().nullable()
});

export async function tokensRoutes(app: FastifyInstance) {
  app.get("/api/campaigns/:campaignId/scenes/:sceneId/tokens", async (request) => {
    const { campaignId, sceneId } = sceneTokenParamsSchema.parse(request.params);
    return TokenService.listForRequest(request, campaignId, sceneId);
  });

  app.post("/api/campaigns/:campaignId/scenes/:sceneId/tokens", async (request, reply) => {
    const { campaignId, sceneId } = sceneTokenParamsSchema.parse(request.params);
    const body = tokenBodySchema.parse(request.body);
    const token = await TokenService.createForRequest(
      request,
      campaignId,
      sceneId,
      body
    );

    return reply.code(201).send(token);
  });

  app.patch("/api/campaigns/:campaignId/tokens/:tokenId", async (request, reply) => {
    const { campaignId, tokenId } = tokenParamsSchema.parse(request.params);
    const body = tokenPatchSchema.parse(request.body);
    const token = await TokenService.updateForRequest(
      request,
      campaignId,
      tokenId,
      body
    );

    if (!token) {
      return reply.code(404).send({ error: "Token not found" });
    }

    return token;
  });

  app.delete("/api/campaigns/:campaignId/tokens/:tokenId", async (request, reply) => {
    const { campaignId, tokenId } = tokenParamsSchema.parse(request.params);
    const token = await TokenService.archiveForRequest(request, campaignId, tokenId);

    if (!token) {
      return reply.code(404).send({ error: "Token not found" });
    }

    return { ok: true, token };
  });
}
