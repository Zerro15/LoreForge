"use client";

import { ReactNode } from "react";
import {
  RealtimeEvent,
  RealtimeStatus,
  useCampaignRealtime
} from "@/lib/realtime";

export function RealtimeProvider({
  campaignId,
  onEvent,
  children
}: {
  campaignId: string;
  onEvent: (event: RealtimeEvent) => void;
  children: (status: RealtimeStatus) => ReactNode;
}) {
  const status = useCampaignRealtime(campaignId, onEvent);

  return <>{children(status)}</>;
}
