"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LogOut,
  Settings2,
  ChartNoAxesCombined,
  CalendarClock,
  MessagesSquare,
  CreditCard,
  Bell,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import type { FunctionReturnType } from "convex/server";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePushSignOut } from "@/hooks/use-push-sign-out";
import {
  initials,
  resolveAccountAvatar,
  resolveAccountDisplayName,
} from "@/lib/dashboard-overview";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import s from "./clarity.module.css";
export type DashboardProfile = Partial<
  Pick<
    NonNullable<FunctionReturnType<typeof api.users.getMyProfile>>,
    | "orgId"
    | "industry"
    | "dashboardTheme"
    | "role"
    | "plan"
    | "bookingAccess"
    | "orgLogoUrl"
    | "orgName"
    | "staffAvatarUrl"
    | "staffDisplayName"
  >
> & {
  user?: { name?: string; email?: string; avatarUrl?: string } | null;
  orgLogoUrl?: string;
  orgName?: string;
  staffAvatarUrl?: string;
  staffDisplayName?: string;
};
export function DashboardAccountMenu({
  profile,
}: {
  profile: DashboardProfile;
}) {
  const { t, language, setLanguage } = useDashboardI18n();
  const hospitality = profile.industry === "hospitality";
  const signOutAccount = usePushSignOut();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [imageError, setImageError] = useState(false);

  const orgSettings = useQuery(
    api.orgSettings.getOrgSettings,
    !hospitality && profile.orgId && !profile.orgLogoUrl
      ? { orgId: profile.orgId }
      : "skip",
  );

  const effectiveProfile = {
    ...profile,
    orgLogoUrl: profile.orgLogoUrl || orgSettings?.org?.logoUrl,
  };

  const { src: avatarSrc } = resolveAccountAvatar(effectiveProfile);

  const [lastSrc, setLastSrc] = useState(avatarSrc);
  if (avatarSrc !== lastSrc) {
    setLastSrc(avatarSrc);
    setImageError(false);
  }

  const name =
    resolveAccountDisplayName(profile) ||
    t("Your account", "Вашата сметка", "Llogaria juaj");
  async function signOut() {
    setSigningOut(true);
    try {
      const result = await signOutAccount();
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
            {avatarSrc && !imageError ? (
              <Image
                key={avatarSrc}
                src={avatarSrc}
                alt=""
                width={39}
                height={39}
                unoptimized
                className={s.avatarImage}
                onError={() => setImageError(true)}
              />
            ) : (
              initials(name)
            )}
          </span>
          <span className={s.profileLabel}>
            <strong>{name}</strong>
            <span data-replay-public>
              {profile.role === "owner"
                ? hospitality
                  ? t("Venue owner", "Сопственик", "Pronar i lokalit")
                  : t("Studio owner", "Сопственик", "Pronar i studios")
                : profile.role === "manager"
                  ? hospitality
                    ? t("Venue manager", "Менаџер", "Menaxher i lokalit")
                    : t("Studio manager", "Менаџер", "Menaxher i studios")
                  : t("Team member", "Член на тимот", "Anëtar i ekipit")}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{name}</span>
            {!hospitality && (
              <Badge
                data-replay-public
                variant={profile.plan === "paid" ? "default" : "secondary"}
              >
                {profile.plan === "paid" ? "Pro" : "Free"}
              </Badge>
            )}
          </div>
          <div className="truncate text-xs font-normal text-muted-foreground">
            {profile.user?.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hospitality ? (
          <>
            <DropdownMenuGroup>
              {(profile.role === "owner" || profile.role === "manager") && (
                <DropdownMenuItem asChild>
                  <Link href="/hospitality/setup">
                    <Settings2 />
                    {t(
                      "Venue setup",
                      "Поставување на локалот",
                      "Konfigurimi i lokalit",
                    )}
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuLabel>
                {t("Language", "Јазик", "Gjuha")}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={language}
                onValueChange={(value) => {
                  if (value === "en" || value === "mk" || value === "sq")
                    setLanguage(value);
                }}
              >
                <DropdownMenuRadioItem value="en">
                  English
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="mk">
                  Македонски
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sq">Shqip</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <CookiePreferencesMenuItem />
            </DropdownMenuGroup>
          </>
        ) : (
          <DropdownMenuGroup>
            {profile.role === "owner" && (
              <DropdownMenuItem asChild>
                <Link data-replay-public href="/settings">
                  <Settings2 />
                  {t(
                    "Studio settings",
                    "Поставки за студио",
                    "Cilësimet e studios",
                  )}
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link data-replay-public href="/notifications/preferences">
                <Bell />
                {t("My preferences", "Мои поставки", "Preferencat e mia")}
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
                  "AI Receptionist inbox",
                  "Сандаче на AI рецепција",
                  "Kutia e AI recepsionit",
                )}
              </Link>
            </DropdownMenuItem>
            <CookiePreferencesMenuItem />
          </DropdownMenuGroup>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {!hospitality &&
            profile.role === "owner" &&
            profile.plan === "paid" && (
              <DropdownMenuItem asChild>
                <Link data-replay-public href="/settings?tab=billing">
                  <CreditCard />
                  {t("Subscription", "Претплата", "Abonimi")}
                </Link>
              </DropdownMenuItem>
            )}
          {!hospitality && profile.plan !== "paid" && <OpusProMenuItem />}
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
