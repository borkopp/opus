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
import type { DashboardLanguage } from "@/lib/i18n/types";
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
  const name =
    profile.user?.name || t("Your account", "Вашата сметка", "Llogaria juaj");
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
          "Dalja dështoi. Ju lutemi provoni përsëri.",
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
          aria-label={t(
            "Open account menu",
            "Отвори мени за сметката",
            "Hap menynë e llogarisë",
          )}
        >
          <span className={s.avatar} data-tone="peach">
            {initials(name)}
          </span>
          <span className={s.profileLabel}>
            <strong>{name}</strong>
            <span data-replay-public>
              {profile.role === "owner"
                ? t("Studio owner", "Сопственик", "Pronar i studios")
                : profile.role === "manager"
                  ? t("Studio manager", "Менаџер", "Menaxher i studios")
                  : t("Team member", "Член на тимот", "Anëtar i ekipit")}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{name}</span>
            <Badge
              data-replay-public
              variant={profile.plan === "paid" ? "default" : "secondary"}
            >
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
            <Link data-replay-public href="/settings">
              <Settings2 />
              {t("Settings", "Поставки", "Cilësimet")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link data-replay-public href="/settings?tab=themes">
              <SwatchBook />
              {t(
                "Dashboard theme",
                "Тема на контролната табла",
                "Tema e panelit",
              )}
            </Link>
          </DropdownMenuItem>
          {profile.role !== "staff" && (
            <DropdownMenuItem asChild>
              <Link data-replay-public href="/beauty/assistant">
                <ChartNoAxesCombined />
                {t(
                  "Business assistant",
                  "Деловен асистент",
                  "Asistenti i biznesit",
                )}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link data-replay-public href="/gap-optimizer">
              <CalendarClock />
              {t(
                "Opening recovery",
                "Пополнување слободни термини",
                "Rikuperimi i hapësirave",
              )}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link data-replay-public href="/ai-inbox">
              <MessagesSquare />
              {t(
                "AI frontdesk inbox",
                "Сандаче на AI рецепција",
                "Kutia e AI recepsionit",
              )}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger data-replay-public>
              <Languages />
              {t("Language", "Јазик", "Gjuha")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={language}
                onValueChange={(value) =>
                  setLanguage(value as DashboardLanguage)
                }
              >
                <DropdownMenuRadioItem data-replay-public value="en">
                  English
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem data-replay-public value="sq">
                  Shqip
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem data-replay-public value="mk">
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
              <Link data-replay-public href="/settings?tab=billing">
                <CreditCard />
                {t("Subscription", "Претплата", "Abonimi")}
              </Link>
            </DropdownMenuItem>
          )}
          {profile.plan !== "paid" && <OpusProMenuItem />}
          <DropdownMenuItem
            data-replay-public
            onSelect={signOut}
            disabled={signingOut}
          >
            <LogOut />
            {t("Sign out", "Одјави се", "Dilni")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
