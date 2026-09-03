"use client";

import { useCallback } from "react";
import { useQuery } from "convex/react";
import {
  BellRing,
  Bot,
  CalendarClock,
  Flame,
  MapPin,
  Palette,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

import { AiOperatorTab } from "./_components/tabs/AiOperatorTab";
import { BookingOperationsTab } from "./_components/tabs/BookingOperationsTab";
import { DynamicSurgePricingTab } from "./_components/tabs/DynamicSurgePricingTab";
import { GapOptimizerTab } from "./_components/tabs/GapOptimizerTab";
import { GeneralTab } from "./_components/tabs/GeneralTab";
import { IdentityProfileTab } from "./_components/tabs/IdentityProfileTab";
import { LocationTab } from "./_components/tabs/LocationTab";
import { NotificationsQueueTab } from "./_components/tabs/NotificationsQueueTab";

const SETTINGS_TABS = [
  { value: "general", labelEn: "General", labelMk: "Општо", icon: Settings2 },
  {
    value: "branding",
    labelEn: "Branding",
    labelMk: "Брендирање",
    icon: Palette,
  },
  {
    value: "location",
    labelEn: "Location",
    labelMk: "Локација",
    icon: MapPin,
  },
  {
    value: "booking",
    labelEn: "Booking rules",
    labelMk: "Закажување",
    icon: CalendarClock,
  },
  {
    value: "notifications",
    labelEn: "Notifications",
    labelMk: "Известувања",
    icon: BellRing,
  },
  {
    value: "gaps",
    labelEn: "Gap optimizer",
    labelMk: "Празни термини",
    icon: Sparkles,
  },
  {
    value: "surge",
    labelEn: "Surge pricing",
    labelMk: "Динамични цени",
    icon: Flame,
  },
  { value: "ai", labelEn: "AI front desk", labelMk: "AI рецепција", icon: Bot },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["value"];

const DEFAULT_AI_WORKING_HOURS = [
  { dayOfWeek: 0, startTime: "10:00", endTime: "16:00" },
  { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 6, startTime: "10:00", endTime: "16:00" },
];

function isSettingsTab(value: string | null): value is SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.value === value);
}

export default function SettingsPage() {
  const { t } = useDashboardI18n();
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabFromUrl = searchParams.get("tab");
  const activeTab = isSettingsTab(tabFromUrl) ? tabFromUrl : "general";

  const handleTabChange = useCallback(
    (value: string) => {
      if (!isSettingsTab(value)) return;
      const url = value === "general" ? "/settings" : `/settings?tab=${value}`;
      router.replace(url, { scroll: false });
    },
    [router],
  );

  const data = useQuery(
    api.orgSettings.getOrgSettings,
    orgId ? { orgId } : "skip",
  );

  if (profile === undefined || data === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!orgId || !data?.settings) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">
          {t(
            "Unable to load settings. Please make sure onboarding is complete.",
            "Поставките не може да се вчитаат. Проверете дали воведот е завршен.",
          )}
        </p>
      </div>
    );
  }

  const { settings, org, media } = data;
  const quickBookingDurationMins =
    settings.quickBookingDurationMins ??
    Math.max(
      settings.slotDurationMins,
      Math.ceil(30 / settings.slotDurationMins) * settings.slotDurationMins,
    );
  const configuredAiHours = settings.aiWorkingHours;
  const aiWorkingHours = DEFAULT_AI_WORKING_HOURS.map(
    (fallback) =>
      configuredAiHours?.find(
        (entry) => entry.dayOfWeek === fallback.dayOfWeek,
      ) ?? fallback,
  );
  const aiWorkingHoursEnabledDays = DEFAULT_AI_WORKING_HOURS.map(
    ({ dayOfWeek }) =>
      configuredAiHours
        ? configuredAiHours.some((entry) => entry.dayOfWeek === dayOfWeek)
        : dayOfWeek >= 1 && dayOfWeek <= 5,
  );
  const availableEmailRecipientIds = new Set(
    data.emailRecipients.map((recipient) => recipient.userId),
  );
  const selectedEmailRecipientUserIds = (
    settings.staffEmailRecipientUserIds ??
    data.emailRecipients.map((recipient) => recipient.userId)
  ).filter((userId) => availableEmailRecipientIds.has(userId));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto flex min-h-full w-full max-w-6xl flex-1 flex-col gap-7 pb-12"
    >
      <header className="flex flex-col gap-2">
        <div>
          <p className="micro-label text-muted-foreground">
            {t("Workspace", "Работен простор")}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t("Settings", "Поставки")}
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {t(
            `Keep ${org.name}'s studio details, booking rules, and team preferences in one place.`,
            `Чувајте ги податоците за студиото, правилата за закажување и тимските преференци за ${org.name} на едно место.`,
          )}
        </p>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full gap-6"
      >
        <div className="sticky top-0 z-20 -mx-1 bg-background/95 px-1 py-2 backdrop-blur-sm">
          <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList
              aria-label={t("Settings sections", "Секции за поставки")}
              className="h-auto w-max min-w-full justify-start gap-1 rounded-xl bg-muted/70 p-1"
            >
              {SETTINGS_TABS.map(({ value, labelEn, labelMk, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-9 min-w-max flex-1 gap-2 rounded-lg px-3 text-muted-foreground data-[state=active]:border-input data-[state=active]:bg-input/30 data-[state=active]:font-semibold data-[state=active]:text-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none"
                >
                  <Icon />
                  {t(labelEn, labelMk)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="min-w-0">
          <GeneralTab
            key={`general-${settings.updatedAt}`}
            orgId={orgId}
            initialData={{
              timezone: settings.timezone,
              currency: settings.currency,
              locale: settings.locale,
              slotDurationMins: settings.slotDurationMins,
              quickBookingDurationMins,
              bookingWindowDays: settings.bookingWindowDays,
              cancellationWindowHours: settings.cancellationWindowHours,
              bufferTimeMins: settings.bufferTimeMins,
            }}
          />
          <IdentityProfileTab
            key={`branding-${org.updatedAt}`}
            orgId={orgId}
            initialData={{
              name: org.name,
              logoUrl: org.logoUrl || "",
              tagline: org.tagline || "",
              bio: org.bio || "",
              phone: org.phone || "",
              instagramHandle: org.instagramHandle || "",
              instagramPageId: org.instagramPageId || "",
              websiteUrl: org.websiteUrl || "",
            }}
            media={media ?? []}
          />
          <LocationTab
            key={`location-${org.updatedAt}`}
            orgId={orgId}
            initialData={{
              address: org.address || "",
              city: org.city || "",
              neighborhood: org.neighborhood || "",
              postalCode: org.postalCode || "",
              country: org.country || "",
              coordinates: org.coordinates ?? null,
            }}
          />
          <BookingOperationsTab
            key={`booking-${settings.updatedAt}`}
            orgId={orgId}
            initialData={{
              timezone: settings.timezone,
              currency: settings.currency,
              locale: settings.locale,
              slotDurationMins: settings.slotDurationMins,
              quickBookingDurationMins,
              bookingWindowDays: settings.bookingWindowDays,
              cancellationWindowHours: settings.cancellationWindowHours,
              bufferTimeMins: settings.bufferTimeMins,
            }}
          />
          <NotificationsQueueTab
            key={`notifications-${settings.updatedAt}`}
            orgId={orgId}
            initialData={{
              emailEnabled: settings.emailEnabled,
              reminderHoursBefore: settings.reminderHoursBefore,
              staffNewBookingEmailEnabled:
                settings.staffNewBookingEmailEnabled ?? true,
              staffReminderEmailEnabled:
                settings.staffReminderEmailEnabled ?? true,
              staffReminderHoursBefore:
                settings.staffReminderHoursBefore ??
                settings.reminderHoursBefore,
              staffEmailRecipientUserIds: selectedEmailRecipientUserIds,
              emailRecipients: data.emailRecipients,
              dashboardNotificationsEnabled:
                settings.dashboardNotificationsEnabled ?? true,
              dashboardSoundEnabled: settings.dashboardSoundEnabled ?? true,
              dashboardToastEnabled: settings.dashboardToastEnabled ?? true,
            }}
          />
          <GapOptimizerTab
            key={`gaps-${settings.updatedAt}`}
            orgId={orgId}
            isPaid={org.plan === "paid"}
            initialData={{
              gapOptimizerEnabled: settings.gapOptimizerEnabled ?? false,
              gapOptimizerMinGapMins: settings.gapOptimizerMinGapMins ?? 30,
            }}
          />
          <DynamicSurgePricingTab
            key={`surge-${settings.updatedAt}`}
            orgId={orgId}
            initialData={{
              surgePricingEnabled: settings.surgePricingEnabled,
              surgeRules: settings.surgeRules ?? [],
            }}
          />
          <AiOperatorTab
            key={`ai-${settings.updatedAt}`}
            orgId={orgId}
            isPaid={org.plan === "paid"}
            initialData={{
              aiEnabled: settings.aiEnabled,
              aiPersonaName: settings.aiPersonaName,
              aiConfidenceThreshold: settings.aiConfidenceThreshold,
              aiHandoffPhoneNumber: settings.aiHandoffPhoneNumber || "",
              aiWebchatEnabled: settings.aiWebchatEnabled ?? false,
              aiInstagramEnabled: settings.aiInstagramEnabled ?? false,
              aiSystemPrompt: settings.aiSystemPrompt ?? "",
              aiGreetingMessage: settings.aiGreetingMessage ?? "",
              aiTone: settings.aiTone ?? "friendly",
              aiLanguage: settings.aiLanguage ?? "auto",
              aiWorkingHoursEnabled: settings.aiWorkingHoursEnabled ?? false,
              aiWorkingHours,
              aiWorkingHoursEnabled_days: aiWorkingHoursEnabledDays,
              aiAwayMessage: settings.aiAwayMessage ?? "",
            }}
          />
        </div>
      </Tabs>
    </motion.div>
  );
}
