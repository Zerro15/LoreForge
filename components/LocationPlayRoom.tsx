"use client";

import {
  Archive,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  Lock,
  MapPinned,
  Plus,
  RefreshCw,
  Send,
  Shuffle,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activateLocation,
  activateScene,
  approveGmRequest,
  archiveLocation,
  archiveSceneToken,
  archiveScene,
  createSceneToken,
  createLocation,
  createScene,
  createTravelRequest,
  getCharacters,
  getChat,
  getCurrentUser,
  getDashboard,
  getGmRequests,
  getLocations,
  getScenes,
  getSceneTokens,
  getSceneVisibility,
  grantLocationAccess,
  hideSceneArea,
  movePlayerToScene,
  rejectGmRequest,
  revealAllScene,
  revealSceneArea,
  revokeLocationAccess,
  sendChatMessage,
  updateLocation,
  updateSceneToken,
  uploadSceneImage,
  uploadLocationImage
} from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import type {
  CampaignSummary,
  Character,
  ChatMessage as ChatMessageType,
  CurrentUser,
  Dashboard,
  GMRequest,
  Location,
  Scene,
  SceneToken,
  SceneVisibilityState,
  TokenVisibility,
  VisionArea,
  Visibility
} from "@/lib/types";
import {
  getLabel,
  locationTypeLabels,
  requestStatusLabels,
  roleLabels,
  statusLabels,
  visibilityLabels
} from "@/lib/ui-labels";
import { ChatMessage } from "./ChatMessage";
import { DiceQuickRolls } from "./DiceQuickRolls";
import { RealtimeProvider } from "./RealtimeProvider";
import { Badge, Button, Card, EmptyState, ErrorState, Input } from "./ui";
import type { RealtimeEvent } from "@/lib/realtime";

type PlayRoomState = {
  dashboard: Dashboard | null;
  locations: Location[];
  scenes: Scene[];
  tokens: SceneToken[];
  vision: SceneVisibilityState | null;
  characters: Character[];
  messages: ChatMessageType[];
  gmRequests: GMRequest[];
  currentUser: CurrentUser | null;
};

const visibilityOptions: Visibility[] = [
  "public",
  "party_only",
  "hidden_until_discovered",
  "gm_only"
];

const tokenVisibilityOptions: TokenVisibility[] = ["public", "gm_only", "hidden"];

const tokenVisibilityLabels: Record<TokenVisibility, string> = {
  public: "Видно всем",
  gm_only: "Только ГМ",
  hidden: "Скрыто"
};

type PlaySidePanel = "chat" | "dice" | "requests";

function resolveAssetUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  if (url.startsWith("http")) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

function isGmRole(role?: string | null) {
  return role === "owner" || role === "gm" || role === "co_gm";
}

function getCurrentRole(data: PlayRoomState) {
  if (!data.currentUser || !data.dashboard) {
    return null;
  }

  return (
    data.dashboard.members.find(
      (member) => String(member.user_id) === String(data.currentUser?.user_id)
    )?.role ?? null
  );
}

export function LocationVisibilityBadge({
  location
}: {
  location: Location;
}) {
  const tone =
    location.status === "archived"
      ? "muted"
      : location.visibility === "public"
        ? "green"
        : location.visibility === "gm_only"
          ? "danger"
          : "gold";

  return (
    <div className="flex flex-wrap gap-2">
      <Badge tone={tone}>
        {location.visibility === "gm_only" ? <Lock size={13} /> : <Eye size={13} />}
        {getLabel(visibilityLabels, location.visibility)}
      </Badge>
      {location.is_event_location ? <Badge tone="orange">Событие</Badge> : null}
      {location.status && location.status !== "active" ? (
        <Badge tone="muted">
          {getLabel(statusLabels, location.status, location.status)}
        </Badge>
      ) : null}
    </div>
  );
}

export function LocationImageCard({ location }: { location: Location | null }) {
  const imageUrl = resolveAssetUrl(location?.cover_attachment?.public_url);

  return (
    <div className="relative min-h-[340px] overflow-hidden rounded-3xl border border-[#273244]/90 bg-[#0B0F17]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={location?.name ?? "Локация"}
          className="absolute inset-0 h-full w-full object-cover"
          src={imageUrl}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.28),transparent_36%),linear-gradient(135deg,#111827,#0B0F17_58%,#171A26)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/40 to-transparent" />
      <div className="relative flex min-h-[340px] flex-col justify-end p-6">
        <LocationVisibilityBadge
          location={
            location ?? {
              location_id: "0",
              parent_location_id: null,
              name: "Локация",
              location_type: null,
              public_description: null,
              state_text: null,
              visibility: "gm_only",
              secret_description: null
            }
          }
        />
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          {location?.name ?? "Локация не выбрана"}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c7ccd6]">
          {location?.public_description ??
            "Картинка локации ещё не загружена. ГМ может добавить изображение в управлении локациями."}
        </p>
      </div>
    </div>
  );
}

export function SceneImageCard({
  scene,
  location,
  isGm,
  tokens,
  vision,
  members,
  campaignId,
  onTokensChanged,
  onVisionChanged
}: {
  scene: Scene | null;
  location: Location | null;
  isGm: boolean;
  tokens: SceneToken[];
  vision: SceneVisibilityState | null;
  members: Dashboard["members"];
  campaignId: string;
  onTokensChanged: () => void;
  onVisionChanged: () => void;
}) {
  const imageUrl = resolveAssetUrl(scene?.image?.attachment?.public_url);

  return (
    <div className="relative h-[calc(100vh-8.25rem)] min-h-[680px] overflow-hidden rounded-3xl border border-[#273244]/90 bg-[#0B0F17] xl:min-h-[760px]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={scene?.name ?? "Сцена"}
          className="absolute inset-0 h-full w-full object-cover"
          src={imageUrl}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_24%,rgba(139,92,246,0.26),transparent_34%),linear-gradient(135deg,#111827,#0B0F17_54%,#171A26)]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/28 to-[#0B0F17]/10" />

      <VisionLayer isGm={isGm} vision={vision} />

      {isGm ? (
        <div className="absolute right-4 top-4 z-20 rounded-full border border-[#273244] bg-[#0B0F17]/80 px-3 py-1.5 text-xs text-[#c7ccd6] shadow-xl backdrop-blur">
          NPC-инструменты · только ГМ
        </div>
      ) : null}

      <TokenLayer
        campaignId={campaignId}
        isGm={isGm}
        onChanged={onTokensChanged}
        scene={scene}
        tokens={tokens}
      />

      {isGm ? (
        <VisionManager
          campaignId={campaignId}
          members={members}
          onChanged={onVisionChanged}
          scene={scene}
        />
      ) : null}

      <div className="relative z-20 flex h-full min-h-0 flex-col justify-end p-4 md:p-5">
        <div className="flex flex-wrap gap-2">
          <Badge tone="purple">Сцена</Badge>
          {scene?.is_current_for_user ? <Badge tone="green">Вы здесь</Badge> : null}
          {scene?.visibility ? (
            <Badge tone={scene.visibility === "gm_only" ? "danger" : "gold"}>
              {getLabel(visibilityLabels, scene.visibility)}
            </Badge>
          ) : null}
        </div>
        <div className="mt-3 max-w-3xl rounded-2xl border border-[#273244]/80 bg-[#0B0F17]/72 p-4 shadow-2xl backdrop-blur">
          <p className="text-xs text-[#9CA3AF]">
            {location?.name ?? scene?.location?.name ?? "Локация не выбрана"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            {scene?.name ?? "Сцена не выбрана"}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#c7ccd6]">
            {scene?.public_description ??
              "Картинка сцены ещё не загружена. ГМ может добавить карту в управлении локациями."}
          </p>
        </div>
        {isGm && scene?.gm_description ? (
          <details className="mt-2 max-w-3xl rounded-2xl border border-dashed border-[#D6A84F]/45 bg-[#0B0F17]/72 p-3 text-sm text-[#f0dca8] backdrop-blur">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold">
              <Lock size={14} />
              Секрет ГМа
            </summary>
            <p className="mt-2 text-sm leading-6">{scene.gm_description}</p>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function getRectArea(area: VisionArea) {
  if (area.type === "rect" || area.x !== undefined) {
    return {
      x: area.x ?? 0,
      y: area.y ?? 0,
      width: area.width ?? 30,
      height: area.height ?? 30
    };
  }

  const points = area.points ?? [];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  if (!xs.length || !ys.length) {
    return null;
  }

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(4, maxX - minX),
    height: Math.max(4, maxY - minY)
  };
}

export function VisionLayer({
  isGm,
  vision
}: {
  isGm: boolean;
  vision: SceneVisibilityState | null;
}) {
  const revealedAreas = vision?.revealed_data?.areas ?? [];
  const hiddenAreas = vision?.revealed_data?.hiddenAreas ?? [];
  const isFullMap = isGm || vision?.revealed_data?.mode === "all";

  if (!vision) {
    return null;
  }

  if (isFullMap) {
    return (
      <div className="pointer-events-none absolute inset-0 z-[6]">
        {isGm ? (
          <div className="absolute left-4 bottom-4 rounded-full border border-[#4FAF7A]/35 bg-[#0B0F17]/70 px-3 py-1 text-xs text-[#b6f4d0] backdrop-blur">
            Полный обзор ГМа
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
      <div className="absolute inset-0 bg-[#02040A]/72 backdrop-blur-[1px]" />
      {revealedAreas.map((area, index) => {
        const rect = getRectArea(area);

        if (!rect) {
          return null;
        }

        return (
          <div
            className="absolute rounded-2xl border border-[#A78BFA]/45 bg-[#F5F2EA]/10 shadow-[0_0_70px_rgba(167,139,250,0.35)]"
            key={`revealed-${index}`}
            style={{
              height: `${rect.height}%`,
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.width}%`
            }}
          />
        );
      })}
      {hiddenAreas.map((area, index) => {
        const rect = getRectArea(area);

        if (!rect) {
          return null;
        }

        return (
          <div
            className="absolute rounded-2xl border border-[#B84A4A]/35 bg-[#02040A]/80"
            key={`hidden-${index}`}
            style={{
              height: `${rect.height}%`,
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.width}%`
            }}
          />
        );
      })}
      {!revealedAreas.length ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#9CA3AF]">
          Карта пока скрыта туманом войны
        </div>
      ) : null}
    </div>
  );
}

export function VisionManager({
  campaignId,
  scene,
  members,
  onChanged
}: {
  campaignId: string;
  scene: Scene | null;
  members: Dashboard["members"];
  onChanged: () => void;
}) {
  const playerMembers = members.filter((member) => member.role === "player");
  const [targetUserId, setTargetUserId] = useState(playerMembers[0]?.user_id ?? "");
  const [error, setError] = useState<string | null>(null);

  const defaultArea: VisionArea = {
    type: "rect",
    x: 18,
    y: 18,
    width: 34,
    height: 34
  };

  async function run(action: "reveal" | "revealAll" | "hide") {
    if (!scene || !targetUserId) {
      return;
    }

    const userId = Number(targetUserId);
    const result =
      action === "reveal"
        ? await revealSceneArea(campaignId, scene.scene_id, {
            userId,
            area: defaultArea
          })
        : action === "revealAll"
          ? await revealAllScene(campaignId, scene.scene_id, { userId })
          : await hideSceneArea(campaignId, scene.scene_id, {
              userId,
              area: { type: "rect", x: 46, y: 46, width: 28, height: 28 }
            });

    setError(result.error);
    if (!result.error) {
      onChanged();
    }
  }

  if (!scene || !playerMembers.length) {
    return null;
  }

  return (
    <details className="absolute left-4 top-16 z-20 w-52 rounded-2xl border border-[#273244] bg-[#0B0F17]/82 p-2 shadow-xl backdrop-blur open:w-64">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold">
        <span>Туман</span>
        <EyeOff size={15} className="text-[#A78BFA]" />
      </summary>
      <div className="mt-2 grid max-h-[340px] gap-2 overflow-y-auto px-1 pb-1">
        <select
          className="h-10 rounded-xl border border-[#273244] bg-[#0B0F17] px-3 text-sm"
          onChange={(event) => setTargetUserId(event.target.value)}
          value={targetUserId}
        >
          {playerMembers.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.display_name}
            </option>
          ))}
        </select>
        <Button onClick={() => void run("reveal")} type="button" variant="secondary">
          <Eye size={14} />
          Открыть область
        </Button>
        <Button onClick={() => void run("revealAll")} type="button">
          <Eye size={14} />
          Открыть всю карту
        </Button>
        <Button onClick={() => void run("hide")} type="button" variant="secondary">
          <EyeOff size={14} />
          Скрыть область
        </Button>
        {error ? <p className="text-xs text-[#e89a9a]">{error}</p> : null}
      </div>
    </details>
  );
}

export function TokenLayer({
  campaignId,
  scene,
  tokens,
  isGm,
  onChanged
}: {
  campaignId: string;
  scene: Scene | null;
  tokens: SceneToken[];
  isGm: boolean;
  onChanged: () => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [visibility, setVisibility] = useState<TokenVisibility>("public");
  const [error, setError] = useState<string | null>(null);

  async function createMarker() {
    if (!scene) {
      return;
    }

    const result = await createSceneToken(campaignId, scene.scene_id, {
      entityType: "marker",
      label: label || "Объект",
      x: 50,
      y: 50,
      size: 0.9,
      visibility
    });

    setError(result.error);
    if (!result.error) {
      setLabel("");
      onChanged();
    }
  }

  async function updateTokenPosition(
    token: SceneToken,
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (!isGm || !draggingId) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));

    const result = await updateSceneToken(campaignId, token.scene_token_id, {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    });

    setDraggingId(null);
    setError(result.error);
    if (!result.error) {
      onChanged();
    }
  }

  async function setTokenVisibility(token: SceneToken, value: TokenVisibility) {
    const result = await updateSceneToken(campaignId, token.scene_token_id, {
      visibility: value
    });
    setError(result.error);
    if (!result.error) {
      onChanged();
    }
  }

  async function archive(token: SceneToken) {
    const result = await archiveSceneToken(campaignId, token.scene_token_id);
    setError(result.error);
    if (!result.error) {
      onChanged();
    }
  }

  return (
    <div
      className="absolute inset-0 z-10"
      onPointerUp={(event) => {
        const token = tokens.find((item) => item.scene_token_id === draggingId);
        if (token) {
          void updateTokenPosition(token, event);
        }
      }}
    >
      {tokens.map((token) => {
        const size = Number(token.size) || 1;
        const x = Number(token.x);
        const y = Number(token.y);
        const labelText = token.label ?? token.entity?.name ?? "Объект";
        const isSecret = token.visibility !== "public";

        return (
          <div
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            key={token.scene_token_id}
            onPointerDown={(event) => {
              if (!isGm) {
                return;
              }
              event.currentTarget.setPointerCapture(event.pointerId);
              setDraggingId(token.scene_token_id);
            }}
            style={{
              left: `${x}%`,
              top: `${y}%`
            }}
          >
            <div
              className={`flex items-center justify-center rounded-full border shadow-2xl backdrop-blur ${
                isSecret
                  ? "border-[#D6A84F]/70 bg-[#D6A84F]/20 text-[#f0dca8]"
                  : "border-[#8B5CF6]/70 bg-[#5B21B6]/70 text-white"
              }`}
              style={{
                height: `${Math.max(30, size * 42)}px`,
                width: `${Math.max(30, size * 42)}px`
              }}
            >
              {token.entity_type === "marker" ? <MapPinned size={16} /> : labelText.slice(0, 1)}
            </div>
            <div className="pointer-events-none mt-1 rounded-full border border-[#273244] bg-[#0B0F17]/80 px-2 py-0.5 text-center text-[11px] text-[#F5F2EA] shadow-lg">
              {labelText}
            </div>

            {isGm ? (
              <div className="absolute left-1/2 top-full mt-2 hidden w-44 -translate-x-1/2 rounded-2xl border border-[#273244] bg-[#111827]/95 p-2 text-xs shadow-xl group-hover:block">
                <select
                  className="mb-2 h-8 w-full rounded-lg border border-[#273244] bg-[#0B0F17] px-2"
                  onChange={(event) =>
                    void setTokenVisibility(
                      token,
                      event.target.value as TokenVisibility
                    )
                  }
                  value={token.visibility}
                >
                  {tokenVisibilityOptions.map((option) => (
                    <option key={option} value={option}>
                      {tokenVisibilityLabels[option]}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => void archive(token)}
                  type="button"
                  variant="danger"
                >
                  <Archive size={13} />
                  Удалить
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}

      {isGm && scene ? (
        <details className="absolute left-4 top-4 w-52 rounded-2xl border border-[#273244] bg-[#0B0F17]/82 p-2 shadow-xl backdrop-blur open:w-64">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-2 py-1.5 text-sm font-semibold">
            <span>Объекты</span>
            <Plus size={15} className="text-[#A78BFA]" />
          </summary>
          <div className="mt-2 grid max-h-[340px] gap-2 overflow-y-auto px-1 pb-1">
            <Input
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Название объекта"
              value={label}
            />
            <select
              className="h-10 rounded-xl border border-[#273244] bg-[#0B0F17] px-3 text-sm"
              onChange={(event) => setVisibility(event.target.value as TokenVisibility)}
              value={visibility}
            >
              {tokenVisibilityOptions.map((option) => (
                <option key={option} value={option}>
                  {tokenVisibilityLabels[option]}
                </option>
              ))}
            </select>
            <Button onClick={() => void createMarker()} type="button">
              <Plus size={14} />
              Добавить объект
            </Button>
            {error ? <p className="text-xs text-[#e89a9a]">{error}</p> : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export function LocationPicker({
  locations,
  activeLocationId,
  onActivate,
  isGm
}: {
  locations: Location[];
  activeLocationId?: string | null;
  onActivate: (locationId: string) => void;
  isGm: boolean;
}) {
  return (
    <div className="space-y-2">
      {locations.map((location) => (
        <button
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#273244]/80 bg-[#171A26]/70 p-3 text-left text-sm transition hover:border-[#8B5CF6]/60"
          key={location.location_id}
          onClick={() => isGm && onActivate(location.location_id)}
          type="button"
        >
          <span>
            <span className="block font-semibold text-[#F5F2EA]">
              {location.name}
            </span>
            <span className="text-xs text-[#9CA3AF]">
              {getLabel(locationTypeLabels, location.location_type, "Локация")}
            </span>
          </span>
          {location.location_id === activeLocationId ? (
            <Badge tone="purple">Активна</Badge>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function UploadLocationImageButton({
  campaignId,
  locationId,
  onUploaded
}: {
  campaignId: string;
  locationId: string;
  onUploaded: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await uploadLocationImage(campaignId, locationId, file);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onUploaded();
  }

  return (
    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#273244] bg-[#171A26]/90 px-3 py-2 text-xs font-semibold text-[#F5F2EA] transition hover:border-[#8B5CF6]/70">
      <ImagePlus size={14} />
      {busy ? "Загрузка..." : "Картинка"}
      <input
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onFileChange}
        type="file"
      />
      {error ? <span className="text-[#e89a9a]">{error}</span> : null}
    </label>
  );
}

export function UploadSceneImageButton({
  campaignId,
  sceneId,
  onUploaded
}: {
  campaignId: string;
  sceneId: string;
  onUploaded: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await uploadSceneImage(campaignId, sceneId, file);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onUploaded();
  }

  return (
    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#273244] bg-[#171A26]/90 px-3 py-2 text-xs font-semibold text-[#F5F2EA] transition hover:border-[#8B5CF6]/70">
      <ImagePlus size={14} />
      {busy ? "Загрузка..." : "Карта"}
      <input
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onFileChange}
        type="file"
      />
      {error ? <span className="text-[#e89a9a]">{error}</span> : null}
    </label>
  );
}

export function SceneManagerPanel({
  campaignId,
  locations,
  scenes,
  members,
  characters,
  activeSceneId,
  onChanged
}: {
  campaignId: string;
  locations: Location[];
  scenes: Scene[];
  members: Dashboard["members"];
  characters: Character[];
  activeSceneId?: string | null;
  onChanged: () => void;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.location_id ?? "");
  const [name, setName] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [gmDescription, setGmDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("party_only");
  const [moveUserId, setMoveUserId] = useState(
    members.find((member) => member.role === "player")?.user_id ?? ""
  );
  const [moveCharacterId, setMoveCharacterId] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const playerMembers = members.filter((member) => !isGmRole(member.role));

  async function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const result = await createScene(campaignId, locationId, {
      name,
      publicDescription,
      gmDescription,
      visibility
    });

    if (result.error) {
      setError(result.error);
      return;
    }

    setName("");
    setPublicDescription("");
    setGmDescription("");
    onChanged();
  }

  async function activate(sceneId: string) {
    const result = await activateScene(campaignId, sceneId);
    setError(result.error);
    if (!result.error) {
      onChanged();
    }
  }

  async function archive(sceneId: string) {
    const result = await archiveScene(campaignId, sceneId);
    setError(result.error);
    if (!result.error) {
      onChanged();
    }
  }

  async function move(sceneId: string) {
    if (!moveUserId) {
      setError("Выберите игрока для перемещения.");
      return;
    }

    const result = await movePlayerToScene(campaignId, sceneId, {
      userId: Number(moveUserId),
      characterId: moveCharacterId ? Number(moveCharacterId) : null,
      reason: moveReason || null
    });

    setError(result.error);
    if (!result.error) {
      onChanged();
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Сцены локаций</h3>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Сцена — конкретная карта внутри локации: зал, подвал, переулок или
          временная игровая область.
        </p>
      </div>

      {error ? <div className="mb-3 text-sm text-[#e89a9a]">{error}</div> : null}

      <form className="mb-5 grid gap-3 md:grid-cols-2" onSubmit={(event) => void submitCreate(event)}>
        <select
          className="h-12 rounded-xl border border-[#273244] bg-[#0B0F17] px-3 text-sm"
          onChange={(event) => setLocationId(event.target.value)}
          value={locationId}
        >
          {locations.map((location) => (
            <option key={location.location_id} value={location.location_id}>
              {location.name}
            </option>
          ))}
        </select>
        <Input
          onChange={(event) => setName(event.target.value)}
          placeholder="Название сцены"
          required
          value={name}
        />
        <textarea
          className="min-h-20 rounded-xl border border-[#273244] bg-[#0B0F17]/55 px-4 py-3 text-sm outline-none focus:border-[#8B5CF6]"
          onChange={(event) => setPublicDescription(event.target.value)}
          placeholder="Описание для игроков"
          value={publicDescription}
        />
        <textarea
          className="min-h-20 rounded-xl border border-[#273244] bg-[#0B0F17]/55 px-4 py-3 text-sm outline-none focus:border-[#8B5CF6]"
          onChange={(event) => setGmDescription(event.target.value)}
          placeholder="Секреты ГМа"
          value={gmDescription}
        />
        <select
          className="h-12 rounded-xl border border-[#273244] bg-[#0B0F17] px-3 text-sm"
          onChange={(event) => setVisibility(event.target.value as Visibility)}
          value={visibility}
        >
          {visibilityOptions.map((option) => (
            <option key={option} value={option}>
              {getLabel(visibilityLabels, option)}
            </option>
          ))}
        </select>
        <Button type="submit">
          <Plus size={16} />
          Создать сцену
        </Button>
      </form>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <select
          className="h-11 rounded-xl border border-[#273244] bg-[#0B0F17] px-3 text-sm"
          onChange={(event) => setMoveUserId(event.target.value)}
          value={moveUserId}
        >
          {playerMembers.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.display_name}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-xl border border-[#273244] bg-[#0B0F17] px-3 text-sm"
          onChange={(event) => setMoveCharacterId(event.target.value)}
          value={moveCharacterId}
        >
          <option value="">Без персонажа</option>
          {characters.map((character) => (
            <option key={character.character_id} value={character.character_id}>
              {character.name}
            </option>
          ))}
        </select>
        <Input
          onChange={(event) => setMoveReason(event.target.value)}
          placeholder="Комментарий ГМа"
          value={moveReason}
        />
      </div>

      <div className="space-y-3">
        {scenes.map((scene) => (
          <div
            className="rounded-2xl border border-[#273244] bg-[#0B0F17]/45 p-3"
            key={scene.scene_id}
          >
            <div className="flex flex-col justify-between gap-3 md:flex-row">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold">{scene.name}</h4>
                  {scene.scene_id === activeSceneId ? (
                    <Badge tone="purple">Активна</Badge>
                  ) : null}
                  <Badge tone={scene.visibility === "gm_only" ? "danger" : "gold"}>
                    {getLabel(visibilityLabels, scene.visibility)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  {scene.location?.name ?? "Локация"} ·{" "}
                  {scene.public_description ?? "Описание пока пустое."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void activate(scene.scene_id)}
                  type="button"
                  variant="secondary"
                >
                  <Shuffle size={14} />
                  В центр
                </Button>
                <UploadSceneImageButton
                  campaignId={campaignId}
                  onUploaded={onChanged}
                  sceneId={scene.scene_id}
                />
                <Button
                  onClick={() => void move(scene.scene_id)}
                  type="button"
                  variant="ghost"
                >
                  Переместить
                </Button>
                <Button
                  onClick={() => void archive(scene.scene_id)}
                  type="button"
                  variant="danger"
                >
                  <Archive size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function LocationAccessPanel({
  campaignId,
  location,
  members,
  onChanged
}: {
  campaignId: string;
  location: Location;
  members: Dashboard["members"];
  onChanged: () => void;
}) {
  const players = members.filter((member) => !isGmRole(member.role));
  const [userId, setUserId] = useState(players[0]?.user_id ?? "");
  const [reason, setReason] = useState("Персонаж вошёл в локацию");
  const [status, setStatus] = useState<string | null>(null);

  async function submit(kind: "grant" | "revoke") {
    if (!userId) {
      return;
    }

    const fn = kind === "grant" ? grantLocationAccess : revokeLocationAccess;
    const result = await fn(campaignId, location.location_id, {
      userId: Number(userId),
      reason
    });

    setStatus(result.error ?? (kind === "grant" ? "Доступ открыт" : "Доступ скрыт"));

    if (!result.error) {
      onChanged();
    }
  }

  return (
    <div className="rounded-2xl border border-[#273244] bg-[#0B0F17]/45 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A78BFA]">
        Доступ игрока
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_1.4fr]">
        <select
          className="h-10 rounded-xl border border-[#273244] bg-[#0B0F17] px-3 text-sm"
          onChange={(event) => setUserId(event.target.value)}
          value={userId}
        >
          {players.map((player) => (
            <option key={player.user_id} value={player.user_id}>
              {player.display_name}
            </option>
          ))}
        </select>
        <Input
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => void submit("grant")} type="button">
          <Eye size={14} />
          Открыть
        </Button>
        <Button
          onClick={() => void submit("revoke")}
          type="button"
          variant="secondary"
        >
          <EyeOff size={14} />
          Скрыть
        </Button>
      </div>
      {status ? <div className="mt-2 text-xs text-[#9CA3AF]">{status}</div> : null}
    </div>
  );
}

export function LocationManagerModal({
  campaignId,
  dashboard,
  locations,
  scenes,
  characters,
  activeLocationId,
  activeSceneId,
  onClose,
  onChanged
}: {
  campaignId: string;
  dashboard: Dashboard;
  locations: Location[];
  scenes: Scene[];
  characters: Character[];
  activeLocationId?: string | null;
  activeSceneId?: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [secretDescription, setSecretDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("hidden_until_discovered");
  const [parentLocationId, setParentLocationId] = useState("");
  const [isEventLocation, setIsEventLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const result = await createLocation(campaignId, {
      name,
      publicDescription,
      secretDescription,
      parentLocationId: parentLocationId ? Number(parentLocationId) : null,
      visibility,
      isEventLocation
    });

    if (result.error) {
      setError(result.error);
      return;
    }

    setName("");
    setPublicDescription("");
    setSecretDescription("");
    onChanged();
  }

  async function activate(locationId: string) {
    const result = await activateLocation(campaignId, locationId);
    setError(result.error);
    if (!result.error) {
      onChanged();
    }
  }

  async function archive(locationId: string) {
    const result = await archiveLocation(campaignId, locationId);
    setError(result.error);
    if (!result.error) {
      onChanged();
    }
  }

  async function toggleEvent(location: Location) {
    const result = await updateLocation(campaignId, location.location_id, {
      isEventLocation: !location.is_event_location
    });
    setError(result.error);
    if (!result.error) {
      onChanged();
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#05070d]/80 p-4 backdrop-blur">
      <div className="mx-auto max-w-6xl rounded-3xl border border-[#273244] bg-[#111827] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Управление локациями</h2>
            <p className="mt-1 text-sm text-[#9CA3AF]">
              Создавайте сцены, загружайте изображения и открывайте доступ игрокам.
            </p>
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            <X size={18} />
          </Button>
        </div>

        {error ? <div className="mb-4 text-sm text-[#e89a9a]">{error}</div> : null}

        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="p-4">
            <h3 className="mb-3 text-lg font-semibold">Новая локация</h3>
            <form className="space-y-3" onSubmit={(event) => void submitCreate(event)}>
              <Input
                onChange={(event) => setName(event.target.value)}
                placeholder="Название"
                required
                value={name}
              />
              <textarea
                className="min-h-20 w-full rounded-xl border border-[#273244] bg-[#0B0F17]/55 px-4 py-3 text-sm outline-none focus:border-[#8B5CF6]"
                onChange={(event) => setPublicDescription(event.target.value)}
                placeholder="Публичное описание"
                value={publicDescription}
              />
              <textarea
                className="min-h-20 w-full rounded-xl border border-[#273244] bg-[#0B0F17]/55 px-4 py-3 text-sm outline-none focus:border-[#8B5CF6]"
                onChange={(event) => setSecretDescription(event.target.value)}
                placeholder="Секретное описание для ГМа"
                value={secretDescription}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="h-12 rounded-xl border border-[#273244] bg-[#0B0F17] px-3 text-sm"
                  onChange={(event) => setVisibility(event.target.value as Visibility)}
                  value={visibility}
                >
                  {visibilityOptions.map((option) => (
                    <option key={option} value={option}>
                      {getLabel(visibilityLabels, option)}
                    </option>
                  ))}
                </select>
                <select
                  className="h-12 rounded-xl border border-[#273244] bg-[#0B0F17] px-3 text-sm"
                  onChange={(event) => setParentLocationId(event.target.value)}
                  value={parentLocationId}
                >
                  <option value="">Без родителя</option>
                  {locations.map((location) => (
                    <option key={location.location_id} value={location.location_id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#9CA3AF]">
                <input
                  checked={isEventLocation}
                  onChange={(event) => setIsEventLocation(event.target.checked)}
                  type="checkbox"
                />
                Временная локация-событие
              </label>
              <Button type="submit">
                <Plus size={16} />
                Добавить локацию
              </Button>
            </form>
          </Card>

          <div className="space-y-3">
            {locations.map((location) => (
              <Card className="p-4" key={location.location_id}>
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{location.name}</h3>
                      {location.location_id === activeLocationId ? (
                        <Badge tone="purple">Активна</Badge>
                      ) : null}
                      <LocationVisibilityBadge location={location} />
                    </div>
                    <p className="line-clamp-2 text-sm text-[#9CA3AF]">
                      {location.public_description ?? "Описание пока пустое."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => void activate(location.location_id)}
                      type="button"
                      variant="secondary"
                    >
                      <Shuffle size={14} />
                      Активировать
                    </Button>
                    <UploadLocationImageButton
                      campaignId={campaignId}
                      locationId={location.location_id}
                      onUploaded={onChanged}
                    />
                    <Button
                      onClick={() => void toggleEvent(location)}
                      type="button"
                      variant="ghost"
                    >
                      Событие
                    </Button>
                    <Button
                      onClick={() => void archive(location.location_id)}
                      type="button"
                      variant="danger"
                    >
                      <Archive size={14} />
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <LocationAccessPanel
                    campaignId={campaignId}
                    location={location}
                    members={dashboard.members}
                    onChanged={onChanged}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SceneManagerPanel
            activeSceneId={activeSceneId}
            campaignId={campaignId}
            characters={characters}
            locations={locations}
            members={dashboard.members}
            onChanged={onChanged}
            scenes={scenes}
          />
        </div>
      </div>
    </div>
  );
}

export function TravelRequestModal({
  campaignId,
  locations,
  characters,
  currentUser,
  onClose,
  onSent
}: {
  campaignId: string;
  locations: Location[];
  characters: Character[];
  currentUser: CurrentUser | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const ownCharacters = characters.filter(
    (character) =>
      String(character.owner?.user_id) === String(currentUser?.user_id)
  );
  const [targetLocationId, setTargetLocationId] = useState(
    locations[0]?.location_id ?? ""
  );
  const [characterId, setCharacterId] = useState(
    ownCharacters[0]?.character_id ?? ""
  );
  const [message, setMessage] = useState("Хочу перейти в эту локацию.");
  const [status, setStatus] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await createTravelRequest(campaignId, {
      targetLocationId: Number(targetLocationId),
      characterId: characterId ? Number(characterId) : null,
      message
    });

    if (result.error) {
      setStatus(result.error);
      return;
    }

    setStatus("Запрос отправлен ГМу");
    onSent();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070d]/80 p-4 backdrop-blur">
      <Card className="w-full max-w-xl p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Запросить переход</h2>
            <p className="text-sm text-[#9CA3AF]">
              ГМ увидит запрос и сможет одобрить или отклонить его.
            </p>
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            <X size={18} />
          </Button>
        </div>
        <form className="space-y-3" onSubmit={(event) => void submit(event)}>
          <select
            className="h-12 w-full rounded-xl border border-[#273244] bg-[#0B0F17] px-3 text-sm"
            onChange={(event) => setTargetLocationId(event.target.value)}
            value={targetLocationId}
          >
            {locations.map((location) => (
              <option key={location.location_id} value={location.location_id}>
                {location.name}
              </option>
            ))}
          </select>
          <select
            className="h-12 w-full rounded-xl border border-[#273244] bg-[#0B0F17] px-3 text-sm"
            onChange={(event) => setCharacterId(event.target.value)}
            value={characterId}
          >
            <option value="">Без персонажа</option>
            {ownCharacters.map((character) => (
              <option key={character.character_id} value={character.character_id}>
                {character.name}
              </option>
            ))}
          </select>
          <textarea
            className="min-h-24 w-full rounded-xl border border-[#273244] bg-[#0B0F17]/55 px-4 py-3 text-sm outline-none focus:border-[#8B5CF6]"
            onChange={(event) => setMessage(event.target.value)}
            value={message}
          />
          <Button disabled={!targetLocationId} type="submit">
            <Send size={16} />
            Отправить запрос ГМу
          </Button>
          {status ? <div className="text-sm text-[#9CA3AF]">{status}</div> : null}
        </form>
      </Card>
    </div>
  );
}

export function GMRequestCard({
  request,
  campaignId,
  onResolved
}: {
  request: GMRequest;
  campaignId: string;
  onResolved: () => void;
}) {
  const [response, setResponse] = useState(
    "Вы добираетесь до локации без происшествий."
  );
  const [error, setError] = useState<string | null>(null);

  async function resolve(kind: "approve" | "reject") {
    const fn = kind === "approve" ? approveGmRequest : rejectGmRequest;
    const result = await fn(campaignId, request.request_id, { response });
    setError(result.error);
    if (!result.error) {
      onResolved();
    }
  }

  return (
    <Card subtle className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{request.requester.display_name}</div>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            {request.character?.name ?? "Игрок"} хочет перейти в{" "}
            <span className="text-[#F5F2EA]">{request.target_location.name}</span>
          </p>
        </div>
        <Badge tone="gold">
          {getLabel(requestStatusLabels, request.status, "Ожидает решения")}
        </Badge>
      </div>
      {request.message ? (
        <p className="mt-3 rounded-xl border border-[#273244] bg-[#0B0F17]/60 p-3 text-sm text-[#c7ccd6]">
          {request.message}
        </p>
      ) : null}
      <textarea
        className="mt-3 min-h-20 w-full rounded-xl border border-[#273244] bg-[#0B0F17]/55 px-3 py-2 text-sm outline-none focus:border-[#8B5CF6]"
        onChange={(event) => setResponse(event.target.value)}
        value={response}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => void resolve("approve")} type="button">
          <Check size={15} />
          Одобрить
        </Button>
        <Button
          onClick={() => void resolve("reject")}
          type="button"
          variant="danger"
        >
          <X size={15} />
          Отклонить
        </Button>
      </div>
      {error ? <div className="mt-2 text-xs text-[#e89a9a]">{error}</div> : null}
    </Card>
  );
}

export function GMRequestsPanel({
  campaignId,
  requests,
  onResolved
}: {
  campaignId: string;
  requests: GMRequest[];
  onResolved: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">Запросы игроков</h3>
        <Badge tone={requests.length > 0 ? "orange" : "muted"}>
          {requests.length}
        </Badge>
      </div>
      {requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((request) => (
            <GMRequestCard
              campaignId={campaignId}
              key={request.request_id}
              onResolved={onResolved}
              request={request}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#9CA3AF]">
          Запросов, ожидающих решения, пока нет.
        </p>
      )}
    </Card>
  );
}

export function GameWorkspace({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<PlayRoomState>({
    dashboard: null,
    locations: [],
    scenes: [],
    tokens: [],
    vision: null,
    characters: [],
    messages: [],
    gmRequests: [],
    currentUser: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sidePanel, setSidePanel] = useState<PlaySidePanel>("chat");

  const permissions = state.dashboard?.currentMember ?? null;
  const role = permissions?.role ?? getCurrentRole(state);
  const isGm = Boolean(permissions?.canManageLocations ?? isGmRole(role));

  const activeLocation = useMemo(() => {
    return (
      state.locations.find((location) => location.is_active_location) ??
      state.locations[0] ??
      null
    );
  }, [state.locations]);

  const activeScene = useMemo(() => {
    return (
      state.scenes.find((scene) => scene.is_active_scene) ??
      state.scenes.find((scene) => scene.is_current_for_user) ??
      state.scenes[0] ??
      null
    );
  }, [state.scenes]);

  const sceneLocation =
    state.locations.find(
      (location) =>
        String(location.location_id) ===
        String(activeScene?.location_id ?? activeScene?.location?.location_id)
    ) ?? activeLocation;

  async function loadData() {
    setError(null);
    const [currentUser, dashboard, locations, scenes, characters, messages] =
      await Promise.all([
        getCurrentUser(),
        getDashboard(campaignId),
        getLocations(campaignId),
        getScenes(campaignId),
        getCharacters(campaignId),
        getChat(campaignId)
      ]);

    const firstError =
      currentUser.error ??
      dashboard.error ??
      locations.error ??
      scenes.error ??
      characters.error ??
      messages.error;

    if (firstError) {
      setError(firstError);
      setLoading(false);
      return;
    }

    const nextState: PlayRoomState = {
      currentUser: currentUser.data,
      dashboard: dashboard.data,
      locations: locations.data ?? [],
      scenes: scenes.data ?? [],
      tokens: [],
      vision: null,
      characters: characters.data ?? [],
      messages: messages.data ?? [],
      gmRequests: []
    };

    const nextActiveScene =
      nextState.scenes.find((scene) => scene.is_active_scene) ??
      nextState.scenes.find((scene) => scene.is_current_for_user) ??
      nextState.scenes[0] ??
      null;

    if (nextActiveScene) {
      const [tokens, vision] = await Promise.all([
        getSceneTokens(campaignId, nextActiveScene.scene_id),
        getSceneVisibility(campaignId, nextActiveScene.scene_id)
      ]);
      const sceneError = tokens.error ?? vision.error;
      if (sceneError) {
        setError(sceneError);
        setLoading(false);
        return;
      }
      nextState.tokens = tokens.data ?? [];
      nextState.vision = vision.data;
    }

    if (dashboard.data?.currentMember.canApproveGMRequests) {
      const gmRequests = await getGmRequests(campaignId);
      nextState.gmRequests = gmRequests.data ?? [];
    }

    setState(nextState);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      if (
        event.type === "scene.changed" ||
        event.type === "player.moved" ||
        event.type === "token.created" ||
        event.type === "token.updated" ||
        event.type === "token.deleted" ||
        event.type === "vision.updated" ||
        event.type === "chat.message.created" ||
        event.type === "dice.rolled"
      ) {
        void loadData();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [campaignId]
  );

  async function submitChatMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!chatInput.trim()) {
      return;
    }

    const result = await sendChatMessage(campaignId, {
      content: chatInput,
      visibility: "party_only"
    });

    if (result.error) {
      setError(result.error);
      return;
    }

    setChatInput("");
    await loadData();
  }

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw className="mx-auto animate-spin text-[#A78BFA]" />
        <p className="mt-3 text-sm text-[#9CA3AF]">Загружаю игровую комнату...</p>
      </Card>
    );
  }

  if (error || !state.dashboard) {
    return <ErrorState message={error ?? "Кампания не найдена"} />;
  }

  const dashboard = state.dashboard;

  return (
    <RealtimeProvider campaignId={campaignId} onEvent={handleRealtimeEvent}>
      {(realtimeStatus) => (
    <div className="space-y-3 overflow-x-hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm text-[#9CA3AF]">
            {dashboard.campaign.title} · {dashboard.campaign.setting_name ?? "Core"} ·{" "}
            {getLabel(roleLabels, role, "Наблюдатель")}
          </div>
        </div>
        <Badge
          tone={
            realtimeStatus === "connected"
              ? "green"
              : realtimeStatus === "connecting" || realtimeStatus === "reconnecting"
                ? "gold"
                : "danger"
          }
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          {realtimeStatus === "connected"
            ? "Подключено"
            : realtimeStatus === "connecting"
              ? "Подключение..."
              : realtimeStatus === "reconnecting"
                ? "Переподключение..."
              : "Нет соединения"}
        </Badge>
      </div>
      <div className="grid min-h-[calc(100vh-7.5rem)] gap-3 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          <Card className="overflow-hidden p-1.5">
            <SceneImageCard
              campaignId={campaignId}
              isGm={isGm}
              location={sceneLocation}
              members={dashboard.members}
              onTokensChanged={() => void loadData()}
              onVisionChanged={() => void loadData()}
              scene={activeScene}
              tokens={state.tokens}
              vision={state.vision}
            />
          </Card>

          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <Card className="p-4">
              <h3 className="mb-3 font-semibold">
                {isGm ? "Все локации" : "Доступные локации"}
              </h3>
              <LocationPicker
                activeLocationId={activeLocation?.location_id}
                isGm={isGm}
                locations={state.locations}
                onActivate={(locationId) => {
                  void activateLocation(campaignId, locationId).then(() => loadData());
                }}
              />
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 font-semibold">Сцены этой комнаты</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {state.scenes.slice(0, 6).map((scene) => (
                  <button
                    className="rounded-2xl border border-[#273244] bg-[#171A26]/70 p-3 text-left text-sm transition hover:border-[#8B5CF6]/60"
                    key={scene.scene_id}
                    onClick={() =>
                      permissions?.canManageLocations
                        ? void activateScene(campaignId, scene.scene_id).then(() =>
                            loadData()
                          )
                        : undefined
                    }
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#F5F2EA]">
                        {scene.name}
                      </span>
                      {scene.is_active_scene ? <Badge tone="purple">Центр</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs text-[#9CA3AF]">
                      {scene.location?.name ?? "Локация"}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="mb-3 font-semibold">Активные персонажи</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {state.characters.slice(0, 4).map((character) => (
                  <div
                    className="rounded-2xl border border-[#273244] bg-[#171A26]/70 p-3"
                    key={character.character_id}
                  >
                    <div className="font-semibold">{character.name}</div>
                    <div className="text-xs text-[#9CA3AF]">
                      {character.owner?.display_name ?? "Без владельца"}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[#c7ccd6]">
                      {character.status_text ?? character.public_description}
                    </p>
                  </div>
                ))}
              </div>
          </Card>

        </div>

        <aside className="min-w-0 space-y-3 xl:sticky xl:top-2 xl:max-h-[calc(100vh-1rem)]">
          <Card className="p-3">
            <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[#273244] bg-[#0B0F17]/70 p-1">
              {([
                ["chat", "Чат"],
                ["dice", "Кубики"],
                ["requests", "Запросы"]
              ] as Array<[PlaySidePanel, string]>).map(([value, label]) => (
                <button
                  className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
                    sidePanel === value
                      ? "bg-[#8B5CF6] text-white"
                      : "text-[#9CA3AF] hover:bg-[#171A26] hover:text-[#F5F2EA]"
                  }`}
                  key={value}
                  onClick={() => setSidePanel(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </Card>

          {sidePanel === "chat" ? (
          <Card className="p-3">
            <h3 className="mb-2 text-sm font-semibold">Чат кампании</h3>
            <div className="max-h-[calc(100vh-18rem)] min-h-[360px] space-y-3 overflow-y-auto pr-1">
              {state.messages.slice(0, 8).map((message) => (
                <ChatMessage key={message.message_id} message={message} />
              ))}
            </div>
            {role !== "viewer" ? (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(event) => void submitChatMessage(event)}
              >
                <Input
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Написать сообщение..."
                  value={chatInput}
                />
                <Button type="submit">
                  <Send size={15} />
                </Button>
              </form>
            ) : null}
          </Card>
          ) : null}

          {sidePanel === "dice" ? (
          <DiceQuickRolls
            campaignId={campaignId}
            disabledMessage={
              permissions?.canRollDice
                ? null
                : "Режим просмотра: броски недоступны."
            }
            onRolled={() => void loadData()}
          />
          ) : null}

          {sidePanel === "requests" ? (
            permissions?.canApproveGMRequests ? (
              <GMRequestsPanel
                campaignId={campaignId}
                onResolved={() => void loadData()}
                requests={state.gmRequests}
              />
            ) : (
              <Card className="p-4">
                <h3 className="font-semibold">Запросы игроков</h3>
                <p className="mt-2 text-sm text-[#9CA3AF]">
                  Запросы переходов доступны только ГМу.
                </p>
              </Card>
            )
          ) : null}

          <Card className="p-3">
            <div className="grid gap-2">
              {permissions?.canManageLocations ? (
                <Button onClick={() => setManagerOpen(true)} type="button">
                  <MapPinned size={16} />
                  Управление сценами
                </Button>
              ) : permissions?.canCreateTravelRequest ? (
                <Button onClick={() => setTravelOpen(true)} type="button">
                  <Send size={16} />
                  Запросить переход
                </Button>
              ) : null}
              <Button onClick={() => void loadData()} type="button" variant="secondary">
                <RefreshCw size={16} />
                Обновить
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      {state.locations.length === 0 ? (
        <EmptyState
          description="ГМ может создать первую локацию через управление."
          title="Локаций пока нет"
        />
      ) : null}

      {managerOpen && permissions?.canManageLocations ? (
        <LocationManagerModal
          activeLocationId={activeLocation?.location_id}
          activeSceneId={activeScene?.scene_id}
          campaignId={campaignId}
          characters={state.characters}
          dashboard={dashboard}
          locations={state.locations}
          scenes={state.scenes}
          onChanged={() => void loadData()}
          onClose={() => setManagerOpen(false)}
        />
      ) : null}

      {travelOpen && permissions?.canCreateTravelRequest ? (
        <TravelRequestModal
          campaignId={campaignId}
          characters={state.characters}
          currentUser={state.currentUser}
          locations={state.locations}
          onClose={() => setTravelOpen(false)}
          onSent={() => void loadData()}
        />
      ) : null}
    </div>
      )}
    </RealtimeProvider>
  );
}
