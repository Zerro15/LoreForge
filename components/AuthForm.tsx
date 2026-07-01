"use client";

import { ArrowRight, Eye, Lock, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login, register } from "@/lib/api";
import { Button, Input } from "./ui";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(mode === "login" ? "bogdan@example.com" : "");
  const [password, setPassword] = useState(mode === "login" ? "password123" : "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = isRegister
      ? await register({ displayName, email, password })
      : await login({ email, password });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/campaigns");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {isRegister ? (
        <label className="block">
          <span className="mb-2 block text-sm text-[#cbd1dc]">Имя</span>
          <span className="relative block">
            <UserRound
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6f7787]"
              size={18}
            />
            <Input
              className="pl-12"
              minLength={2}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ваше имя"
              required
              value={displayName}
            />
          </span>
        </label>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm text-[#cbd1dc]">Email</span>
        <span className="relative block">
          <Mail
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6f7787]"
            size={18}
          />
          <Input
            className="pl-12"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-[#cbd1dc]">Пароль</span>
        <span className="relative block">
          <Lock
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6f7787]"
            size={18}
          />
          <Input
            className="px-12"
            minLength={isRegister ? 8 : undefined}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Введите пароль"
            required
            type="password"
            value={password}
          />
          <Eye
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6f7787]"
            size={18}
          />
        </span>
      </label>

      {!isRegister ? (
        <label className="flex items-center gap-3 text-sm text-[#9CA3AF]">
          <input
            className="h-4 w-4 rounded border-[#8B5CF6] accent-[#8B5CF6]"
            type="checkbox"
          />
          Запомнить меня
        </label>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-[#B84A4A]/40 bg-[#B84A4A]/12 p-3 text-sm text-[#e89a9a]">
          {error}
        </div>
      ) : null}

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting
          ? "Подождите..."
          : isRegister
            ? "Создать аккаунт"
            : "Войти"}
        <ArrowRight size={18} />
      </Button>

      <div className="flex flex-wrap justify-between gap-3 text-sm text-[#9CA3AF]">
        {isRegister ? (
          <span>
            Уже есть аккаунт?{" "}
            <Link className="font-medium text-[#A78BFA]" href="/login">
              Войти
            </Link>
          </span>
        ) : (
          <span>
            Нет аккаунта?{" "}
            <Link className="font-medium text-[#A78BFA]" href="/register">
              Создать аккаунт
            </Link>
          </span>
        )}
        {!isRegister ? (
          <span className="font-medium text-[#A78BFA]">Забыли пароль?</span>
        ) : null}
      </div>
    </form>
  );
}
