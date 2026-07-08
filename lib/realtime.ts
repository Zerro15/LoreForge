"use client";

import { useEffect, useRef, useState } from "react";
import { WS_BASE_URL } from "./config";

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

export type RealtimeEvent =
  | {
      type: "scene.changed";
      payload: { campaignId: string; sceneId: string; locationId: string };
    }
  | {
      type: "token.created" | "token.updated" | "token.deleted";
      payload: {
        campaignId: string;
        tokenId: string;
        sceneId: string;
        x?: string | number;
        y?: string | number;
        visibility: "public" | "gm_only" | "hidden";
      };
    }
  | {
      type: "player.moved";
      payload: {
        campaignId: string;
        userId: string;
        characterId: string | null;
        sceneId: string;
      };
    }
  | {
      type: "chat.message.created" | "dice.rolled";
      payload: {
        campaignId: string;
        messageId: string;
        rollId?: string;
        visibility: string;
      };
    }
  | {
      type: "realtime.connected";
      payload: { campaignId: string; room: string; clients: number };
    };

function resolveWebSocketUrl(campaignId: string) {
  const base =
    WS_BASE_URL ||
    (typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${
          window.location.host
        }`
      : "");

  return `${base}/ws/campaign/${campaignId}`;
}

export function useCampaignRealtime(
  campaignId: string,
  onEvent: (event: RealtimeEvent) => void
) {
  const [status, setStatus] = useState<RealtimeStatus>("disconnected");
  const callbackRef = useRef(onEvent);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!campaignId) {
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByEffect = false;

    function connect() {
      setStatus("connecting");
      socket = new WebSocket(resolveWebSocketUrl(campaignId));

      socket.addEventListener("open", () => {
        setStatus("connected");
      });

      socket.addEventListener("message", (message) => {
        if (message.data === "pong") {
          return;
        }

        try {
          callbackRef.current(JSON.parse(String(message.data)) as RealtimeEvent);
        } catch {
          // Ignore malformed realtime messages; REST remains source of truth.
        }
      });

      socket.addEventListener("close", () => {
        setStatus("disconnected");

        if (!closedByEffect) {
          reconnectTimer = setTimeout(connect, 1500);
        }
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });
    }

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [campaignId]);

  return status;
}
