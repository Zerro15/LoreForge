import { AppShell } from "@/components/AppShell";
import { GameWorkspace } from "@/components/LocationPlayRoom";

export const dynamic = "force-dynamic";

export default async function CampaignPlayRoomPage({
  params
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  return (
    <AppShell
      campaignId={campaignId}
      title="Игровая комната"
      subtitle="Активная локация, чат, кубики и запросы переходов в одном экране."
      variant="play"
    >
      <GameWorkspace campaignId={campaignId} />
    </AppShell>
  );
}
