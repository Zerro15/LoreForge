import { Archive, Bot, Edit3, Tags } from "lucide-react";
import { getLabel, visibilityLabels } from "@/lib/ui-labels";
import type { Npc, NpcPreview } from "@/lib/types";
import { Badge, Button, Card, SecretBlock } from "./ui";

export function NPCDossierCard({
  npc,
  canManage = false,
  onEdit,
  onArchive
}: {
  npc: Npc | NpcPreview;
  canManage?: boolean;
  onEdit?: (npc: Npc) => void;
  onArchive?: (npc: Npc) => void;
}) {
  const full = npc as Npc;

  return (
    <Card className="p-5 hover:border-[#8B5CF6]/45">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{npc.name}</h3>
          {npc.title ? (
            <p className="mt-1 text-sm text-[#D6A84F]">{npc.title}</p>
          ) : null}
        </div>
        <Badge tone={npc.visibility === "public" ? "green" : "purple"}>
          <Bot size={13} />
          {getLabel(visibilityLabels, npc.visibility)}
        </Badge>
      </div>

      <p className="line-clamp-3 text-sm leading-6 text-[#c7ccd6]">
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
          <SecretBlock title="Секрет ГМа">
            {full.gm_secrets}
          </SecretBlock>
        </div>
      ) : null}

      {canManage && "secret_description" in full ? (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#273244]/70 pt-4">
          <Button
            className="min-h-9 px-3"
            onClick={() => onEdit?.(full)}
            type="button"
            variant="secondary"
          >
            <Edit3 size={15} />
            Редактировать
          </Button>
          <Button
            className="min-h-9 px-3"
            onClick={() => onArchive?.(full)}
            type="button"
            variant="danger"
          >
            <Archive size={15} />
            Архивировать
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
