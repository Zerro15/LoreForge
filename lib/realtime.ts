"use client";

import { useEffect, useRef, useState } from "react";
import { WS_BASE_URL } from "./config";

export type RealtimeStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

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
      type: "vision.updated";
      payload: {
        campaignId: string;
        sceneId: string;
        userId: string;
        visibilityData: unknown;
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
    }
  | {
      type: "realtime.ping" | "realtime.pong";
      payload: { sentAt: string };
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

const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_TIMEOUT_MS = 65_000;
const HEARTBEAT_CHECK_MS = 10_000;

function reconnectDelay(attempt: number) {
  return Math.min(5000, Math.max(1000, attempt * 1000));
}

function isServiceEvent(event: RealtimeEvent) {
  return (
    event.type === "realtime.connected" ||
    event.type === "realtime.ping" ||
    event.type === "realtime.pong"
  );
}

function isKnownRealtimeEvent(value: unknown): value is RealtimeEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const type = (value as { type?: unknown }).type;

  return (
    type === "scene.changed" ||
    type === "token.created" ||
    type === "token.updated" ||
    type === "token.deleted" ||
    type === "player.moved" ||
    type === "vision.updated" ||
    type === "chat.message.created" ||
    type === "dice.rolled" ||
    type === "realtime.connected" ||
    type === "realtime.ping" ||
    type === "realtime.pong"
  );
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
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let closedByEffect = false;
    let reconnectAttempt = 0;
    let lastSeenAt = Date.now();
    const url = resolveWebSocketUrl(campaignId);

    function clearReconnectTimer() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }

    function clearHeartbeatTimer() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    }

    function safeCloseSocket(
      target: WebSocket | null,
      code = 1000,
      reason = "Client cleanup"
    ) {
      if (
        target &&
        target.readyState !== WebSocket.CLOSED &&
        target.readyState !== WebSocket.CLOSING
      ) {
        target.close(code, reason);
      }
    }

    function scheduleReconnect() {
      if (closedByEffect || reconnectTimer) {
        return;
      }

      reconnectAttempt += 1;

      if (reconnectAttempt > MAX_RECONNECT_ATTEMPTS) {
        console.warn("[realtime] reconnect attempts exhausted");
        setStatus("disconnected");
        return;
      }

      const delay = reconnectDelay(reconnectAttempt);
      console.info("[realtime] reconnect in", delay);
      setStatus("reconnecting");
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    }

    function startHeartbeatWatchdog() {
      clearHeartbeatTimer();
      heartbeatTimer = setInterval(() => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          return;
        }

        if (Date.now() - lastSeenAt > HEARTBEAT_TIMEOUT_MS) {
          console.warn("[realtime] heartbeat timeout, reconnecting");
          safeCloseSocket(socket, 4002, "Client heartbeat timeout");
        }
      }, HEARTBEAT_CHECK_MS);
    }

    function connect() {
      clearReconnectTimer();
      clearHeartbeatTimer();
      setStatus(reconnectAttempt > 0 ? "reconnecting" : "connecting");
      console.info("[realtime] connecting", url);
      socket = new WebSocket(url);

      socket.addEventListener("open", () => {
        console.info("[realtime] open");
        reconnectAttempt = 0;
        lastSeenAt = Date.now();
        setStatus("connected");
        startHeartbeatWatchdog();
      });

      socket.addEventListener("message", (message) => {
        lastSeenAt = Date.now();

        if (message.data === "pong") {
          return;
        }

        let event: unknown;

        try {
          event = JSON.parse(String(message.data));
        } catch (error) {
          console.warn("[realtime] malformed message", error);
          return;
        }

        if (!isKnownRealtimeEvent(event)) {
          console.warn("[realtime] unknown event", event);
          return;
        }

        if (event.type === "realtime.ping") {
          socket?.send(
            JSON.stringify({
              type: "realtime.pong",
              payload: {
                sentAt: event.payload.sentAt
              }
            })
          );
          return;
        }

        if (isServiceEvent(event)) {
          return;
        }

        try {
          callbackRef.current(event);
        } catch (error) {
          console.error("[realtime] event handler failed", error);
        }
      });

      socket.addEventListener("close", (event) => {
        clearHeartbeatTimer();
        console.warn("[realtime] close", event.code, event.reason);

        if (closedByEffect) {
          setStatus("disconnected");
          return;
        }

        scheduleReconnect();
      });

      socket.addEventListener("error", () => {
        console.warn("[realtime] socket error", {
          readyState: socket?.readyState,
          url
        });
        safeCloseSocket(socket, 4003, "Socket error");
      });
    }

    connect();

    return () => {
      closedByEffect = true;
      clearReconnectTimer();
      clearHeartbeatTimer();
      safeCloseSocket(socket);
    };
  }, [campaignId]);

  return status;
}
