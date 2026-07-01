import {
  Bot,
  Crosshair,
  Map,
  MessageSquare,
  ArrowRight,
  ScrollText,
  Users
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CharacterCard } from "@/components/CharacterCard";
import { ChatMessage } from "@/components/ChatMessage";
import { DiceRollPanel } from "@/components/DiceRollPanel";
import { LocationCard } from "@/components/LocationCard";
import { NPCDossierCard } from "@/components/NPCDossierCard";
import { SessionEventCard } from "@/components/SessionEventCard";
import { Badge, Button, Card, ErrorState, PluginBadge, StatCard } from "@/components/ui";
import { getDashboard } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CampaignDashboardPage({
  params
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const { data, error } = await getDashboard(campaignId);

  return (
    <AppShell
      campaignId={campaignId}
      title={data?.campaign.title ?? "Кампания"}
      subtitle={data?.campaign.description ?? "Dashboard кампании LoreForge."}
    >
      {error || !data ? (
        <ErrorState message={error ?? "Кампания не найдена"} />
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden p-6">
            <div className="flex flex-col justify-between gap-5 md:flex-row">
              <div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge tone="green">{data.campaign.status}</Badge>
                  <PluginBadge name={data.activePlugin?.name} />
                </div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  {data.campaign.title}
                </h2>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-[#9CA3AF]">
                  {data.campaign.public_journal ??
                    data.campaign.description ??
                    "Публичный журнал пока пуст."}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button href={`/campaigns/${campaignId}/chat`}>
                    <MessageSquare size={16} />
                    Открыть чат
                  </Button>
                  <Button href={`/campaigns/${campaignId}/characters`} variant="secondary">
                    <Users size={16} />
                    Персонажи
                  </Button>
                  <Button href={`/campaigns/${campaignId}/npcs`} variant="secondary">
                    <Bot size={16} />
                    NPC
                  </Button>
                  <Button href={`/campaigns/${campaignId}/session-log`} variant="secondary">
                    <ScrollText size={16} />
                    Журнал
                  </Button>
                </div>
              </div>
              <Card subtle className="min-w-64 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-[#A78BFA]">
                  Активный плагин
                </div>
                <div className="mt-2 text-xl font-semibold">
                  {data.activePlugin?.name ?? "Core"}
                </div>
                <p className="mt-2 line-clamp-4 text-sm text-[#9CA3AF]">
                  {data.activePlugin?.description ??
                    "Базовые правила кампании."}
                </p>
              </Card>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              icon={Users}
              label="Персонажи"
              value={data.stats.charactersCount}
            />
            <StatCard icon={Bot} label="NPC" value={data.stats.npcsCount} />
            <StatCard
              icon={Map}
              label="Локации"
              value={data.stats.locationsCount}
            />
            <StatCard
              icon={Crosshair}
              label="Расследования"
              value={data.stats.investigationsCount}
            />
            <StatCard
              icon={ScrollText}
              label="События"
              value={data.stats.sessionEventsCount}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Последние события</h3>
                <Button href={`/campaigns/${campaignId}/session-log`} variant="ghost">
                  Все события
                  <ArrowRight size={15} />
                </Button>
              </div>
              <div className="space-y-3">
                {data.recentSessionEvents.slice(0, 4).map((event) => (
                  <SessionEventCard event={event} key={event.session_event_id} />
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare size={18} className="text-[#A78BFA]" />
                <h3 className="text-lg font-semibold">Последние сообщения</h3>
              </div>
              <div className="space-y-3">
                {data.recentMessages.slice(0, 3).map((message) => (
                  <ChatMessage message={message} key={message.message_id} />
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-5">
              <h3 className="mb-4 text-lg font-semibold">Партия</h3>
              <div className="space-y-3">
                {data.characters.slice(0, 3).map((character) => (
                  <CharacterCard
                    character={character}
                    key={character.character_id}
                  />
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-4 text-lg font-semibold">NPC и локации</h3>
              <div className="space-y-3">
                {data.npcs.slice(0, 2).map((npc) => (
                  <NPCDossierCard key={npc.npc_id} npc={npc} />
                ))}
                {data.locations.slice(0, 1).map((location) => (
                  <LocationCard key={location.location_id} location={location} />
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-4 text-lg font-semibold">Расследование</h3>
              <div className="space-y-3">
                {data.investigations.map((investigation) => (
                  <Card subtle className="p-4" key={investigation.investigation_id}>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-semibold">{investigation.name}</h4>
                      <Badge tone="orange">{investigation.status}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#9CA3AF]">
                      {investigation.description}
                    </p>
                  </Card>
                ))}
                {data.recentDiceRolls.slice(0, 3).map((roll) => (
                  <DiceRollPanel key={roll.roll_id} roll={roll} />
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
