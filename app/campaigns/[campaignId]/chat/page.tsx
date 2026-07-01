import { AppShell } from "@/components/AppShell";
import { ChatMessage } from "@/components/ChatMessage";
import { DiceRollPanel } from "@/components/DiceRollPanel";
import { Card, EmptyState, ErrorState } from "@/components/ui";
import { getChat } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const { data, error } = await getChat(campaignId);
  const rolls = data?.filter((message) => message.dice_roll).slice(0, 5) ?? [];

  return (
    <AppShell
      campaignId={campaignId}
      title="Чат"
      subtitle="Последние сообщения кампании и броски кубиков из backend API."
    >
      {error ? (
        <ErrorState message={error} />
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {data.map((message) => (
              <ChatMessage message={message} key={message.message_id} />
            ))}
          </div>
          <Card className="h-fit p-5">
            <h2 className="mb-4 text-lg font-semibold">Последние броски</h2>
            <div className="space-y-3">
              {rolls.length > 0 ? (
                rolls.map((message) =>
                  message.dice_roll ? (
                    <DiceRollPanel
                      key={message.dice_roll.roll_id}
                      roll={message.dice_roll}
                    />
                  ) : null
                )
              ) : (
                <p className="text-sm text-[#9CA3AF]">
                  Бросков в последних сообщениях нет.
                </p>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState
          description="Сообщения появятся после активности игроков."
          title="Чат пока пуст"
        />
      )}
    </AppShell>
  );
}
