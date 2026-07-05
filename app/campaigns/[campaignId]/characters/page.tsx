import { AppShell } from "@/components/AppShell";
import { CharacterManager } from "@/components/CharacterManager";

export const dynamic = "force-dynamic";

export default async function CharactersPage({
  params
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  return (
    <AppShell
      campaignId={campaignId}
      title="Персонажи"
      subtitle="Игровые персонажи, характеристики, ресурсы и способности из активного мира."
    >
      <CharacterManager campaignId={campaignId} />
    </AppShell>
  );
}
