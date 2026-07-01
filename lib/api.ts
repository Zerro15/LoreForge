import type {
  CampaignSummary,
  Character,
  ChatMessage,
  Dashboard,
  Location,
  Npc,
  SessionLog,
  WorldPlugin
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

async function fetchApi<T>(path: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      return {
        data: null,
        error: `API вернул ${response.status} для ${path}`
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
  return fetchApi<CampaignSummary[]>("/api/campaigns");
}

export function getDashboard(campaignId: string) {
  return fetchApi<Dashboard>(`/api/campaigns/${campaignId}/dashboard`);
}

export function getCharacters(campaignId: string) {
  return fetchApi<Character[]>(`/api/campaigns/${campaignId}/characters`);
}

export function getNpcs(campaignId: string) {
  return fetchApi<Npc[]>(`/api/campaigns/${campaignId}/npcs`);
}

export function getLocations(campaignId: string) {
  return fetchApi<Location[]>(`/api/campaigns/${campaignId}/locations`);
}

export function getChat(campaignId: string) {
  return fetchApi<ChatMessage[]>(`/api/campaigns/${campaignId}/chat`);
}

export function getSessionLog(campaignId: string) {
  return fetchApi<SessionLog[]>(`/api/campaigns/${campaignId}/session-log`);
}

export function getWorldPlugins() {
  return fetchApi<WorldPlugin[]>("/api/world-plugins");
}
