import { CurrentUser } from "../auth/session";
import { CampaignMember } from "../access/campaignAccess";
import { CurrentMemberPermissions } from "../domain/access/permissions";
import { canReceiveRealtimeEvent, RealtimeEvent } from "./events";

type RealtimeSocket = {
  readyState: number;
  send: (payload: string) => void;
  on(event: "close", listener: (code?: number, reason?: Buffer) => void): void;
  on(event: "error", listener: (error?: Error) => void): void;
};

const SOCKET_OPEN = 1;

export type RealtimeClient = {
  socket: RealtimeSocket;
  campaignId: string;
  user: CurrentUser;
  member: CampaignMember;
  permissions: CurrentMemberPermissions;
};

function roomName(campaignId: string | number) {
  return `campaign:${campaignId}`;
}

export class RealtimeRooms {
  private rooms = new Map<string, Set<RealtimeClient>>();

  join(client: RealtimeClient) {
    const name = roomName(client.campaignId);
    const room = this.rooms.get(name) ?? new Set<RealtimeClient>();
    room.add(client);
    this.rooms.set(name, room);

    client.socket.on("close", () => this.leave(client));
    client.socket.on("error", () => this.leave(client));
  }

  leave(client: RealtimeClient) {
    const name = roomName(client.campaignId);
    const room = this.rooms.get(name);

    if (!room) {
      return;
    }

    room.delete(client);

    if (room.size === 0) {
      this.rooms.delete(name);
    }
  }

  broadcast(campaignId: string | number, event: RealtimeEvent, logger?: {
    debug: (payload: unknown, message?: string) => void;
    warn: (payload: unknown, message?: string) => void;
  }) {
    const room = this.rooms.get(roomName(campaignId));

    if (!room) {
      return;
    }

    const payload = JSON.stringify(event);
    let delivered = 0;

    for (const client of room) {
      if (client.socket.readyState !== SOCKET_OPEN) {
        this.leave(client);
        continue;
      }

      if (canReceiveRealtimeEvent(client.permissions, event, client.user.user_id)) {
        try {
          client.socket.send(payload);
          delivered++;
        } catch (error) {
          this.leave(client);
          logger?.warn(
            {
              campaignId,
              userId: client.user.user_id,
              eventType: event.type,
              error
            },
            "Realtime send failed; removed client"
          );
        }
      }
    }

    logger?.debug(
      {
        campaignId,
        eventType: event.type,
        delivered,
        roomSize: room.size
      },
      "Realtime broadcast completed"
    );
  }

  count(campaignId: string | number) {
    return this.rooms.get(roomName(campaignId))?.size ?? 0;
  }
}

export const realtimeRooms = new RealtimeRooms();
