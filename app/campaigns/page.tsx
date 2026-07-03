import { AppShell } from "@/components/AppShell";
import { CampaignsList } from "@/components/CampaignsList";

export const dynamic = "force-dynamic";

export default function CampaignsPage() {
  return (
    <AppShell
      title="Кампании"
      subtitle="Выберите активный мир, проверьте состав партии и продолжите подготовку сессии."
    >
      <CampaignsList />
    </AppShell>
  );
}
