"use client";

import { useEffect, useState } from "react";
import { getCampaigns } from "@/lib/api";
import type { CampaignSummary } from "@/lib/types";
import { CampaignCard } from "./CampaignCard";
import { Button, Card, ErrorState } from "./ui";

export function CampaignsList() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCampaigns().then((result) => {
      setCampaigns(result.data);
      setError(result.error);
    });
  }, []);

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!campaigns) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 h-2 w-16 rounded-full bg-[#8B5CF6]" />
        <h2 className="text-xl font-semibold">Загружаю кампании...</h2>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 h-2 w-16 rounded-full bg-[#8B5CF6]" />
        <h2 className="text-xl font-semibold">У вас пока нет кампаний</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[#9CA3AF]">
          Создайте первую кампанию, выберите мир и сразу перейдите в игровую комнату.
        </p>
        <div className="mt-5">
          <Button href="/onboarding">Создать первую кампанию</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {campaigns.map((campaign) => (
        <CampaignCard campaign={campaign} key={campaign.campaign_id} />
      ))}
    </div>
  );
}
