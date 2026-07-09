import {
  BookOpen,
  Bot,
  Castle,
  LayoutDashboard,
  Map,
  MessageSquare,
  ScrollText,
  Sparkles,
  Users
} from "lucide-react";
import Link from "next/link";
import { AuthStatus } from "./AuthStatus";
import { Badge, Button } from "./ui";

const navItems = [
  { href: "/campaigns", label: "Кампании", icon: Castle },
  { href: "dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "characters", label: "Персонажи", icon: Users },
  { href: "npcs", label: "NPC", icon: Bot },
  { href: "locations", label: "Локации", icon: Map },
  { href: "chat", label: "Чат", icon: MessageSquare },
  { href: "session-log", label: "Журнал", icon: ScrollText }
];

function resolveHref(itemHref: string, campaignId?: string) {
  if (itemHref.startsWith("/")) {
    return itemHref;
  }

  if (!campaignId) {
    return "/campaigns";
  }

  if (itemHref === "dashboard") {
    return `/campaigns/${campaignId}`;
  }

  return `/campaigns/${campaignId}/${itemHref}`;
}

export function AppShell({
  campaignId,
  title,
  subtitle,
  variant = "default",
  children
}: {
  campaignId?: string;
  title: string;
  subtitle?: string;
  variant?: "default" | "play";
  children: React.ReactNode;
}) {
  const isPlay = variant === "play";

  return (
    <div
      className={`min-h-screen text-[#F5F2EA] ${
        isPlay ? "overflow-x-hidden px-2 py-2 md:px-3" : "px-4 py-4 md:px-6"
      }`}
    >
      <div
        className={`mx-auto grid gap-3 ${
          isPlay
            ? "max-w-none lg:grid-cols-[220px_minmax(0,1fr)]"
            : "max-w-[1500px] gap-5 lg:grid-cols-[260px_1fr]"
        }`}
      >
        <aside
          className={`glass rounded-3xl ${
            isPlay
              ? "p-3 lg:sticky lg:top-2 lg:h-[calc(100vh-1rem)]"
              : "p-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]"
          }`}
        >
          <Link className={`flex items-center gap-3 ${isPlay ? "mb-5" : "mb-8"}`} href="/campaigns">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/15 text-[#A78BFA] purple-glow">
              <Sparkles size={21} />
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">
                Lore<span className="text-[#8B5CF6]">Forge</span>
              </div>
              <div className="text-xs text-[#9CA3AF]">Campaign OS</div>
            </div>
          </Link>

          <nav className={isPlay ? "space-y-0.5" : "space-y-1"}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const href = resolveHref(item.href, campaignId);
              return (
                <Link
                  className={`flex items-center gap-3 rounded-2xl px-3 text-sm text-[#9CA3AF] transition hover:border-[#273244] hover:bg-[#171A26] hover:text-[#F5F2EA] ${
                    isPlay ? "py-2.5" : "py-3"
                  }`}
                  href={href}
                  key={item.label}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div
            className={`rounded-2xl border border-[#273244] bg-[#171A26]/70 ${
              isPlay ? "mt-5 p-3" : "mt-8 p-4"
            }`}
          >
            <Badge tone="gold">Mistbound</Badge>
            <p className={`mt-3 text-[#9CA3AF] ${isPlay ? "text-xs leading-5" : "text-sm"}`}>
              Управление лором, расследованиями и секретами мастера в одном
              интерфейсе.
            </p>
          </div>
        </aside>

        <main className="min-w-0">
          <header
            className={`glass flex flex-col justify-between rounded-3xl md:flex-row md:items-center ${
              isPlay ? "mb-2 gap-2 px-4 py-2.5" : "mb-5 gap-4 px-5 py-4"
            }`}
          >
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#A78BFA]">
                <BookOpen size={14} />
                LoreForge
              </div>
              <h1 className={`font-semibold tracking-tight ${isPlay ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"}`}>
                {title}
              </h1>
              {subtitle && !isPlay ? (
                <p className="mt-1 max-w-3xl text-sm text-[#9CA3AF]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <AuthStatus />
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
