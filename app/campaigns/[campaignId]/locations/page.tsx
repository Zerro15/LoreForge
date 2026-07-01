import { AppShell } from "@/components/AppShell";
import { LocationCard } from "@/components/LocationCard";
import { EmptyState, ErrorState } from "@/components/ui";
import { getLocations } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function LocationsPage({
  params
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const { data, error } = await getLocations(campaignId);
  const names = new Map(data?.map((location) => [location.location_id, location.name]));

  return (
    <AppShell
      campaignId={campaignId}
      title="Локации"
      subtitle="Структура мира, вложенные места, состояние сцен и секретные заметки мастера."
    >
      {error ? (
        <ErrorState message={error} />
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.map((location) => (
            <LocationCard
              key={location.location_id}
              location={location}
              parentName={
                location.parent_location_id
                  ? names.get(location.parent_location_id)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          description="Локации появятся после наполнения кампании."
          title="Локаций пока нет"
        />
      )}
    </AppShell>
  );
}
