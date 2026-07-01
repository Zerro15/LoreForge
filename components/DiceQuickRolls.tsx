"use client";

import { Dices, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { rollDice } from "@/lib/api";
import { DEMO_DICE_USER_ID } from "@/lib/config";
import { Button, Card } from "./ui";

const quickRolls = ["1d20", "1d100", "2d6"];

export function DiceQuickRolls({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingFormula, setPendingFormula] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function roll(formula: string) {
    setError(null);
    setPendingFormula(formula);

    try {
      const result = await rollDice(campaignId, {
        userId: DEMO_DICE_USER_ID,
        formula,
        visibility: "public"
      });

      if (result.error) {
        throw new Error(result.error);
      }

      startTransition(() => router.refresh());
    } catch (rollError) {
      setError(
        rollError instanceof Error
          ? rollError.message
          : "Не удалось выполнить бросок"
      );
    } finally {
      setPendingFormula(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D6A84F]/35 bg-[#D6A84F]/12 text-[#D6A84F]">
          <Dices size={18} />
        </span>
        <div>
          <h2 className="font-semibold">Быстрый бросок</h2>
          <p className="text-xs text-[#9CA3AF]">Бросок попадёт в чат.</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {quickRolls.map((formula) => (
          <Button
            className="min-h-10 px-3"
            disabled={Boolean(pendingFormula) || isPending}
            key={formula}
            onClick={() => roll(formula)}
            type="button"
            variant={formula === "1d20" ? "primary" : "secondary"}
          >
            {pendingFormula === formula ? <Loader2 size={15} /> : formula}
          </Button>
        ))}
      </div>
      {error ? <p className="mt-3 text-xs text-[#e89a9a]">{error}</p> : null}
    </Card>
  );
}
