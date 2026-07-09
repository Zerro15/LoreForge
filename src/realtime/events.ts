import { CurrentMemberPermissions } from "../domain/access/permissions";

export type RealtimeEventType =
  | "scene.changed"
  | "token.created"
  | "token.updated"
  | "token.deleted"
  | "player.moved"
  | "vision.updated"
  | "chat.message.created"
  | "dice.rolled"
  | "realtime.ping"
  | "realtime.pong"
  | "realtime.connected";

export type SceneChangedEvent = {
  type: "scene.changed";
  payload: {
    campaignId: string;
    sceneId: string;
    locationId: string;
    visibility?: string;
  };
};

export type TokenEvent = {
  type: "token.created" | "token.updated" | "token.deleted";
  payload: {
    campaignId: string;
    tokenId: string;
    sceneId: string;
    x?: number | string;
    y?: number | string;
    visibility: "public" | "gm_only" | "hidden";
  };
};

export type PlayerMovedEvent = {
  type: "player.moved";
  payload: {
    campaignId: string;
    userId: string;
    characterId: string | null;
    sceneId: string;
    visibility?: string;
  };
};

export type ChatMessageCreatedEvent = {
  type: "chat.message.created";
  payload: {
    campaignId: string;
    messageId: string;
    visibility: string;
  };
};

export type DiceRolledEvent = {
  type: "dice.rolled";
  payload: {
    campaignId: string;
    rollId: string;
    messageId: string;
    visibility: string;
  };
};

export type VisionUpdatedEvent = {
  type: "vision.updated";
  payload: {
    campaignId: string;
    sceneId: string;
    userId: string;
    visibilityData: unknown;
  };
};

export type RealtimePingEvent = {
  type: "realtime.ping";
  payload: {
    sentAt: string;
  };
};

export type RealtimePongEvent = {
  type: "realtime.pong";
  payload: {
    sentAt: string;
  };
};

export type RealtimeConnectedEvent = {
  type: "realtime.connected";
  payload: {
    campaignId: string;
    room: string;
    clients: number;
  };
};

export type RealtimeEvent =
  | SceneChangedEvent
  | TokenEvent
  | PlayerMovedEvent
  | VisionUpdatedEvent
  | ChatMessageCreatedEvent
  | DiceRolledEvent
  | RealtimePingEvent
  | RealtimePongEvent
  | RealtimeConnectedEvent;

export function canReceiveRealtimeEvent(
  permissions: CurrentMemberPermissions,
  event: RealtimeEvent,
  userId?: string | number
) {
  if (permissions.canViewGMSecrets) {
    return true;
  }

  if (
    event.type === "realtime.ping" ||
    event.type === "realtime.pong" ||
    event.type === "realtime.connected"
  ) {
    return true;
  }

  if (event.type === "vision.updated") {
    return String(event.payload.userId) === String(userId);
  }

  if (event.type === "token.created" || event.type === "token.updated" || event.type === "token.deleted") {
    return event.payload.visibility === "public";
  }

  if (event.type === "scene.changed" || event.type === "player.moved") {
    if (permissions.role === "viewer") {
      return event.payload.visibility === "public";
    }

    return event.payload.visibility === "public" || event.payload.visibility === "party_only";
  }

  if (event.type === "chat.message.created" || event.type === "dice.rolled") {
    return event.payload.visibility === "public" || event.payload.visibility === "party_only";
  }

  return false;
}
