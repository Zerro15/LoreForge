import { CurrentUser } from "../auth/session";
import { CampaignMember } from "../access/campaignAccess";
import { CurrentMemberPermissions } from "../domain/access/permissions";
import { canReceiveRealtimeEvent, RealtimeEvent } from "./events";

type RealtimeSocket = {
  readyState: number;
  send: (payload: string) => void;
  on: (event: "close" | "error", listener: () => void) => void;
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

  broadcast(campaignId: string | number, event: RealtimeEvent) {
    const room = this.rooms.get(roomName(campaignId));

    if (!room) {
      return;
    }

    const payload = JSON.stringify(event);

    for (const client of room) {
      if (
        client.socket.readyState === SOCKET_OPEN &&
        canReceiveRealtimeEvent(client.permissions, event, client.user.user_id)
      ) {
        client.socket.send(payload);
      }
    }
  }

  count(campaignId: string | number) {
    return this.rooms.get(roomName(campaignId))?.size ?? 0;
  }
}

export const realtimeRooms = new RealtimeRooms();
