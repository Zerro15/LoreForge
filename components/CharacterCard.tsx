import { Activity, Brain, Eye, ShieldAlert, Sparkles, UserRound } from "lucide-react";
import type { Character, CharacterPreview } from "@/lib/types";
import { Badge, Card, Meter, SecretBlock } from "./ui";

function findValue(
  items: Array<{ name: string; value?: number; current_value?: number }>,
  name: string
) {
  return items.find((item) => item.name.toLowerCase() === name.toLowerCase());
}

function inferPath(character: Character | CharacterPreview) {
  if ("abilities" in character) {
    const names = character.abilities.map((ability) => ability.name).join(" ");
    if (names.includes("Гадание") || names.includes("Духовное зрение")) {
      return "Провидец";
    }
    if (names.includes("Ловкие руки")) {
      return "Ловкач";
    }
  }

  return "Mistbound";
}

export function CharacterCard({
  character
}: {
  character: Character | CharacterPreview;
}) {
  const full = character as Character;
  const sequence =
    "stats" in full ? findValue(full.stats, "Последовательность")?.value : null;
  const spirituality =
    "resources" in full
      ? findValue(full.resources, "Духовность")?.current_value
      : null;
  const sanity =
    "resources" in full ? findValue(full.resources, "Рассудок")?.current_value : null;
  const assimilation =
    "resources" in full ? findValue(full.resources, "Усвоение")?.current_value : null;
  const risk =
    "resources" in full
      ? findValue(full.resources, "Риск потери контроля")?.current_value
      : null;

  return (
    <Card className="p-5 hover:border-[#8B5CF6]/45">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{character.name}</h3>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            {"owner" in character
              ? character.owner.display_name
              : character.owner_display_name}
          </p>
        </div>
        <Badge tone="blue">
          <UserRound size={13} />
          PC
        </Badge>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[#273244] bg-[#171A26]/70 p-3">
          <div className="text-xs text-[#9CA3AF]">Путь</div>
          <div className="mt-1 text-sm font-semibold">{inferPath(character)}</div>
        </div>
        <div className="rounded-xl border border-[#273244] bg-[#171A26]/70 p-3">
          <div className="text-xs text-[#9CA3AF]">Последовательность</div>
          <div className="mt-1 text-sm font-semibold">{sequence ?? "—"}</div>
        </div>
      </div>

      <p className="line-clamp-2 text-sm leading-6 text-[#c7ccd6]">
        {character.public_description ?? "Описание персонажа пока пустое."}
      </p>

      {character.status_text ? (
        <div className="mt-4 rounded-2xl border border-[#273244] bg-[#171A26]/70 p-3 text-sm text-[#9CA3AF]">
          {character.status_text}
        </div>
      ) : null}

      {"resources" in full && full.resources.length > 0 ? (
        <div className="mt-5 space-y-3">
          <ResourceMeter icon={Sparkles} label="Духовность" value={spirituality} tone="purple" />
          <ResourceMeter icon={Brain} label="Рассудок" value={sanity} tone="blue" />
          <ResourceMeter icon={Eye} label="Усвоение" value={assimilation} tone="green" />
          <ResourceMeter icon={ShieldAlert} label="Риск потери контроля" value={risk} tone="danger" />
        </div>
      ) : null}

      {"abilities" in full && full.abilities.length > 0 ? (
        <div className="mt-5 space-y-2">
          {full.abilities.slice(0, 3).map((ability) => (
            <div
              className="rounded-xl border border-[#273244] bg-[#171A26]/70 p-3"
              key={ability.name}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles size={14} className="text-[#A78BFA]" />
                {ability.name}
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#9CA3AF]">
                {ability.description ?? ability.ability_type}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {"secret_description" in full && full.secret_description ? (
        <div className="mt-5">
          <SecretBlock>{full.secret_description}</SecretBlock>
        </div>
      ) : null}

      {"notes" in full && full.notes ? (
        <div className="mt-4 flex items-start gap-2 text-xs text-[#9CA3AF]">
          <Activity size={14} className="mt-0.5 text-[#D6A84F]" />
          {full.notes}
        </div>
      ) : null}
    </Card>
  );
}

function ResourceMeter({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Sparkles;
  label: string;
  value?: number | null;
  tone: "purple" | "blue" | "green" | "danger";
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-[#9CA3AF]">
        <span className="flex items-center gap-2">
          <Icon size={13} />
          {label}
        </span>
        <span>{value ?? "—"} / 100</span>
      </div>
      <Meter value={value ?? 0} tone={tone} />
    </div>
  );
}
