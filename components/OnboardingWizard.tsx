"use client";

import {
  ArrowRight,
  Check,
  Crown,
  MapPinned,
  Sparkles,
  Upload,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  activateLocation,
  createCampaign,
  createLocation,
  getCurrentUser,
  getWorldPlugins,
  uploadLocationImage
} from "@/lib/api";
import type { CurrentUser, WorldPlugin } from "@/lib/types";
import { Badge, Button, Card, Input } from "./ui";

type Step = 1 | 2 | 3 | 4 | 5;

const steps: Array<{ step: Step; label: string }> = [
  { step: 1, label: "Кто вы?" },
  { step: 2, label: "Кампания" },
  { step: 3, label: "Мир / Плагин" },
  { step: 4, label: "Стартовая локация" },
  { step: 5, label: "Приглашения" }
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [plugins, setPlugins] = useState<WorldPlugin[]>([]);
  const [title, setTitle] = useState("Новая кампания");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [selectedPluginId, setSelectedPluginId] = useState<string>("");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("Первая локация");
  const [locationPublicDescription, setLocationPublicDescription] = useState(
    "Стартовая сцена кампании."
  );
  const [locationSecretDescription, setLocationSecretDescription] = useState("");
  const [locationImage, setLocationImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mistbound = useMemo(
    () => plugins.find((plugin) => plugin.slug === "mistbound") ?? plugins[0],
    [plugins]
  );

  useEffect(() => {
    getCurrentUser().then((result) => {
      if (result.data) {
        setCurrentUser(result.data);
      }
    });

    getWorldPlugins().then((result) => {
      const nextPlugins = result.data ?? [];
      setPlugins(nextPlugins);
      const nextMistbound =
        nextPlugins.find((plugin) => plugin.slug === "mistbound") ?? nextPlugins[0];

      if (nextMistbound) {
        setSelectedPluginId(nextMistbound.world_plugin_id);
      }
    });
  }, []);

  function next(nextStep: Step) {
    setError(null);
    setStep(nextStep);
  }

  async function createCampaignAndContinue() {
    setBusy(true);
    setError(null);

    const result = await createCampaign({
      title,
      description,
      visibility,
      maxPlayers,
      worldPluginId: selectedPluginId ? Number(selectedPluginId) : null
    });

    setBusy(false);

    if (result.error || !result.data) {
      setError(result.error ?? "Не удалось создать кампанию");
      return;
    }

    setCampaignId(result.data.campaign_id);
    next(4);
  }

  async function createStartingLocation(skip = false) {
    if (!campaignId) {
      setError("Сначала нужно создать кампанию");
      return;
    }

    if (skip) {
      next(5);
      return;
    }

    setBusy(true);
    setError(null);

    const location = await createLocation(campaignId, {
      name: locationName,
      publicDescription: locationPublicDescription,
      secretDescription: locationSecretDescription || null,
      visibility: "public",
      isEventLocation: false
    });

    if (location.error || !location.data) {
      setBusy(false);
      setError(location.error ?? "Не удалось создать локацию");
      return;
    }

    if (locationImage) {
      const upload = await uploadLocationImage(
        campaignId,
        location.data.location_id,
        locationImage
      );

      if (upload.error) {
        setBusy(false);
        setError(upload.error);
        return;
      }
    }

    const activate = await activateLocation(campaignId, location.data.location_id);
    setBusy(false);

    if (activate.error) {
      setError(activate.error);
      return;
    }

    next(5);
  }

  function finish() {
    if (campaignId) {
      router.push(`/campaigns/${campaignId}`);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen px-4 py-4 text-[#F5F2EA] md:px-6">
      <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="glass flex min-h-[calc(100vh-2rem)] flex-col justify-between rounded-3xl p-6">
          <div>
            <div className="mb-10 flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-[#8B5CF6]/45 bg-[#8B5CF6]/15 text-[#A78BFA] purple-glow">
                <Sparkles size={30} />
              </div>
              <div className="text-2xl tracking-[0.18em]">LOREFORGE</div>
            </div>
            <h2 className="text-xl font-semibold">Создание вашей первой кампании</h2>
            <p className="mt-4 text-sm leading-6 text-[#9CA3AF]">
              Мы проведём вас через несколько простых шагов, чтобы вы могли быстро начать игру.
            </p>
          </div>
          <Card subtle className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8B5CF6]/45 text-[#A78BFA]">
                ?
              </div>
              <div>
                <div className="font-semibold">Нужна помощь?</div>
                <div className="text-xs text-[#9CA3AF]">Смотрите docs/onboarding.md</div>
              </div>
            </div>
          </Card>
        </aside>

        <main className="glass rounded-3xl p-6 md:p-9">
          <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Добро пожаловать в LoreForge!
              </h1>
              <p className="mt-2 text-[#9CA3AF]">
                Создайте свою первую кампанию за несколько шагов.
              </p>
            </div>
            <Card subtle className="px-4 py-3">
              <div className="font-semibold">{currentUser?.display_name ?? "Гость"}</div>
              <div className="text-sm text-[#9CA3AF]">{currentUser?.email}</div>
            </Card>
          </header>

          <div className="mb-8 grid gap-3 md:grid-cols-5">
            {steps.map((item) => (
              <div className="flex items-center gap-3" key={item.step}>
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                    item.step === step
                      ? "border-[#8B5CF6] bg-[#8B5CF6] text-white shadow-[0_0_32px_rgba(139,92,246,0.55)]"
                      : item.step < step
                        ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/15 text-[#A78BFA]"
                        : "border-[#273244] bg-[#111827] text-[#9CA3AF]"
                  }`}
                >
                  {item.step < step ? <Check size={18} /> : item.step}
                </div>
                <div className={item.step === step ? "text-[#F5F2EA]" : "text-[#9CA3AF]"}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {error ? (
            <div className="mb-5 rounded-2xl border border-[#B84A4A]/40 bg-[#B84A4A]/12 p-4 text-sm text-[#e89a9a]">
              {error}
            </div>
          ) : null}

          <Card className="p-6 md:p-8">
            {step === 1 ? (
              <div>
                <Badge>Шаг 1 из 5</Badge>
                <h2 className="mt-4 text-2xl font-semibold">Добро пожаловать в LoreForge</h2>
                <p className="mt-2 text-[#9CA3AF]">
                  Создайте первую кампанию или присоединитесь к существующей.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <button
                    className="rounded-2xl border border-[#8B5CF6]/60 bg-[#8B5CF6]/12 p-5 text-left transition hover:bg-[#8B5CF6]/18"
                    onClick={() => next(2)}
                    type="button"
                  >
                    <Crown className="mb-4 text-[#A78BFA]" />
                    <div className="text-lg font-semibold">Создать кампанию как ГМ</div>
                    <p className="mt-2 text-sm text-[#9CA3AF]">
                      Вы будете владельцем кампании и попадёте в Play Room.
                    </p>
                  </button>
                  <button
                    className="cursor-not-allowed rounded-2xl border border-[#273244] bg-[#171A26]/60 p-5 text-left opacity-60"
                    disabled
                    type="button"
                  >
                    <Users className="mb-4 text-[#9CA3AF]" />
                    <div className="text-lg font-semibold">Присоединиться как игрок</div>
                    <p className="mt-2 text-sm text-[#9CA3AF]">Скоро</p>
                  </button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <Badge>Шаг 2 из 5</Badge>
                <h2 className="mt-4 text-2xl font-semibold">Настройте свою кампанию</h2>
                <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.7fr]">
                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm">Название кампании</span>
                      <Input onChange={(event) => setTitle(event.target.value)} value={title} />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm">Описание кампании</span>
                      <textarea
                        className="min-h-28 w-full rounded-xl border border-[#273244] bg-[#0B0F17]/55 px-4 py-3 text-sm outline-none focus:border-[#8B5CF6]"
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Кратко опишите сеттинг, темы и стартовую ситуацию."
                        value={description}
                      />
                    </label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm">Видимость кампании</span>
                        <select
                          className="h-12 w-full rounded-xl border border-[#273244] bg-[#0B0F17] px-3"
                          onChange={(event) => setVisibility(event.target.value as "private" | "public")}
                          value={visibility}
                        >
                          <option value="private">Приватная</option>
                          <option value="public">Публичная</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm">Максимум игроков</span>
                        <Input
                          max={20}
                          min={1}
                          onChange={(event) => setMaxPlayers(Number(event.target.value))}
                          type="number"
                          value={maxPlayers}
                        />
                      </label>
                    </div>
                  </div>
                  <Card subtle className="p-5">
                    <Sparkles className="mb-5 text-[#A78BFA]" />
                    <h3 className="text-xl font-semibold">Это ваш мир</h3>
                    <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">
                      Вы решаете, куда приведёт история, какие тайны откроются и как будут развиваться события.
                    </p>
                  </Card>
                </div>
                <FooterButtons
                  back={() => next(1)}
                  next={() => next(3)}
                  nextLabel="Далее"
                />
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <Badge>Шаг 3 из 5</Badge>
                <h2 className="mt-4 text-2xl font-semibold">Выберите мир / plugin</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <PluginCard
                    active={selectedPluginId === mistbound?.world_plugin_id}
                    description="Пути, последовательности, духовность и риск потери контроля."
                    disabled={!mistbound}
                    label="Mistbound"
                    onClick={() => mistbound && setSelectedPluginId(mistbound.world_plugin_id)}
                  />
                  <PluginCard disabled description="Скоро" label="DnD-like" />
                  <PluginCard disabled description="Скоро" label="Custom World" />
                </div>
                <FooterButtons
                  back={() => next(2)}
                  next={() => void createCampaignAndContinue()}
                  nextDisabled={busy || !selectedPluginId}
                  nextLabel={busy ? "Создаю..." : "Создать кампанию"}
                />
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <Badge>Шаг 4 из 5</Badge>
                <h2 className="mt-4 text-2xl font-semibold">Стартовая локация</h2>
                <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.7fr]">
                  <div className="space-y-4">
                    <Input
                      onChange={(event) => setLocationName(event.target.value)}
                      value={locationName}
                    />
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-[#273244] bg-[#0B0F17]/55 px-4 py-3 text-sm outline-none focus:border-[#8B5CF6]"
                      onChange={(event) => setLocationPublicDescription(event.target.value)}
                      value={locationPublicDescription}
                    />
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-[#273244] bg-[#0B0F17]/55 px-4 py-3 text-sm outline-none focus:border-[#8B5CF6]"
                      onChange={(event) => setLocationSecretDescription(event.target.value)}
                      placeholder="Секретное описание optional"
                      value={locationSecretDescription}
                    />
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#273244] bg-[#171A26]/70 p-4 text-sm transition hover:border-[#8B5CF6]/60">
                      <Upload size={18} className="text-[#A78BFA]" />
                      {locationImage ? locationImage.name : "Загрузить картинку optional"}
                      <input
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => setLocationImage(event.target.files?.[0] ?? null)}
                        type="file"
                      />
                    </label>
                  </div>
                  <Card subtle className="p-5">
                    <MapPinned className="mb-5 text-[#A78BFA]" />
                    <h3 className="text-xl font-semibold">Первая сцена</h3>
                    <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">
                      Эта локация станет активной в Play Room. Позже ГМ сможет добавить больше мест и открыть их игрокам.
                    </p>
                  </Card>
                </div>
                <div className="mt-8 flex flex-wrap justify-between gap-3">
                  <Button onClick={() => next(3)} type="button" variant="secondary">
                    Назад
                  </Button>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => void createStartingLocation(true)} type="button" variant="ghost">
                      Пропустить
                    </Button>
                    <Button disabled={busy} onClick={() => void createStartingLocation(false)} type="button">
                      {busy ? "Создаю..." : "Создать локацию"}
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div>
                <Badge>Шаг 5 из 5</Badge>
                <h2 className="mt-4 text-2xl font-semibold">Приглашения появятся позже</h2>
                <p className="mt-3 max-w-2xl text-[#9CA3AF]">
                  Сейчас кампания готова: мир выбран, стартовая локация создана, можно открыть игровую комнату.
                </p>
                <div className="mt-8">
                  <Button onClick={finish} type="button">
                    Перейти в игровую комнату
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </main>
      </div>
    </div>
  );
}

function PluginCard({
  active,
  disabled,
  label,
  description,
  onClick
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={`rounded-2xl border p-5 text-left transition ${
        active
          ? "border-[#8B5CF6] bg-[#8B5CF6]/16"
          : "border-[#273244] bg-[#171A26]/65"
      } ${disabled ? "cursor-not-allowed opacity-55" : "hover:border-[#8B5CF6]/70"}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Sparkles className="mb-4 text-[#A78BFA]" />
      <div className="text-lg font-semibold">{label}</div>
      <p className="mt-2 text-sm text-[#9CA3AF]">{description}</p>
    </button>
  );
}

function FooterButtons({
  back,
  next,
  nextLabel,
  nextDisabled
}: {
  back: () => void;
  next: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-8 flex justify-between gap-3">
      <Button onClick={back} type="button" variant="secondary">
        Назад
      </Button>
      <Button disabled={nextDisabled} onClick={next} type="button">
        {nextLabel}
        <ArrowRight size={16} />
      </Button>
    </div>
  );
}
