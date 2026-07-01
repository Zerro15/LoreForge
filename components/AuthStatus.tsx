"use client";

import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, logout } from "@/lib/api";
import type { CurrentUser } from "@/lib/types";
import { Button } from "./ui";

export function AuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser().then((result) => {
      if (!isMounted) {
        return;
      }

      setUser(result.data);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="h-11 w-28 rounded-xl border border-[#273244] bg-[#171A26]/70" />
    );
  }

  if (!user) {
    return (
      <Button href="/login" variant="secondary">
        Войти
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex min-h-11 items-center gap-2 rounded-xl border border-[#273244] bg-[#171A26]/80 px-3 text-sm text-[#F5F2EA]">
        <UserRound size={16} className="text-[#A78BFA]" />
        {user.display_name}
      </div>
      <Button onClick={handleLogout} type="button" variant="secondary">
        <LogOut size={16} />
        Выйти
      </Button>
    </div>
  );
}
