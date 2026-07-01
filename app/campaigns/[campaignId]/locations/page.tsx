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
  const roots = data?.filter((location) => !location.parent_location_id) ?? [];

  return (
    <AppShell
      campaignId={campaignId}
      title="Локации"
      subtitle="Структура мира, вложенные места, состояние сцен и секретные заметки мастера."
    >
      {error ? (
        <ErrorState message={error} />
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {roots.map((root) => {
            const children = data.filter(
              (location) => location.parent_location_id === root.location_id
            );

            return (
              <div className="space-y-3" key={root.location_id}>
                <LocationCard location={root} />
                {children.length > 0 ? (
                  <div className="ml-4 space-y-3 border-l border-[#273244] pl-4 md:ml-8 md:pl-6">
                    {children.map((child) => {
                      const grandchildren = data.filter(
                        (location) =>
                          location.parent_location_id === child.location_id
                      );

                      return (
                        <div className="space-y-3" key={child.location_id}>
                          <LocationCard
                            location={child}
                            parentName={names.get(child.parent_location_id ?? "")}
                          />
                          {grandchildren.length > 0 ? (
                            <div className="ml-4 grid gap-3 border-l border-[#273244] pl-4 xl:grid-cols-2">
                              {grandchildren.map((location) => (
                                <LocationCard
                                  key={location.location_id}
                                  location={location}
                                  parentName={names.get(
                                    location.parent_location_id ?? ""
                                  )}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
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
