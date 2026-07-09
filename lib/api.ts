import type {
  CampaignSummary,
  Character,
  ChatMessage,
  CurrentUser,
  Dashboard,
  GMRequest,
  Location,
  Npc,
  Scene,
  SceneToken,
  SessionLog,
  TokenVisibility,
  Tag,
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
      credentials: "include",
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

export function createCampaign(body: {
  title: string;
  description?: string | null;
  visibility: "private" | "public";
  maxPlayers: number;
  worldPluginId?: number | null;
}) {
  return requestApi<CampaignSummary>("/api/campaigns", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

export function getDashboard(campaignId: string) {
  return requestApi<Dashboard>(`/api/campaigns/${campaignId}/dashboard`);
}

export function getCharacters(campaignId: string) {
  return requestApi<Character[]>(`/api/campaigns/${campaignId}/characters`);
}

export type CharacterInput = {
  name: string;
  title?: string | null;
  publicDescription?: string | null;
  privateNotes?: string | null;
  gmNotes?: string | null;
  statusText?: string | null;
  visibility: Visibility;
  status?: "active" | "archived";
  ownerUserId?: number | null;
};

export function getCharacter(campaignId: string, characterId: string) {
  return requestApi<Character>(
    `/api/campaigns/${campaignId}/characters/${characterId}`
  );
}

export function createCharacter(campaignId: string, body: CharacterInput) {
  return requestApi<Character>(`/api/campaigns/${campaignId}/characters`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

export function updateCharacter(
  campaignId: string,
  characterId: string,
  body: Partial<CharacterInput>
) {
  return requestApi<Character>(
    `/api/campaigns/${campaignId}/characters/${characterId}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}

export function archiveCharacter(campaignId: string, characterId: string) {
  return requestApi<{ ok: true; character: Character }>(
    `/api/campaigns/${campaignId}/characters/${characterId}`,
    {
      method: "DELETE"
    }
  );
}

export function getNpcs(campaignId: string) {
  return requestApi<Npc[]>(`/api/campaigns/${campaignId}/npcs`);
}

export type NpcInput = {
  name: string;
  title?: string | null;
  publicDescription?: string | null;
  secretDescription?: string | null;
  gmSecrets?: string | null;
  campaignJournal?: string | null;
  locationId?: number | null;
  visibility: Visibility;
  statusText?: string | null;
  tagIds?: number[];
};

export function getNpc(campaignId: string, npcId: string) {
  return requestApi<Npc>(`/api/campaigns/${campaignId}/npcs/${npcId}`);
}

export function createNpc(campaignId: string, body: NpcInput) {
  return requestApi<Npc>(`/api/campaigns/${campaignId}/npcs`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

export function updateNpc(
  campaignId: string,
  npcId: string,
  body: Partial<NpcInput>
) {
  return requestApi<Npc>(`/api/campaigns/${campaignId}/npcs/${npcId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

export function archiveNpc(campaignId: string, npcId: string) {
  return requestApi<{ ok: true; npc: Npc }>(
    `/api/campaigns/${campaignId}/npcs/${npcId}`,
    {
      method: "DELETE"
    }
  );
}

export function getTags(campaignId: string) {
  return requestApi<Tag[]>(`/api/campaigns/${campaignId}/tags`);
}

export function createTag(
  campaignId: string,
  body: { name: string; color?: string | null }
) {
  return requestApi<Tag>(`/api/campaigns/${campaignId}/tags`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

export function getLocations(campaignId: string) {
  return requestApi<Location[]>(`/api/campaigns/${campaignId}/locations`);
}

export function getLocation(campaignId: string, locationId: string) {
  return requestApi<Location>(
    `/api/campaigns/${campaignId}/locations/${locationId}`
  );
}

export function createLocation(
  campaignId: string,
  body: {
    name: string;
    publicDescription?: string | null;
    secretDescription?: string | null;
    parentLocationId?: number | null;
    visibility: Visibility;
    locationType?: string | null;
    stateText?: string | null;
    isEventLocation?: boolean;
    expiresAt?: string | null;
  }
) {
  return requestApi<Location>(`/api/campaigns/${campaignId}/locations`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

export function updateLocation(
  campaignId: string,
  locationId: string,
  body: Partial<{
    name: string;
    publicDescription: string | null;
    secretDescription: string | null;
    parentLocationId: number | null;
    visibility: Visibility;
    locationType: string | null;
    stateText: string | null;
    isEventLocation: boolean;
    expiresAt: string | null;
    status: "active" | "hidden" | "archived";
  }>
) {
  return requestApi<Location>(
    `/api/campaigns/${campaignId}/locations/${locationId}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}

export function archiveLocation(campaignId: string, locationId: string) {
  return requestApi<{ ok: true }>(
    `/api/campaigns/${campaignId}/locations/${locationId}`,
    {
      method: "DELETE"
    }
  );
}

export function activateLocation(campaignId: string, locationId: string) {
  return requestApi<{ ok: true; activeLocationId: string }>(
    `/api/campaigns/${campaignId}/locations/${locationId}/activate`,
    {
      method: "POST"
    }
  );
}

export function uploadLocationImage(
  campaignId: string,
  locationId: string,
  file: File
) {
  const body = new FormData();
  body.append("file", file);

  return requestApi<{ attachment: unknown }>(
    `/api/campaigns/${campaignId}/locations/${locationId}/image`,
    {
      method: "POST",
      body
    }
  );
}

export type SceneInput = {
  name: string;
  sceneType?: string | null;
  publicDescription?: string | null;
  gmDescription?: string | null;
  visibility: Visibility;
  sortOrder?: number;
};

export function getScenes(campaignId: string, locationId?: string | null) {
  const query = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
  return requestApi<Scene[]>(`/api/campaigns/${campaignId}/scenes${query}`);
}

export function createScene(
  campaignId: string,
  locationId: string,
  body: SceneInput
) {
  return requestApi<Scene>(
    `/api/campaigns/${campaignId}/locations/${locationId}/scenes`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}

export function updateScene(
  campaignId: string,
  sceneId: string,
  body: Partial<SceneInput> & { status?: "active" | "hidden" | "archived" }
) {
  return requestApi<Scene>(`/api/campaigns/${campaignId}/scenes/${sceneId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

export function archiveScene(campaignId: string, sceneId: string) {
  return requestApi<{ ok: true; scene: Scene }>(
    `/api/campaigns/${campaignId}/scenes/${sceneId}`,
    {
      method: "DELETE"
    }
  );
}

export function activateScene(campaignId: string, sceneId: string) {
  return requestApi<{ ok: true; activeSceneId: string; activeLocationId: string }>(
    `/api/campaigns/${campaignId}/scenes/${sceneId}/activate`,
    {
      method: "POST"
    }
  );
}

export function uploadSceneImage(
  campaignId: string,
  sceneId: string,
  file: File
) {
  const body = new FormData();
  body.append("file", file);

  return requestApi<{ sceneImage: unknown; attachment: unknown }>(
    `/api/campaigns/${campaignId}/scenes/${sceneId}/image`,
    {
      method: "POST",
      body
    }
  );
}

export function movePlayerToScene(
  campaignId: string,
  sceneId: string,
  body: { userId: number; characterId?: number | null; reason?: string | null }
) {
  return requestApi<{ ok: true; scene: Scene }>(
    `/api/campaigns/${campaignId}/scenes/${sceneId}/move-player`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}

export type SceneTokenInput = {
  entityType: "character" | "npc" | "marker";
  entityId?: number | null;
  x?: number;
  y?: number;
  label?: string | null;
  size?: number;
  visibility?: TokenVisibility;
  imageAttachmentId?: number | null;
};

export function getSceneTokens(campaignId: string, sceneId: string) {
  return requestApi<SceneToken[]>(
    `/api/campaigns/${campaignId}/scenes/${sceneId}/tokens`
  );
}

export function createSceneToken(
  campaignId: string,
  sceneId: string,
  body: SceneTokenInput
) {
  return requestApi<SceneToken>(
    `/api/campaigns/${campaignId}/scenes/${sceneId}/tokens`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}

export function updateSceneToken(
  campaignId: string,
  tokenId: string,
  body: Partial<Pick<SceneTokenInput, "x" | "y" | "label" | "size" | "visibility">>
) {
  return requestApi<SceneToken>(`/api/campaigns/${campaignId}/tokens/${tokenId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

export function archiveSceneToken(campaignId: string, tokenId: string) {
  return requestApi<{ ok: true; token: SceneToken }>(
    `/api/campaigns/${campaignId}/tokens/${tokenId}`,
    {
      method: "DELETE"
    }
  );
}

export function grantLocationAccess(
  campaignId: string,
  locationId: string,
  body: { userId: number; reason?: string | null }
) {
  return requestApi<{ ok: true }>(
    `/api/campaigns/${campaignId}/locations/${locationId}/grant-access`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}

export function revokeLocationAccess(
  campaignId: string,
  locationId: string,
  body: { userId: number; reason?: string | null }
) {
  return requestApi<{ ok: true }>(
    `/api/campaigns/${campaignId}/locations/${locationId}/revoke-access`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
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

export function getGmRequests(campaignId: string) {
  return requestApi<GMRequest[]>(`/api/campaigns/${campaignId}/gm-requests`);
}

export function createTravelRequest(
  campaignId: string,
  body: {
    targetLocationId: number;
    characterId?: number | null;
    message?: string | null;
  }
) {
  return requestApi<GMRequest>(
    `/api/campaigns/${campaignId}/location-travel-requests`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}

export function approveGmRequest(
  campaignId: string,
  requestId: string,
  body: { response?: string | null }
) {
  return requestApi<{ ok: true }>(
    `/api/campaigns/${campaignId}/gm-requests/${requestId}/approve`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}

export function rejectGmRequest(
  campaignId: string,
  requestId: string,
  body: { response?: string | null }
) {
  return requestApi<{ ok: true }>(
    `/api/campaigns/${campaignId}/gm-requests/${requestId}/reject`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}

export function register(body: {
  email: string;
  password: string;
  displayName: string;
}) {
  return requestApi<CurrentUser>("/api/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

export function login(body: { email: string; password: string }) {
  return requestApi<CurrentUser>("/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

export function logout() {
  return requestApi<{ ok: true }>("/api/auth/logout", {
    method: "POST"
  });
}

export function getCurrentUser() {
  return requestApi<CurrentUser>("/api/auth/me");
}

export function rollDice(
  campaignId: string,
  body: {
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
