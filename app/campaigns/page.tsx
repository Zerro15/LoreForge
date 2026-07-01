import { CampaignCard } from "@/components/CampaignCard";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState } from "@/components/ui";
import { getCampaigns } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const { data, error } = await getCampaigns();

  return (
    <AppShell
      title="Кампании"
      subtitle="Выберите активный мир, проверьте состав партии и продолжите подготовку сессии."
    >
      {error ? (
        <ErrorState message={error} />
      ) : data && data.length > 0 ? (
        <div className="grid gap-4">
          {data.map((campaign) => (
            <CampaignCard campaign={campaign} key={campaign.campaign_id} />
          ))}
        </div>
      ) : (
        <EmptyState
          description="После применения seed здесь появится демо-кампания."
          title="Кампаний пока нет"
        />
      )}
    </AppShell>
  );
}
