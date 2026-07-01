import { AppShell } from "@/components/AppShell";
import { CharacterCard } from "@/components/CharacterCard";
import { EmptyState, ErrorState } from "@/components/ui";
import { getCharacters } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CharactersPage({
  params
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const { data, error } = await getCharacters(campaignId);

  return (
    <AppShell
      campaignId={campaignId}
      title="Персонажи"
      subtitle="Игровые персонажи, характеристики, ресурсы и способности из активного мира."
    >
      {error ? (
        <ErrorState message={error} />
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.map((character) => (
            <CharacterCard character={character} key={character.character_id} />
          ))}
        </div>
      ) : (
        <EmptyState
          description="После seed здесь появятся герои партии."
          title="Персонажей пока нет"
        />
      )}
    </AppShell>
  );
}
