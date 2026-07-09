import websocket from "@fastify/websocket";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getCampaignAccess } from "../access/campaignAccess";
import { realtimeRooms } from "./rooms";

const websocketParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

const SOCKET_OPEN = 1;
const HEARTBEAT_INTERVAL_MS = 25_000;
const HEARTBEAT_TIMEOUT_MS = 70_000;

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
        request.log.warn({ campaignId }, "Realtime connection rejected: campaign membership required");
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

      request.log.info(
        {
          campaignId,
          userId: access.user.user_id,
          role: access.member.role,
          clients: realtimeRooms.count(campaignId)
        },
        "Realtime client connected"
      );

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

      let lastPongAt = Date.now();
      const heartbeat = setInterval(() => {
        if (socket.readyState !== SOCKET_OPEN) {
          clearInterval(heartbeat);
          return;
        }

        if (Date.now() - lastPongAt > HEARTBEAT_TIMEOUT_MS) {
          request.log.warn(
            {
              campaignId,
              userId: access.user.user_id,
              lastPongAgeMs: Date.now() - lastPongAt
            },
            "Realtime heartbeat timed out"
          );
          socket.close(4000, "Heartbeat timeout");
          clearInterval(heartbeat);
          return;
        }

        try {
          socket.send(
            JSON.stringify({
              type: "realtime.ping",
              payload: {
                sentAt: new Date().toISOString()
              }
            })
          );
        } catch (error) {
          request.log.warn(
            {
              campaignId,
              userId: access.user.user_id,
              error
            },
            "Realtime heartbeat send failed"
          );
          socket.close(4001, "Heartbeat send failed");
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_INTERVAL_MS);

      socket.on("close", (code?: number, reason?: Buffer) => {
        clearInterval(heartbeat);
        request.log.info(
          {
            campaignId,
            userId: access.user.user_id,
            code,
            reason: reason?.toString()
          },
          "Realtime client disconnected"
        );
      });

      socket.on("error", (error?: Error) => {
        clearInterval(heartbeat);
        request.log.warn(
          {
            campaignId,
            userId: access.user.user_id,
            error
          },
          "Realtime socket error"
        );
      });

      socket.on("message", (message: { toString(): string }) => {
        const raw = message.toString();

        if (raw === "ping") {
          socket.send("pong");
          lastPongAt = Date.now();
          return;
        }

        if (raw === "pong") {
          lastPongAt = Date.now();
          return;
        }

        try {
          const event = JSON.parse(raw) as { type?: string };
          if (event.type === "realtime.pong") {
            lastPongAt = Date.now();
          }
        } catch {
          request.log.warn(
            {
              campaignId,
              userId: access.user.user_id
            },
            "Realtime received malformed client message"
          );
        }
      });
    });
  });
}
