import { Puzzle, Shield, Sparkles, UsersRound, UserRound } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { Card } from "@/components/ui";

const benefits = [
  {
    icon: UsersRound,
    title: "Кампании и комнаты",
    text: "Создавайте миры и приглашайте игроков."
  },
  {
    icon: UserRound,
    title: "Персонажи, NPC и локации",
    text: "Ведите героев, ключевых персонажей и места."
  },
  {
    icon: Puzzle,
    title: "Плагины миров и правила",
    text: "Подключайте системы или создавайте свои."
  }
];

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="px-1 py-6 md:px-8">
          <div className="mb-8 flex items-center gap-5">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#8B5CF6]/45 bg-[#8B5CF6]/12 text-[#F5F2EA] purple-glow">
              <Sparkles size={34} className="text-[#D6A84F]" />
              <div className="absolute inset-3 rounded-full border border-[#8B5CF6]/35" />
            </div>
            <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
              Lore<span className="text-[#8B5CF6]">Forge</span>
            </h1>
          </div>

          <p className="max-w-xl text-xl leading-8 text-[#b7bdc9]">
            Создайте аккаунт, чтобы вести кампании, подключать миры и хранить
            структуру игры в одном месте.
          </p>

          <div className="mt-10 space-y-5">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div className="flex gap-4" key={benefit.title}>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#273244] bg-[#111827]/70 text-[#8B5CF6]">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h2 className="font-semibold">{benefit.title}</h2>
                    <p className="mt-1 text-sm text-[#9CA3AF]">
                      {benefit.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex items-center gap-3 text-sm font-medium text-[#D6A84F]">
            <Shield size={18} />
            Ваши истории. Ваши правила. Ваш мир.
            <span className="h-px w-20 bg-[#D6A84F]/25" />
          </div>
        </section>

        <Card className="glass rounded-[28px] p-8 md:p-10">
          <div className="mb-8 text-center">
            <Sparkles className="mx-auto mb-5 text-[#8B5CF6]" size={34} />
            <h2 className="text-3xl font-semibold">Создать аккаунт</h2>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              Начните вести кампанию в LoreForge
            </p>
          </div>

          <AuthForm mode="register" />
        </Card>
      </div>
    </main>
  );
}
