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
import { useEffect, useMemo, useState } from "react";
import {
  activateLocation,
  approveGmRequest,
  archiveLocation,
  createLocation,
  createTravelRequest,
  getCharacters,
  getChat,
  getCurrentUser,
  getDashboard,
  getGmRequests,
  getLocations,
  grantLocationAccess,
  rejectGmRequest,
  revokeLocationAccess,
  updateLocation,
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
import { Badge, Button, Card, EmptyState, ErrorState, Input } from "./ui";

type PlayRoomState = {
  dashboard: Dashboard | null;
  locations: Location[];
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
  activeLocationId,
  onClose,
  onChanged
}: {
  campaignId: string;
  dashboard: Dashboard;
  locations: Location[];
  activeLocationId?: string | null;
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
    (character) => String(character.owner.user_id) === String(currentUser?.user_id)
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
    characters: [],
    messages: [],
    gmRequests: [],
    currentUser: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);

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

  async function loadData() {
    setError(null);
    const [currentUser, dashboard, locations, characters, messages] =
      await Promise.all([
        getCurrentUser(),
        getDashboard(campaignId),
        getLocations(campaignId),
        getCharacters(campaignId),
        getChat(campaignId)
      ]);

    const firstError =
      currentUser.error ??
      dashboard.error ??
      locations.error ??
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
      characters: characters.data ?? [],
      messages: messages.data ?? [],
      gmRequests: []
    };

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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="overflow-hidden p-3">
            <LocationImageCard location={activeLocation} />
            <div className="mt-4 flex flex-col justify-between gap-3 px-2 pb-2 md:flex-row md:items-center">
              <div>
                <div className="text-sm text-[#9CA3AF]">
                  Мир: {state.dashboard.campaign.setting_name ?? "Core"} · Роль:{" "}
                  {getLabel(roleLabels, role, "Наблюдатель")}
                </div>
                <h2 className="mt-1 text-xl font-semibold">
                  {state.dashboard.campaign.title}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {permissions?.canManageLocations ? (
                  <Button onClick={() => setManagerOpen(true)} type="button">
                    <MapPinned size={16} />
                    Управление локациями
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
            </div>
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
              <h3 className="mb-3 font-semibold">Активные персонажи</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {state.characters.slice(0, 4).map((character) => (
                  <div
                    className="rounded-2xl border border-[#273244] bg-[#171A26]/70 p-3"
                    key={character.character_id}
                  >
                    <div className="font-semibold">{character.name}</div>
                    <div className="text-xs text-[#9CA3AF]">
                      {character.owner.display_name}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[#c7ccd6]">
                      {character.status_text ?? character.public_description}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {permissions?.canApproveGMRequests ? (
            <GMRequestsPanel
              campaignId={campaignId}
              onResolved={() => void loadData()}
              requests={state.gmRequests}
            />
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 font-semibold">Чат кампании</h3>
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {state.messages.slice(0, 8).map((message) => (
                <ChatMessage key={message.message_id} message={message} />
              ))}
            </div>
          </Card>
          <DiceQuickRolls
            campaignId={campaignId}
            disabledMessage={
              permissions?.canRollDice
                ? null
                : "Режим просмотра: броски недоступны."
            }
            onRolled={() => void loadData()}
          />
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
          campaignId={campaignId}
          dashboard={state.dashboard}
          locations={state.locations}
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
  );
}
