"use client";

import Link from "next/link";
import { useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import {
  Bot,
  CalendarClock,
  BellRing,
  CreditCard,
  Store,
  SlidersHorizontal,
  ArrowUpRight,
  Paintbrush,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { resolveSettingsNavigation } from "@/lib/settings-navigation";
import { SettingsSectionPicker } from "./SettingsSectionPicker";
import { AiOperatorTab } from "./tabs/AiOperatorTab";
import { BookingOperationsTab } from "./tabs/BookingOperationsTab";
import { BillingTab } from "./tabs/BillingTab";
import { CurrencySettings } from "./tabs/CurrencySettings";
import { IdentityProfileTab } from "./tabs/IdentityProfileTab";
import { LocationTab } from "./tabs/LocationTab";
import { NotificationsQueueTab } from "./tabs/NotificationsQueueTab";

const SETTINGS_TABS = [
  {
    value: "studio",
    labelEn: "Studio",
    labelMk: "Студио",
    labelSq: "Studio",
    icon: Store,
  },
  {
    value: "booking",
    labelEn: "Booking",
    labelMk: "Закажување",
    labelSq: "Rezervimi",
    icon: CalendarClock,
  },
  {
    value: "notifications",
    labelEn: "Notifications",
    labelMk: "Известувања",
    labelSq: "Njoftimet",
    icon: BellRing,
  },
  {
    value: "ai",
    labelEn: "AI front desk",
    labelMk: "AI рецепција",
    labelSq: "Recepsioni AI",
    icon: Bot,
  },
  {
    value: "billing",
    labelEn: "Subscription",
    labelMk: "Претплата",
    labelSq: "Abonimi",
    icon: CreditCard,
  },
] as const;

const DEFAULT_AI_HOURS = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  startTime: dayOfWeek === 0 || dayOfWeek === 6 ? "10:00" : "09:00",
  endTime: dayOfWeek === 0 || dayOfWeek === 6 ? "16:00" : "18:00",
}));

export function SettingsWorkspace() {
  const { t } = useDashboardI18n();
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;
  const isOwner = profile?.role === "owner";
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const navigation = resolveSettingsNavigation(tabFromUrl, isOwner);
  const data = useQuery(
    api.orgSettings.getOrgSettings,
    orgId && isOwner ? { orgId } : "skip",
  );

  useEffect(() => {
    if (profile && navigation.redirect) router.replace(navigation.redirect);
  }, [profile, navigation.redirect, router]);

  const handleTabChange = useCallback((value: string) => {
    if (!SETTINGS_TABS.some((tab) => tab.value === value)) return;
    window.history.replaceState(
      null,
      "",
      value === "studio" ? "/settings" : `/settings?tab=${value}`,
    );
  }, []);

  if (profile === undefined || navigation.redirect || data === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (!orgId || !data?.settings) {
    return (
      <p className="text-sm text-muted-foreground">
        {t(
          "Settings could not be loaded. Please try again.",
          "Поставките не може да се вчитаат. Обидете се повторно.",
          "Cilësimet nuk mund të ngarkoheshin. Provoni përsëri.",
        )}
      </p>
    );
  }
  const { settings, org, media } = data;
  const aiHours = DEFAULT_AI_HOURS.map(
    (fallback) =>
      settings.aiWorkingHours?.find(
        (entry) => entry.dayOfWeek === fallback.dayOfWeek,
      ) ?? fallback,
  );
  const emailRecipientIds = new Set(
    data.emailRecipients.map((recipient) => recipient.userId),
  );
  return (
    <div className="flex min-h-full w-full flex-col gap-6 pb-12">
      <DashboardPageHeader
        replayPublicTitle
        title={t("Settings", "Поставки", "Cilësimet")}
        description={t(
          "Manage your studio, online booking, and client messages.",
          "Уредете го студиото, онлајн закажувањето и пораките за клиенти.",
          "Menaxhoni studion, rezervimet online dhe mesazhet për klientët.",
        )}
      />
      <Tabs
        key={orgId}
        orientation="vertical"
        value={navigation.section}
        onValueChange={handleTabChange}
        className="dashboard-settings-tabs w-full"
      >
        <div className="dashboard-settings-nav">
          <SettingsSectionPicker
            sections={SETTINGS_TABS}
            value={navigation.section}
            onValueChange={handleTabChange}
          />
          <div className="hidden md:block">
            <TabsList
              aria-label={t(
                "Settings sections",
                "Секции за поставки",
                "Seksionet e cilësimeve",
              )}
              className="w-full border-0 bg-transparent"
            >
              {SETTINGS_TABS.map(
                ({ value, labelEn, labelMk, labelSq, icon: Icon }) => (
                  <TabsTrigger data-replay-public key={value} value={value}>
                    <Icon />
                    {t(labelEn, labelMk, labelSq)}
                  </TabsTrigger>
                ),
              )}
            </TabsList>
          </div>
          <div className="mt-3 flex flex-wrap gap-1 border-t border-border pt-3 md:flex-col">
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/website">
                <Paintbrush data-icon="inline-start" />
                {t("OPUS Sites", "OPUS Sites", "OPUS Sites")}
              </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/notifications/preferences">
                <SlidersHorizontal data-icon="inline-start" />
                {t("My preferences", "Мои поставки", "Preferencat e mia")}
              </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/gap-optimizer">
                <ArrowUpRight data-icon="inline-start" />
                {t(
                  "Opening recovery",
                  "Пополнување термини",
                  "Rikuperimi i orareve",
                )}
              </Link>
            </Button>
          </div>
        </div>
        <div className="min-w-0">
          <TabsContent value="studio" className="m-0 flex flex-col gap-5">
            <IdentityProfileTab
              orgId={orgId}
              initialData={{
                name: org.name,
                logoUrl: org.logoUrl || "",
                tagline: org.tagline || "",
                bio: org.bio || "",
                phone: org.phone || "",
                instagramHandle: org.instagramHandle || "",
              }}
              media={media ?? []}
              galleryPhotoLimit={data.galleryPhotoLimit}
              showPhotos={tabFromUrl === "branding"}
            />
            <LocationTab
              orgId={orgId}
              initialData={{
                address: org.address || "",
                city: org.city || "",
                neighborhood: org.neighborhood || "",
                postalCode: org.postalCode || "",
                country: org.country || "MK",
                coordinates: org.coordinates ?? null,
              }}
            />
            <CurrencySettings orgId={orgId} currency={settings.currency} />
          </TabsContent>
          <BookingOperationsTab
            orgId={orgId}
            initialData={{
              slotDurationMins: settings.slotDurationMins,
              quickBookingDurationMins:
                settings.quickBookingDurationMins ??
                Math.max(
                  settings.slotDurationMins,
                  Math.ceil(30 / settings.slotDurationMins) *
                    settings.slotDurationMins,
                ),
              bookingWindowDays: settings.bookingWindowDays,
              cancellationWindowHours: settings.cancellationWindowHours,
              bufferTimeMins: settings.bufferTimeMins,
            }}
          />
          <NotificationsQueueTab
            orgId={orgId}
            isPaid={org.plan === "paid"}
            smsAvailable={data.smsAvailable}
            initialData={{
              smsEnabled: settings.smsEnabled,
              smsReminderHoursBefore: settings.smsReminderHoursBefore ?? [24],
              emailEnabled: settings.emailEnabled,
              reminderHoursBefore: settings.reminderHoursBefore,
              staffNewBookingEmailEnabled:
                settings.staffNewBookingEmailEnabled ?? true,
              staffReminderEmailEnabled:
                settings.staffReminderEmailEnabled ?? true,
              staffReminderHoursBefore:
                settings.staffReminderHoursBefore ??
                settings.reminderHoursBefore,
              staffEmailRecipientUserIds: (
                settings.staffEmailRecipientUserIds ??
                data.emailRecipients.map((recipient) => recipient.userId)
              ).filter((id) => emailRecipientIds.has(id)),
              emailRecipients: data.emailRecipients,
              dashboardNotificationsEnabled:
                settings.dashboardNotificationsEnabled ?? true,
              dashboardSoundEnabled: settings.dashboardSoundEnabled ?? true,
              dashboardToastEnabled: settings.dashboardToastEnabled ?? true,
            }}
          />
          <AiOperatorTab
            orgId={orgId}
            isPaid={org.plan === "paid"}
            studioPhone={org.phone || ""}
            initialData={{
              aiEnabled: settings.aiEnabled,
              aiPersonaName: settings.aiPersonaName,
              aiConfidenceThreshold: settings.aiConfidenceThreshold,
              aiHandoffPhoneNumber: settings.aiHandoffPhoneNumber || "",
              aiInstagramEnabled: settings.aiInstagramEnabled ?? false,
              aiSystemPrompt: settings.aiSystemPrompt ?? "",
              aiStudioContext: settings.aiStudioContext ?? "",
              aiGreetingMessage: settings.aiGreetingMessage ?? "",
              aiTone: settings.aiTone ?? "friendly",
              aiLanguage: settings.aiLanguage ?? "auto",
              aiWorkingHoursEnabled: settings.aiWorkingHoursEnabled ?? false,
              aiWorkingHours: aiHours,
              aiWorkingHoursEnabled_days: DEFAULT_AI_HOURS.map(
                ({ dayOfWeek }) =>
                  settings.aiWorkingHours
                    ? settings.aiWorkingHours.some(
                        (entry) => entry.dayOfWeek === dayOfWeek,
                      )
                    : dayOfWeek >= 1 && dayOfWeek <= 5,
              ),
              aiAwayMessage: settings.aiAwayMessage ?? "",
            }}
          />
          {navigation.section === "billing" && <BillingTab />}
        </div>
      </Tabs>
    </div>
  );
}
