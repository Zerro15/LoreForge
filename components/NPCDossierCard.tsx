import { Bot, Tags } from "lucide-react";
import type { Npc, NpcPreview } from "@/lib/types";
import { Badge, Card, SecretBlock } from "./ui";

export function NPCDossierCard({ npc }: { npc: Npc | NpcPreview }) {
  const full = npc as Npc;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{npc.name}</h3>
          {npc.title ? (
            <p className="mt-1 text-sm text-[#D6A84F]">{npc.title}</p>
          ) : null}
        </div>
        <Badge tone={npc.visibility === "public" ? "green" : "purple"}>
          <Bot size={13} />
          {npc.visibility}
        </Badge>
      </div>

      <p className="text-sm leading-6 text-[#c7ccd6]">
        {npc.public_description ?? "Публичное описание пока не заполнено."}
      </p>

      {npc.status_text ? (
        <div className="mt-4 rounded-2xl border border-[#273244] bg-[#171A26]/70 p-3 text-sm text-[#9CA3AF]">
          {npc.status_text}
        </div>
      ) : null}

      {"tags" in full && full.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {full.tags.map((tag) => (
            <Badge key={tag.tag_id} tone="muted">
              <Tags size={12} />
              {tag.name}
            </Badge>
          ))}
        </div>
      ) : null}

      {"secret_description" in full && full.secret_description ? (
        <div className="mt-5">
          <SecretBlock>{full.secret_description}</SecretBlock>
        </div>
      ) : null}

      {"gm_secrets" in full && full.gm_secrets ? (
        <div className="mt-3">
          <SecretBlock title="Секрет ГМа / TODO access control">
            {full.gm_secrets}
          </SecretBlock>
        </div>
      ) : null}
    </Card>
  );
}
