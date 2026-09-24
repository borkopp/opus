"use client";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

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
  SwatchBook,
  Sparkles,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

import { SettingsSectionPicker } from "./SettingsSectionPicker";
import { AiOperatorTab } from "./tabs/AiOperatorTab";
import { BookingOperationsTab } from "./tabs/BookingOperationsTab";
import { DynamicSurgePricingTab } from "./tabs/DynamicSurgePricingTab";
import { GapOptimizerTab } from "./tabs/GapOptimizerTab";
import { GeneralTab } from "./tabs/GeneralTab";
import { IdentityProfileTab } from "./tabs/IdentityProfileTab";
import { LocationTab } from "./tabs/LocationTab";
import { NotificationsQueueTab } from "./tabs/NotificationsQueueTab";
import { ThemeTab } from "./tabs/ThemeTab";

const SETTINGS_TABS = [
  { value: "general", labelEn: "General", labelMk: "Општо", icon: Settings2 },
  { value: "themes", labelEn: "Themes", labelMk: "Теми", icon: SwatchBook },
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

export function SettingsWorkspace() {
  const { t } = useDashboardI18n();
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const activeTab = isSettingsTab(tabFromUrl) ? tabFromUrl : "general";

  const handleTabChange = useCallback((value: string) => {
    if (!isSettingsTab(value)) return;
    const url = value === "general" ? "/settings" : `/settings?tab=${value}`;
    // Tabs use already-loaded client data. Avoid a server navigation for a
    // local panel switch; Next keeps useSearchParams in sync with history.
    window.history.replaceState(null, "", url);
  }, []);

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex min-h-full w-full flex-1 flex-col gap-7 pb-12"
    >
      <DashboardPageHeader
        title={t("Settings", "Поставки")}
        eyebrow={t("YOUR WORKSPACE", "ВАШИОТ РАБОТЕН ПРОСТОР")}
        description={t(
          `Keep ${org.name}'s studio details, booking rules, and team preferences in one place.`,
          `Податоците за ${org.name}, правилата за закажување и поставките на тимот на едно место.`,
        )}
      />

      <Tabs
        orientation="vertical"
        value={activeTab}
        onValueChange={handleTabChange}
        className="dashboard-settings-tabs w-full"
      >
        <div className="dashboard-settings-nav">
          <SettingsSectionPicker
            sections={SETTINGS_TABS}
            value={activeTab}
            onValueChange={handleTabChange}
          />
          <div className="hidden md:block">
            <TabsList
              aria-label={t("Settings sections", "Секции за поставки")}
              className="h-auto w-max min-w-full justify-start gap-1 rounded-xl p-1 bg-muted/80 border border-border/70 shadow-2xs dark:bg-muted/70 dark:border-transparent dark:shadow-none"
            >
              {SETTINGS_TABS.map(({ value, labelEn, labelMk, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-9 min-w-max flex-1 gap-2 rounded-lg px-3 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-border/60 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-transparent dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground dark:data-[state=active]:shadow-none"
                >
                  <Icon />
                  {t(labelEn, labelMk)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="min-w-0">
          <ThemeTab />
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
              aiStudioContext: settings.aiStudioContext ?? "",
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
