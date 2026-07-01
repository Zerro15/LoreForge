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
import { Badge, Button } from "./ui";

const navItems = [
  { href: "/campaigns", label: "Кампании", icon: Castle },
  { href: "dashboard", label: "Dashboard", icon: LayoutDashboard },
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
  children
}: {
  campaignId?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen px-4 py-4 text-[#F5F2EA] md:px-6">
      <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="glass rounded-3xl p-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <Link className="mb-8 flex items-center gap-3" href="/campaigns">
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

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const href = resolveHref(item.href, campaignId);
              return (
                <Link
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[#9CA3AF] transition hover:bg-[#171A26] hover:text-[#F5F2EA]"
                  href={href}
                  key={item.label}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-[#273244] bg-[#171A26]/70 p-4">
            <Badge tone="gold">Mistbound</Badge>
            <p className="mt-3 text-sm text-[#9CA3AF]">
              Управление лором, расследованиями и секретами мастера в одном
              интерфейсе.
            </p>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="glass mb-4 flex flex-col justify-between gap-4 rounded-3xl px-5 py-4 md:flex-row md:items-center">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#A78BFA]">
                <BookOpen size={14} />
                LoreForge
              </div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1 max-w-3xl text-sm text-[#9CA3AF]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <Button href="/login" variant="secondary">
              Выйти
            </Button>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
