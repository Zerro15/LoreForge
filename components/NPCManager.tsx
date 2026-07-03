"use client";

import type { ComponentProps, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Bot, Plus, Save, Tags, X } from "lucide-react";
import { NPCDossierCard } from "@/components/NPCDossierCard";
import {
  archiveNpc,
  createNpc,
  createTag,
  getDashboard,
  getLocations,
  getNpcs,
  getTags,
  type NpcInput,
  updateNpc
} from "@/lib/api";
import type { Dashboard, Location, Npc, Tag, Visibility } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorState, Input } from "./ui";

type EditorMode = "create" | "edit";

type NpcFormState = {
  name: string;
  title: string;
  publicDescription: string;
  secretDescription: string;
  gmSecrets: string;
  campaignJournal: string;
  locationId: string;
  visibility: Visibility;
  statusText: string;
  tagIds: number[];
};

const emptyForm: NpcFormState = {
  name: "",
  title: "",
  publicDescription: "",
  secretDescription: "",
  gmSecrets: "",
  campaignJournal: "",
  locationId: "",
  visibility: "hidden_until_discovered",
  statusText: "",
  tagIds: []
};

const visibilityLabels: Record<Visibility, string> = {
  public: "Публично",
  party_only: "Только группа",
  player_only: "Только игрок",
  gm_only: "Только ГМ",
  hidden_until_discovered: "Скрыто до открытия"
};

function fromNpc(npc: Npc): NpcFormState {
  return {
    name: npc.name,
    title: npc.title ?? "",
    publicDescription: npc.public_description ?? "",
    secretDescription: npc.secret_description ?? "",
    gmSecrets: npc.gm_secrets ?? "",
    campaignJournal: npc.campaign_journal ?? "",
    locationId: "",
    visibility: npc.visibility,
    statusText: npc.status_text ?? "",
    tagIds: npc.tags.map((tag) => tag.tag_id)
  };
}

function toPayload(form: NpcFormState): NpcInput {
  return {
    name: form.name.trim(),
    title: form.title.trim() || null,
    publicDescription: form.publicDescription.trim() || null,
    secretDescription: form.secretDescription.trim() || null,
    gmSecrets: form.gmSecrets.trim() || null,
    campaignJournal: form.campaignJournal.trim() || null,
    locationId: form.locationId ? Number(form.locationId) : null,
    visibility: form.visibility,
    statusText: form.statusText.trim() || null,
    tagIds: form.tagIds
  };
}

export function NPCManager({ campaignId }: { campaignId: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [selectedNpc, setSelectedNpc] = useState<Npc | null>(null);

  const canManage = Boolean(dashboard?.currentMember.canManageLocations);
  const canViewSecrets = Boolean(dashboard?.currentMember.canViewGMSecrets);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [dashboardResult, npcResult, tagResult, locationResult] =
      await Promise.all([
        getDashboard(campaignId),
        getNpcs(campaignId),
        getTags(campaignId),
        getLocations(campaignId)
      ]);

    if (dashboardResult.error || npcResult.error) {
      setError(dashboardResult.error ?? npcResult.error);
      setLoading(false);
      return;
    }

    setDashboard(dashboardResult.data);
    setNpcs(npcResult.data ?? []);
    setTags(tagResult.data ?? []);
    setLocations(locationResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, [campaignId]);

  function openCreate() {
    setSelectedNpc(null);
    setEditorMode("create");
    setEditorOpen(true);
  }

  function openEdit(npc: Npc) {
    setSelectedNpc(npc);
    setEditorMode("edit");
    setEditorOpen(true);
  }

  async function handleArchive(npc: Npc) {
    const confirmed = window.confirm(`Архивировать NPC "${npc.name}"?`);

    if (!confirmed) {
      return;
    }

    const result = await archiveNpc(campaignId, npc.npc_id);

    if (result.error) {
      setError(result.error);
      return;
    }

    setNotice("NPC отправлен в архив.");
    await loadData();
  }

  async function handleSaved() {
    setEditorOpen(false);
    setSelectedNpc(null);
    setNotice(
      editorMode === "create" ? "NPC создан." : "Досье NPC обновлено."
    );
    await loadData();
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-[#A78BFA]">
              <Bot size={16} />
              NPC dossier
            </div>
            <h2 className="mt-2 text-2xl font-semibold">Персонажи мира</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#9CA3AF]">
              Публичные карточки видят игроки, а секретные заметки и журнал
              кампании доступны только ГМу и со-ГМу.
            </p>
          </div>
          {canManage ? (
            <Button onClick={openCreate} type="button">
              <Plus size={17} />
              Добавить NPC
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={canViewSecrets ? "purple" : "muted"}>
            {canViewSecrets ? "Секреты видны" : "Секреты скрыты"}
          </Badge>
          <Badge tone={canManage ? "green" : "muted"}>
            {canManage ? "Управление доступно" : "Только чтение"}
          </Badge>
        </div>
      </Card>

      {notice ? (
        <div className="rounded-2xl border border-[#4FAF7A]/30 bg-[#4FAF7A]/10 px-4 py-3 text-sm text-[#8de0b1]">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <Card className="p-8 text-center text-sm text-[#9CA3AF]">
          Загружаем досье NPC...
        </Card>
      ) : error ? (
        <ErrorState message={error} />
      ) : npcs.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {npcs.map((npc) => (
            <NPCDossierCard
              canManage={canManage}
              key={npc.npc_id}
              npc={npc}
              onArchive={handleArchive}
              onEdit={openEdit}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          description={
            canManage
              ? "Создайте первое досье: имя, публичное описание, секреты и теги."
              : "ГМ пока не открыл NPC для вашей роли."
          }
          title="NPC пока нет"
        />
      )}

      {editorOpen ? (
        <NPCEditorModal
          campaignId={campaignId}
          initialNpc={selectedNpc}
          locations={locations}
          mode={editorMode}
          onClose={() => setEditorOpen(false)}
          onSaved={handleSaved}
          onTagCreated={async () => {
            const result = await getTags(campaignId);
            if (!result.error) {
              setTags(result.data ?? []);
            }
          }}
          tags={tags}
        />
      ) : null}
    </div>
  );
}

function NPCEditorModal({
  campaignId,
  mode,
  initialNpc,
  tags,
  locations,
  onClose,
  onSaved,
  onTagCreated
}: {
  campaignId: string;
  mode: EditorMode;
  initialNpc: Npc | null;
  tags: Tag[];
  locations: Location[];
  onClose: () => void;
  onSaved: () => void;
  onTagCreated: () => void;
}) {
  const [form, setForm] = useState<NpcFormState>(
    initialNpc ? fromNpc(initialNpc) : emptyForm
  );
  const [tagName, setTagName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = mode === "create" ? "Новый NPC" : "Редактировать NPC";
  const selectedTags = useMemo(
    () => new Set(form.tagIds),
    [form.tagIds]
  );

  function updateField<K extends keyof NpcFormState>(
    key: K,
    value: NpcFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = toPayload(form);
    const result =
      mode === "create"
        ? await createNpc(campaignId, payload)
        : await updateNpc(campaignId, initialNpc?.npc_id ?? "", payload);

    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onSaved();
  }

  async function submitTag() {
    const name = tagName.trim();

    if (!name) {
      return;
    }

    const result = await createTag(campaignId, {
      name,
      color: "#8B5CF6"
    });

    if (result.error) {
      setError(result.error);
      return;
    }

    setTagName("");
    onTagCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070d]/80 p-4 backdrop-blur-sm">
      <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[#A78BFA]">
              NPC editor
            </div>
            <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
          </div>
          <button
            aria-label="Закрыть"
            className="rounded-xl border border-[#273244] p-2 text-[#9CA3AF] transition hover:border-[#8B5CF6]/70 hover:text-[#F5F2EA]"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-[#B84A4A]/35 bg-[#B84A4A]/12 px-4 py-3 text-sm text-[#e89a9a]">
            {error}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Имя">
              <Input
                onChange={(event) => updateField("name", event.target.value)}
                required
                value={form.name}
              />
            </Field>
            <Field label="Титул / роль">
              <Input
                onChange={(event) => updateField("title", event.target.value)}
                value={form.title}
              />
            </Field>
          </div>

          <Field label="Публичное описание">
            <Textarea
              onChange={(event) =>
                updateField("publicDescription", event.target.value)
              }
              value={form.publicDescription}
            />
          </Field>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Секретное описание">
              <Textarea
                onChange={(event) =>
                  updateField("secretDescription", event.target.value)
                }
                value={form.secretDescription}
              />
            </Field>
            <Field label="Секреты ГМа">
              <Textarea
                onChange={(event) =>
                  updateField("gmSecrets", event.target.value)
                }
                value={form.gmSecrets}
              />
            </Field>
          </div>

          <Field label="Журнал кампании">
            <Textarea
              onChange={(event) =>
                updateField("campaignJournal", event.target.value)
              }
              value={form.campaignJournal}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Visibility">
              <Select
                onChange={(event) =>
                  updateField("visibility", event.target.value as Visibility)
                }
                value={form.visibility}
              >
                {Object.entries(visibilityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Локация">
              <Select
                onChange={(event) =>
                  updateField("locationId", event.target.value)
                }
                value={form.locationId}
              >
                <option value="">Без привязки</option>
                {locations.map((location) => (
                  <option key={location.location_id} value={location.location_id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Статус">
              <Input
                onChange={(event) =>
                  updateField("statusText", event.target.value)
                }
                placeholder="например: подозреваемый"
                value={form.statusText}
              />
            </Field>
          </div>

          <Card className="p-4" subtle>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Tags size={16} />
              Теги
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    selectedTags.has(tag.tag_id)
                      ? "border-[#8B5CF6]/60 bg-[#8B5CF6]/18 text-[#C4B5FD]"
                      : "border-[#273244] bg-[#0B0F17]/55 text-[#9CA3AF] hover:border-[#8B5CF6]/50"
                  }`}
                  key={tag.tag_id}
                  onClick={() => {
                    const next = selectedTags.has(tag.tag_id)
                      ? form.tagIds.filter((id) => id !== tag.tag_id)
                      : [...form.tagIds, tag.tag_id];
                    updateField("tagIds", next);
                  }}
                  type="button"
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                onChange={(event) => setTagName(event.target.value)}
                placeholder="Новый тег"
                value={tagName}
              />
              <Button onClick={submitTag} type="button" variant="secondary">
                <Plus size={16} />
                Добавить тег
              </Button>
            </div>
          </Card>

          <div className="flex flex-col-reverse gap-3 border-t border-[#273244]/70 pt-5 sm:flex-row sm:justify-end">
            <Button onClick={onClose} type="button" variant="secondary">
              Отмена
            </Button>
            <Button disabled={saving} type="submit">
              {mode === "create" ? <Plus size={17} /> : <Save size={17} />}
              {saving ? "Сохраняем..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#F5F2EA]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Textarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      className="min-h-28 w-full rounded-xl border border-[#273244] bg-[#0B0F17]/55 px-4 py-3 text-sm leading-6 text-[#F5F2EA] outline-none transition placeholder:text-[#6b7280] focus:border-[#8B5CF6] focus:ring-4 focus:ring-[#8B5CF6]/15"
      {...props}
    />
  );
}

function Select(props: ComponentProps<"select">) {
  return (
    <select
      className="h-12 w-full rounded-xl border border-[#273244] bg-[#0B0F17]/55 px-4 text-sm text-[#F5F2EA] outline-none transition focus:border-[#8B5CF6] focus:ring-4 focus:ring-[#8B5CF6]/15"
      {...props}
    />
  );
}
