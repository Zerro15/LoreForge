import { Clock, ScrollText } from "lucide-react";
import type { SessionEvent } from "@/lib/types";
import { Badge, Card } from "./ui";

export function SessionEventCard({ event }: { event: SessionEvent }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ScrollText size={16} className="text-[#A78BFA]" />
          {event.title}
        </div>
        <Badge tone="blue">{event.event_type}</Badge>
      </div>
      {event.description ? (
        <p className="text-sm leading-6 text-[#c7ccd6]">{event.description}</p>
      ) : null}
      <div className="mt-3 flex items-center gap-2 text-xs text-[#6f7787]">
        <Clock size={13} />
        {new Date(event.created_at).toLocaleString("ru-RU")}
      </div>
    </Card>
  );
}
