import websocket from "@fastify/websocket";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getCampaignAccess } from "../access/campaignAccess";
import { realtimeRooms } from "./rooms";

const websocketParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

export function registerRealtime(app: FastifyInstance) {
  app.register(async (scope) => {
    await scope.register(websocket, {
      options: {
        maxPayload: 1024 * 32
      }
    });

    scope.get("/ws/campaign/:campaignId", { websocket: true }, async (socket, request) => {
      const { campaignId } = websocketParamsSchema.parse(request.params);
      const access = await getCampaignAccess(request, campaignId);

      if (!access) {
        socket.close(1008, "Campaign membership required");
        return;
      }

      realtimeRooms.join({
        socket,
        campaignId: String(campaignId),
        user: access.user,
        member: access.member,
        permissions: access.permissions
      })

      socket.send(
        JSON.stringify({
          type: "realtime.connected",
          payload: {
            campaignId: String(campaignId),
            room: `campaign:${campaignId}`,
            clients: realtimeRooms.count(campaignId)
          }
        })
      );

      socket.on("message", (message: { toString(): string }) => {
        if (message.toString() === "ping") {
          socket.send("pong");
        }
      });
    });
  });
}
