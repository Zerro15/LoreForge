import { FastifyInstance } from "fastify";
import { z } from "zod";
import { realtimeRooms } from "../realtime/rooms";
import { VisionService } from "../services/VisionService";

const campaignSceneParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive(),
  sceneId: z.coerce.number().int().positive()
});

const pointSchema = z.object({
  x: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100)
});

const areaSchema = z.object({
  type: z.enum(["rect", "polygon"]).optional(),
  x: z.coerce.number().min(0).max(100).optional(),
  y: z.coerce.number().min(0).max(100).optional(),
  width: z.coerce.number().min(0).max(100).optional(),
  height: z.coerce.number().min(0).max(100).optional(),
  points: z.array(pointSchema).optional()
});

const revealBodySchema = z.object({
  userId: z.coerce.number().int().positive(),
  area: areaSchema
});

const revealAllBodySchema = z.object({
  userId: z.coerce.number().int().positive()
});

const hideAreaBodySchema = z.object({
  userId: z.coerce.number().int().positive().optional().nullable(),
  area: areaSchema
});

export async function visionRoutes(app: FastifyInstance) {
  app.get("/api/campaigns/:campaignId/scenes/:sceneId/visibility", async (request) => {
    const { campaignId, sceneId } = campaignSceneParamsSchema.parse(request.params);
    return VisionService.getForRequest(request, campaignId, sceneId);
  });

  app.post("/api/campaigns/:campaignId/scenes/:sceneId/reveal", async (request) => {
    const { campaignId, sceneId } = campaignSceneParamsSchema.parse(request.params);
    const body = revealBodySchema.parse(request.body);
    const visibility = await VisionService.revealForRequest(
      request,
      campaignId,
      sceneId,
      body
    );

    realtimeRooms.broadcast(
      campaignId,
      {
        type: "vision.updated",
        payload: {
          campaignId: String(campaignId),
          sceneId: String(sceneId),
          userId: String(body.userId),
          visibilityData: visibility
        }
      },
      request.log
    );

    return {
      ok: true,
      visibility
    };
  });

  app.post("/api/campaigns/:campaignId/scenes/:sceneId/reveal-all", async (request) => {
    const { campaignId, sceneId } = campaignSceneParamsSchema.parse(request.params);
    const { userId } = revealAllBodySchema.parse(request.body);
    const visibility = await VisionService.revealAllForRequest(
      request,
      campaignId,
      sceneId,
      userId
    );

    realtimeRooms.broadcast(
      campaignId,
      {
        type: "vision.updated",
        payload: {
          campaignId: String(campaignId),
          sceneId: String(sceneId),
          userId: String(userId),
          visibilityData: visibility
        }
      },
      request.log
    );

    return {
      ok: true,
      visibility
    };
  });

  app.post("/api/campaigns/:campaignId/scenes/:sceneId/hide-area", async (request) => {
    const { campaignId, sceneId } = campaignSceneParamsSchema.parse(request.params);
    const body = hideAreaBodySchema.parse(request.body);
    const visibility = await VisionService.hideAreaForRequest(
      request,
      campaignId,
      sceneId,
      body
    );

    if (body.userId) {
      realtimeRooms.broadcast(
        campaignId,
        {
          type: "vision.updated",
          payload: {
            campaignId: String(campaignId),
            sceneId: String(sceneId),
            userId: String(body.userId),
            visibilityData: visibility
          }
        },
        request.log
      );
    }

    return {
      ok: true,
      visibility
    };
  });
}
