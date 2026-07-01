import { Activity, Sparkles, UserRound } from "lucide-react";
import type { Character, CharacterPreview } from "@/lib/types";
import { Badge, Card, ProgressBar, SecretBlock } from "./ui";

export function CharacterCard({
  character
}: {
  character: Character | CharacterPreview;
}) {
  const full = character as Character;

  return (
    <Card className="p-5">
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

      <p className="text-sm leading-6 text-[#c7ccd6]">
        {character.public_description ?? "Описание персонажа пока пустое."}
      </p>

      {character.status_text ? (
        <div className="mt-4 rounded-2xl border border-[#273244] bg-[#171A26]/70 p-3 text-sm text-[#9CA3AF]">
          {character.status_text}
        </div>
      ) : null}

      {"stats" in full && full.stats.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {full.stats.slice(0, 6).map((stat) => (
            <div
              className="rounded-xl border border-[#273244] bg-[#0B0F17]/35 p-3"
              key={stat.name}
            >
              <div className="text-xs text-[#9CA3AF]">{stat.name}</div>
              <div className="text-lg font-semibold">{stat.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {"resources" in full && full.resources.length > 0 ? (
        <div className="mt-5 space-y-3">
          {full.resources.map((resource) => (
            <div key={resource.name}>
              <div className="mb-1 flex justify-between text-xs text-[#9CA3AF]">
                <span>{resource.name}</span>
                <span>
                  {resource.current_value}
                  {resource.max_value ? ` / ${resource.max_value}` : ""}
                </span>
              </div>
              <ProgressBar
                value={
                  resource.max_value
                    ? (resource.current_value / resource.max_value) * 100
                    : 100
                }
              />
            </div>
          ))}
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
              <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
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
