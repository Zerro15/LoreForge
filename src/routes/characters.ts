import { FastifyInstance } from "fastify";
import { z } from "zod";
import { CharacterService } from "../services/CharacterService";

const campaignParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

const characterParamsSchema = campaignParamsSchema.extend({
  characterId: z.coerce.number().int().positive()
});

const visibilitySchema = z.enum([
  "public",
  "party_only",
  "player_only",
  "gm_only",
  "hidden_until_discovered"
]);

const statusSchema = z.enum(["active", "archived"]);

const characterBaseSchema = z.object({
  name: z.string().trim().min(2),
  title: z.string().trim().optional().nullable(),
  publicDescription: z.string().trim().optional().nullable(),
  privateNotes: z.string().trim().optional().nullable(),
  gmNotes: z.string().trim().optional().nullable(),
  statusText: z.string().trim().optional().nullable(),
  visibility: visibilitySchema,
  status: statusSchema.optional(),
  ownerUserId: z.coerce.number().int().positive().optional().nullable()
});

const characterBodySchema = characterBaseSchema.extend({
  visibility: visibilitySchema.default("party_only")
});

const characterPatchSchema = characterBaseSchema.partial();

export async function charactersRoutes(app: FastifyInstance) {
  app.get("/api/campaigns/:campaignId/characters", async (request) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    return CharacterService.listForRequest(request, campaignId);
  });

  app.get(
    "/api/campaigns/:campaignId/characters/:characterId",
    async (request, reply) => {
      const { campaignId, characterId } = characterParamsSchema.parse(
        request.params
      );
      const character = await CharacterService.getForRequest(
        request,
        campaignId,
        characterId
      );

      if (!character) {
        return reply
          .code(404)
          .send({ error: "Character not found or unavailable" });
      }

      return character;
    }
  );

  app.post("/api/campaigns/:campaignId/characters", async (request, reply) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const body = characterBodySchema.parse(request.body);
    const character = await CharacterService.createForRequest(
      request,
      campaignId,
      body
    );

    return reply.code(201).send(character);
  });

  app.patch(
    "/api/campaigns/:campaignId/characters/:characterId",
    async (request, reply) => {
      const { campaignId, characterId } = characterParamsSchema.parse(
        request.params
      );
      const body = characterPatchSchema.parse(request.body);
      const character = await CharacterService.updateForRequest(
        request,
        campaignId,
        characterId,
        body
      );

      if (!character) {
        return reply.code(404).send({ error: "Character not found" });
      }

      return character;
    }
  );

  app.delete(
    "/api/campaigns/:campaignId/characters/:characterId",
    async (request, reply) => {
      const { campaignId, characterId } = characterParamsSchema.parse(
        request.params
      );
      const archived = await CharacterService.archiveForRequest(
        request,
        campaignId,
        characterId
      );

      if (!archived) {
        return reply.code(404).send({ error: "Character not found" });
      }

      return { ok: true, character: archived };
    }
  );
}
