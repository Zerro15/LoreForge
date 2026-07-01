import { AppShell } from "@/components/AppShell";
import { NPCDossierCard } from "@/components/NPCDossierCard";
import { EmptyState, ErrorState } from "@/components/ui";
import { getNpcs } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function NpcsPage({
  params
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const { data, error } = await getNpcs(campaignId);

  return (
    <AppShell
      campaignId={campaignId}
      title="NPC"
      subtitle="Досье ключевых персонажей мира, включая публичные заметки и блоки секретов ГМа."
    >
      {error ? (
        <ErrorState message={error} />
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.map((npc) => (
            <NPCDossierCard key={npc.npc_id} npc={npc} />
          ))}
        </div>
      ) : (
        <EmptyState
          description="Досье появятся после наполнения кампании."
          title="NPC пока нет"
        />
      )}
    </AppShell>
  );
}
