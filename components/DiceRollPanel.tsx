import { Dices } from "lucide-react";
import type { DiceRoll } from "@/lib/types";
import { Badge, Card } from "./ui";

export function DiceRollPanel({ roll }: { roll: DiceRoll }) {
  return (
    <Card
      subtle
      className="border-[#D6A84F]/35 bg-[#D6A84F]/10 p-4 shadow-[0_18px_50px_rgba(214,168,79,0.10)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D6A84F]/45 bg-[#D6A84F]/15 text-[#D6A84F]">
            <Dices size={21} />
          </span>
          <div>
            <div className="text-lg font-semibold">{roll.expression}</div>
            <div className="line-clamp-1 text-xs text-[#9CA3AF]">
              {roll.description ?? roll.visibility}
            </div>
          </div>
        </div>
        <Badge className="px-3 py-1.5 text-base" tone="gold">
          {roll.result_total ?? "?"}
        </Badge>
      </div>
    </Card>
  );
}
