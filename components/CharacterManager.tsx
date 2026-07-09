"use client";

import type { ComponentProps, FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Plus, Save, UserRound, X } from "lucide-react";
import { CharacterCard } from "@/components/CharacterCard";
import {
  archiveCharacter,
  createCharacter,
  getCharacters,
  getCurrentUser,
  getDashboard,
  type CharacterInput,
  updateCharacter,
  uploadCharacterPortrait
} from "@/lib/api";
import { statusLabels, visibilityLabels } from "@/lib/ui-labels";
import type { Character, CurrentUser, Dashboard, Visibility } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorState, Input } from "./ui";

type EditorMode = "create" | "edit";

type CharacterFormState = {
  name: string;
  title: string;
  publicDescription: string;
  privateNotes: string;
  gmNotes: string;
  statusText: string;
  visibility: Visibility;
  status: "active" | "archived";
  ownerUserId: string;
};

const emptyForm: CharacterFormState = {
  name: "",
  title: "",
  publicDescription: "",
  privateNotes: "",
  gmNotes: "",
  statusText: "",
  visibility: "party_only",
  status: "active",
  ownerUserId: ""
};

function fromCharacter(character: Character): CharacterFormState {
  return {
    name: character.name,
    title: character.title ?? "",
    publicDescription: character.public_description ?? "",
    privateNotes: character.private_notes ?? "",
    gmNotes: character.gm_notes ?? "",
    statusText: character.status_text ?? "",
    visibility: character.visibility,
    status: character.status,
    ownerUserId: character.owner_user_id ?? ""
  };
}

function toPayload(
  form: CharacterFormState,
  canManageAny: boolean
): CharacterInput {
  const payload: CharacterInput = {
    name: form.name.trim(),
    title: form.title.trim() || null,
    publicDescription: form.publicDescription.trim() || null,
    privateNotes: form.privateNotes.trim() || null,
    statusText: form.statusText.trim() || null,
    visibility: form.visibility
  };

  if (canManageAny) {
    payload.gmNotes = form.gmNotes.trim() || null;
    payload.status = form.status;
    payload.ownerUserId = form.ownerUserId ? Number(form.ownerUserId) : null;
  }

  return payload;
}

export function CharacterManager({ campaignId }: { campaignId: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null
  );

  const role = dashboard?.currentMember.role;
  const canManageAny = Boolean(dashboard?.currentMember.canViewGMSecrets);
  const canCreate = role !== "viewer";
  const canViewSecrets = Boolean(dashboard?.currentMember.canViewGMSecrets);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [dashboardResult, characterResult, userResult] = await Promise.all([
      getDashboard(campaignId),
      getCharacters(campaignId),
      getCurrentUser()
    ]);

    if (dashboardResult.error || characterResult.error) {
      setError(dashboardResult.error ?? characterResult.error);
      setLoading(false);
      return;
    }

    setDashboard(dashboardResult.data);
    setCharacters(characterResult.data ?? []);
    setCurrentUser(userResult.data);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, [campaignId]);

  function canManageCharacter(character: Character) {
    return (
      canManageAny ||
      (role === "player" && character.owner_user_id === currentUser?.user_id)
    );
  }

  function openCreate() {
    setSelectedCharacter(null);
    setEditorMode("create");
    setEditorOpen(true);
  }

  function openEdit(character: Character) {
    setSelectedCharacter(character);
    setEditorMode("edit");
    setEditorOpen(true);
  }

  async function handleArchive(character: Character) {
    const confirmed = window.confirm(
      `Архивировать персонажа "${character.name}"?`
    );

    if (!confirmed) {
      return;
    }

    const result = await archiveCharacter(campaignId, character.character_id);

    if (result.error) {
      setError(result.error);
      return;
    }

    setNotice("Персонаж отправлен в архив.");
    await loadData();
  }

  async function handlePortraitUpload(character: Character, file: File) {
    const result = await uploadCharacterPortrait(
      campaignId,
      character.character_id,
      file
    );

    if (result.error) {
      setError(result.error);
      return;
    }

    setNotice("Портрет персонажа обновлён.");
    await loadData();
  }

  async function handleSaved() {
    setEditorOpen(false);
    setSelectedCharacter(null);
    setNotice(
      editorMode === "create" ? "Персонаж создан." : "Персонаж обновлён."
    );
    await loadData();
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-[#A78BFA]">
              <UserRound size={16} />
              Персонажи кампании
            </div>
            <h2 className="mt-2 text-2xl font-semibold">Герои партии</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#9CA3AF]">
              ГМ видит все заметки, игроки управляют своими персонажами, а
              наблюдатели получают только открытые карточки.
            </p>
          </div>
          {canCreate ? (
            <Button onClick={openCreate} type="button">
              <Plus size={17} />
              Создать персонажа
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={canViewSecrets ? "purple" : "muted"}>
            {canViewSecrets ? "GM заметки видны" : "GM заметки скрыты"}
          </Badge>
          <Badge tone={canCreate ? "green" : "muted"}>
            {canCreate ? "Создание доступно" : "Только чтение"}
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
          Загружаем персонажей...
        </Card>
      ) : error ? (
        <ErrorState message={error} />
      ) : characters.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {characters.map((character) => (
            <CharacterCard
              canManage={canManageCharacter(character)}
              character={character}
              key={character.character_id}
              onArchive={handleArchive}
              onEdit={openEdit}
              onPortraitUpload={
                canManageCharacter(character) ? handlePortraitUpload : undefined
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          description={
            canCreate
              ? "Создайте первого героя кампании."
              : "ГМ пока не открыл персонажей для вашей роли."
          }
          title="Персонажей пока нет"
        />
      )}

      {editorOpen ? (
        <CharacterEditorModal
          campaignId={campaignId}
          canManageAny={canManageAny}
          currentUser={currentUser}
          dashboard={dashboard}
          initialCharacter={selectedCharacter}
          mode={editorMode}
          onClose={() => setEditorOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}

function CharacterEditorModal({
  campaignId,
  mode,
  initialCharacter,
  dashboard,
  currentUser,
  canManageAny,
  onClose,
  onSaved
}: {
  campaignId: string;
  mode: EditorMode;
  initialCharacter: Character | null;
  dashboard: Dashboard | null;
  currentUser: CurrentUser | null;
  canManageAny: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CharacterFormState>(
    initialCharacter
      ? fromCharacter(initialCharacter)
      : {
          ...emptyForm,
          ownerUserId: canManageAny ? "" : currentUser?.user_id ?? ""
        }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title =
    mode === "create" ? "Новый персонаж" : "Редактировать персонажа";
  const ownerOptions =
    dashboard?.members.filter((member) => member.role !== "viewer") ?? [];

  function updateField<K extends keyof CharacterFormState>(
    key: K,
    value: CharacterFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = toPayload(form, canManageAny);
    const result =
      mode === "create"
        ? await createCharacter(campaignId, payload)
        : await updateCharacter(
            campaignId,
            initialCharacter?.character_id ?? "",
            payload
          );

    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070d]/80 p-4 backdrop-blur-sm">
      <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[#A78BFA]">
              Редактор персонажа
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

          <Field label="Личные заметки">
            <Textarea
              onChange={(event) =>
                updateField("privateNotes", event.target.value)
              }
              value={form.privateNotes}
            />
          </Field>

          {canManageAny ? (
            <Field label="GM заметки">
              <Textarea
                onChange={(event) => updateField("gmNotes", event.target.value)}
                value={form.gmNotes}
              />
            </Field>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Состояние в игре">
              <Input
                onChange={(event) =>
                  updateField("statusText", event.target.value)
                }
                placeholder="например: насторожен"
                value={form.statusText}
              />
            </Field>

            {canManageAny ? (
              <Field label="Владелец">
                <Select
                  onChange={(event) =>
                    updateField("ownerUserId", event.target.value)
                  }
                  value={form.ownerUserId}
                >
                  <option value="">Без владельца</option>
                  {ownerOptions.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.display_name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>

          {canManageAny ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Видимость">
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
              <Field label="Статус">
                <Select
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value as CharacterFormState["status"]
                    )
                  }
                  value={form.status}
                >
                  <option value="active">{statusLabels.active}</option>
                  <option value="archived">{statusLabels.archived}</option>
                </Select>
              </Field>
            </div>
          ) : null}

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
