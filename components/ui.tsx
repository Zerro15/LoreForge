import { clsx } from "clsx";
import { Lock, LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type CardProps = ComponentProps<"section"> & {
  subtle?: boolean;
};

export function Card({ className, subtle, ...props }: CardProps) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-[#273244]/80 shadow-[0_18px_60px_rgba(0,0,0,0.28)]",
        subtle
          ? "bg-[#171A26]/70"
          : "bg-[#111827]/82 backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}

type ButtonProps = ComponentProps<"button"> & {
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  className,
  href,
  variant = "primary",
  children,
  ...props
}: ButtonProps) {
  const classes = clsx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
    variant === "primary" &&
      "bg-gradient-to-r from-[#8B5CF6] to-[#5B21B6] text-white shadow-[0_18px_42px_rgba(139,92,246,0.28)] hover:brightness-110",
    variant === "secondary" &&
      "border border-[#273244] bg-[#171A26]/90 text-[#F5F2EA] hover:border-[#8B5CF6]/70 hover:bg-[#1d2131]",
    variant === "ghost" &&
      "text-[#9CA3AF] hover:bg-[#171A26] hover:text-[#F5F2EA]",
    variant === "danger" &&
      "border border-[#B84A4A]/45 bg-[#B84A4A]/12 text-[#f4b4b4] hover:bg-[#B84A4A]/20",
    className
  );

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export function Input(props: ComponentProps<"input">) {
  return (
    <input
      className={clsx(
        "h-12 w-full rounded-xl border border-[#273244] bg-[#0B0F17]/55 px-4 text-sm text-[#F5F2EA] outline-none transition placeholder:text-[#6b7280]",
        "focus:border-[#8B5CF6] focus:ring-4 focus:ring-[#8B5CF6]/15",
        props.className
      )}
      {...props}
    />
  );
}

type BadgeProps = {
  children: ReactNode;
  tone?: "purple" | "gold" | "green" | "blue" | "orange" | "danger" | "muted";
  className?: string;
};

export function Badge({ children, tone = "purple", className }: BadgeProps) {
  const tones = {
    purple: "border-[#8B5CF6]/40 bg-[#8B5CF6]/13 text-[#C4B5FD]",
    gold: "border-[#D6A84F]/35 bg-[#D6A84F]/12 text-[#e8c777]",
    green: "border-[#4FAF7A]/35 bg-[#4FAF7A]/12 text-[#8de0b1]",
    blue: "border-[#4F8CFF]/35 bg-[#4F8CFF]/12 text-[#9bbcff]",
    orange: "border-[#D9823B]/35 bg-[#D9823B]/12 text-[#f1ad78]",
    danger: "border-[#B84A4A]/35 bg-[#B84A4A]/12 text-[#e89a9a]",
    muted: "border-[#273244] bg-[#171A26] text-[#9CA3AF]"
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#273244] bg-[#171A26] text-[#A78BFA]">
        <Icon size={18} />
      </div>
      <div className="text-2xl font-semibold text-[#F5F2EA]">{value}</div>
      <div className="mt-1 text-sm text-[#9CA3AF]">{label}</div>
      {hint ? <div className="mt-3 text-xs text-[#6f7787]">{hint}</div> : null}
    </Card>
  );
}

export function PluginBadge({ name }: { name?: string | null }) {
  return <Badge tone="purple">{name ?? "Core rules"}</Badge>;
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#0B0F17]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#D6A84F]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function SecretBlock({
  title = "Секрет ГМа",
  children
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#8B5CF6]/45 bg-[#8B5CF6]/8 p-4 text-sm text-[#c8c0d8]">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A78BFA]">
        <Lock size={14} />
        {title}
      </div>
      {children}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto mb-4 h-2 w-16 rounded-full bg-[#8B5CF6]" />
      <h2 className="text-xl font-semibold">Данные пока недоступны</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[#9CA3AF]">{message}</p>
      <p className="mt-4 text-xs text-[#6f7787]">
        Проверьте, что backend запущен на NEXT_PUBLIC_API_URL.
      </p>
    </Card>
  );
}

export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="p-8 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[#9CA3AF]">
        {description}
      </p>
    </Card>
  );
}
