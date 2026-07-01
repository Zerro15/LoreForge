import { MessageSquare, UserRound } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { Badge, Card } from "./ui";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const sender =
    message.sender?.character_name ??
    message.sender?.npc_name ??
    message.sender?.display_name ??
    message.sender_character ??
    message.sender_npc ??
    message.sender_user ??
    "Система";

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#273244] bg-[#171A26] text-[#A78BFA]">
            {message.message_type === "dice" ? (
              <MessageSquare size={15} />
            ) : (
              <UserRound size={15} />
            )}
          </span>
          {sender}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={message.message_type === "dice" ? "gold" : "muted"}>
            {message.message_type}
          </Badge>
          <Badge tone={message.visibility === "public" ? "green" : "purple"}>
            {message.visibility}
          </Badge>
        </div>
      </div>
      <p className="text-sm leading-6 text-[#c7ccd6]">{message.content}</p>
      <div className="mt-3 text-xs text-[#6f7787]">
        {new Date(message.created_at).toLocaleString("ru-RU")}
      </div>
    </Card>
  );
}
