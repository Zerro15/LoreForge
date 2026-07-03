import { AppShell } from "@/components/AppShell";
import { NPCManager } from "@/components/NPCManager";

export const dynamic = "force-dynamic";

export default async function NpcsPage({
  params
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  return (
    <AppShell
      campaignId={campaignId}
      title="NPC"
      subtitle="Досье ключевых персонажей мира, включая публичные заметки и блоки секретов ГМа."
    >
      <NPCManager campaignId={campaignId} />
    </AppShell>
  );
}
