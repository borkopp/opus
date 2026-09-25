"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LogOut,
  Settings2,
  Languages,
  ChartNoAxesCombined,
  CalendarClock,
  MessagesSquare,
  SwatchBook,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/dashboard-overview";
import { CookiePreferencesMenuItem } from "@/components/account/CookiePreferencesMenuItem";
import { OpusProMenuItem } from "@/components/account/OpusProMenuItem";
import { Badge } from "@/components/ui/badge";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import s from "./clarity.module.css";
export type DashboardProfile = Pick<
  NonNullable<FunctionReturnType<typeof api.users.getMyProfile>>,
  "orgId" | "role" | "plan"
> & {
  user?: { name?: string; email?: string; avatarUrl?: string } | null;
};
export function DashboardAccountMenu({
  profile,
}: {
  profile: DashboardProfile;
}) {
  const { t, language, setLanguage } = useDashboardI18n();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const name = profile.user?.name || t("Your account", "Вашата сметка");
  async function signOut() {
    setSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      router.replace("/login");
    } catch {
      toast.error(
        t(
          "Could not sign out. Please try again.",
          "Одјавувањето не успеа. Обидете се повторно.",
        ),
      );
    } finally {
      setSigningOut(false);
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="dashboard-account-trigger"
          aria-label={t("Open account menu", "Отвори мени за сметката")}
        >
          <span className={s.avatar} data-tone="peach">
            {initials(name)}
          </span>
          <span className={s.profileLabel}>
            <strong>{name}</strong>
            <span>
              {profile.role === "owner"
                ? t("Studio owner", "Сопственик")
                : profile.role === "manager"
                  ? t("Studio manager", "Менаџер")
                  : t("Team member", "Член на тимот")}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{name}</span>
            <Badge variant={profile.plan === "paid" ? "default" : "secondary"}>
              {profile.plan === "paid" ? "Pro" : "Free"}
            </Badge>
          </div>
          <div className="truncate text-xs font-normal text-muted-foreground">
            {profile.user?.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings2 />
              {t("Settings", "Поставки")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings?tab=themes">
              <SwatchBook />
              {t("Dashboard theme", "Тема на контролната табла")}
            </Link>
          </DropdownMenuItem>
          {profile.role !== "staff" && (
            <DropdownMenuItem asChild>
              <Link href="/beauty/assistant">
                <ChartNoAxesCombined />
                {t("Business assistant", "Деловен асистент")}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/gap-optimizer">
              <CalendarClock />
              {t("Opening recovery", "Пополнување слободни термини")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/ai-inbox">
              <MessagesSquare />
              {t("AI frontdesk inbox", "Сандаче на AI рецепција")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Languages />
              {t("Language", "Јазик")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={language}
                onValueChange={(value) => setLanguage(value as "en" | "mk")}
              >
                <DropdownMenuRadioItem value="en">
                  English
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="mk">
                  Македонски
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <CookiePreferencesMenuItem />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {profile.role === "owner" && profile.plan === "paid" && (
            <DropdownMenuItem asChild>
              <Link href="/settings?tab=billing">
                <CreditCard />
                {t("Subscription", "Претплата")}
              </Link>
            </DropdownMenuItem>
          )}
          {profile.plan !== "paid" && <OpusProMenuItem />}
          <DropdownMenuItem onSelect={signOut} disabled={signingOut}>
            <LogOut />
            {t("Sign out", "Одјави се")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
