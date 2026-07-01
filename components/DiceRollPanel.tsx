import { Dices } from "lucide-react";
import type { DiceRoll } from "@/lib/types";
import { Badge, Card } from "./ui";

export function DiceRollPanel({ roll }: { roll: DiceRoll }) {
  return (
    <Card subtle className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D6A84F]/35 bg-[#D6A84F]/12 text-[#D6A84F]">
            <Dices size={18} />
          </span>
          <div>
            <div className="font-semibold">{roll.expression}</div>
            <div className="text-xs text-[#9CA3AF]">
              {roll.description ?? roll.visibility}
            </div>
          </div>
        </div>
        <Badge tone="gold">{roll.result_total ?? "?"}</Badge>
      </div>
    </Card>
  );
}
