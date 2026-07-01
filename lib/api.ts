import type {
  CampaignSummary,
  Character,
  ChatMessage,
  Dashboard,
  Location,
  Npc,
  SessionLog,
  Visibility,
  WorldPlugin
} from "./types";
import { API_BASE_URL } from "./config";

export type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

async function requestApi<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...init?.headers
      }
    });

    if (!response.ok) {
      const fallbackMessage = `API вернул ${response.status} для ${path}`;
      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? ((await response.json().catch(() => null)) as
            | { error?: string; message?: string }
            | null)
        : null;

      return {
        data: null,
        error: payload?.error ?? payload?.message ?? fallbackMessage
      };
    }

    return { data: (await response.json()) as T, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "API LoreForge сейчас недоступен"
    };
  }
}

export function getCampaigns() {
  return requestApi<CampaignSummary[]>("/api/campaigns");
}

export function getDashboard(campaignId: string) {
  return requestApi<Dashboard>(`/api/campaigns/${campaignId}/dashboard`);
}

export function getCharacters(campaignId: string) {
  return requestApi<Character[]>(`/api/campaigns/${campaignId}/characters`);
}

export function getNpcs(campaignId: string) {
  return requestApi<Npc[]>(`/api/campaigns/${campaignId}/npcs`);
}

export function getLocations(campaignId: string) {
  return requestApi<Location[]>(`/api/campaigns/${campaignId}/locations`);
}

export function getChat(campaignId: string) {
  return requestApi<ChatMessage[]>(`/api/campaigns/${campaignId}/chat`);
}

export function getSessionLog(campaignId: string) {
  return requestApi<SessionLog[]>(`/api/campaigns/${campaignId}/session-log`);
}

export function getWorldPlugins() {
  return requestApi<WorldPlugin[]>("/api/world-plugins");
}

export function rollDice(
  campaignId: string,
  body: {
    userId: number;
    characterId?: number;
    formula: string;
    visibility: Visibility;
  }
) {
  return requestApi<unknown>(`/api/campaigns/${campaignId}/dice-roll`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}
