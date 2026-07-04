import { FastifyInstance } from "fastify";
import { z } from "zod";
import { CampaignService } from "../services/CampaignService";

const createCampaignBodySchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional().nullable(),
  visibility: z.enum(["private", "public"]).default("private"),
  maxPlayers: z.coerce.number().int().min(1).max(20).default(6),
  worldPluginId: z.coerce.number().int().positive().optional().nullable()
});

export async function campaignsRoutes(app: FastifyInstance) {
  app.get("/api/campaigns", async (request) => {
    return CampaignService.listForRequest(request);
  });

  app.post("/api/campaigns", async (request, reply) => {
    const body = createCampaignBodySchema.parse(request.body);
    const campaign = await CampaignService.createForRequest(request, body);

    return reply.code(201).send(campaign);
  });
}
