import { ArrowRight, Bot, Map, Users } from "lucide-react";
import type { CampaignSummary } from "@/lib/types";
import { Badge, Button, Card, PluginBadge } from "./ui";

export function CampaignCard({ campaign }: { campaign: CampaignSummary }) {
  return (
    <Card className="p-6 transition hover:border-[#8B5CF6]/60 hover:shadow-[0_22px_70px_rgba(139,92,246,0.16)]">
      <div className="flex flex-col justify-between gap-5 md:flex-row">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="green">{campaign.status}</Badge>
            <PluginBadge name={campaign.active_plugin_name} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {campaign.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9CA3AF]">
            {campaign.description ?? "Кампания без описания."}
          </p>
        </div>
        <Button href={`/campaigns/${campaign.campaign_id}`}>
          Открыть кампанию
          <ArrowRight size={17} />
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Users} label="Игроки" value={campaign.members_count} />
        <Metric
          icon={Users}
          label="Персонажи"
          value={campaign.characters_count}
        />
        <Metric icon={Bot} label="NPC" value={campaign.npcs_count} />
        <Metric icon={Map} label="Локации" value={campaign.locations_count} />
      </div>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[#273244] bg-[#171A26]/70 p-4">
      <div className="mb-3 flex items-center gap-2 text-[#9CA3AF]">
        <Icon size={16} />
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
