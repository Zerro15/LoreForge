import { CalendarDays } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SessionEventCard } from "@/components/SessionEventCard";
import { Badge, Card, EmptyState, ErrorState, SecretBlock } from "@/components/ui";
import { getSessionLog } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SessionLogPage({
  params
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const { data, error } = await getSessionLog(campaignId);

  return (
    <AppShell
      campaignId={campaignId}
      title="Журнал сессий"
      subtitle="Публичные итоги, приватные заметки мастера и цепочка событий кампании."
    >
      {error ? (
        <ErrorState message={error} />
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {data.map((log) => (
            <Card className="p-6" key={log.session_log_id}>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{log.title}</h2>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[#9CA3AF]">
                    <CalendarDays size={15} />
                    {log.session_date
                      ? new Date(log.session_date).toLocaleDateString("ru-RU")
                      : "Дата не указана"}
                  </div>
                </div>
                <Badge tone={log.visibility === "public" ? "green" : "purple"}>
                  {log.visibility}
                </Badge>
              </div>

              {log.summary_public ? (
                <p className="text-sm leading-6 text-[#c7ccd6]">
                  {log.summary_public}
                </p>
              ) : null}

              {log.summary_private ? (
                <div className="mt-4">
                  <SecretBlock>{log.summary_private}</SecretBlock>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {log.events.map((event) => (
                  <SessionEventCard
                    event={event}
                    key={event.session_event_id}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Журнал появится после демо-seed или первой игровой сессии."
          title="Журнал пока пуст"
        />
      )}
    </AppShell>
  );
}
