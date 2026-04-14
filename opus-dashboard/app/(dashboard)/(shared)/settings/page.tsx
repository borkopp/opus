"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconSettings,
  IconCalendarTime,
  IconCreditCard,
  IconFlame,
  IconBellRinging,
  IconRobot,
  IconPalette,
  IconMapPin,
  IconWorldWww,
} from "@tabler/icons-react";
import { ListedBadge } from "@/components/dashboard/ListingBanner";

import { GeneralTab } from "./_components/tabs/GeneralTab";
import { BookingOperationsTab } from "./_components/tabs/BookingOperationsTab";
import { DepositManagementTab } from "./_components/tabs/DepositManagementTab";
import { DynamicSurgePricingTab } from "./_components/tabs/DynamicSurgePricingTab";
import { NotificationsQueueTab } from "./_components/tabs/NotificationsQueueTab";
import { AiOperatorTab } from "./_components/tabs/AiOperatorTab";
import { IdentityProfileTab } from "./_components/tabs/IdentityProfileTab";
import { LocationTab } from "./_components/tabs/LocationTab";
import { DomainTab } from "./_components/tabs/DomainTab";

const VALID_TABS = [
  "general",
  "booking",
  "deposits",
  "surge",
  "notifications",
  "ai",
  "branding",
  "location",
  "domain",
] as const;
type SettingsTab = (typeof VALID_TABS)[number];

export default function SettingsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── URL-driven tab state ──
  const tabFromUrl = searchParams.get("tab") as SettingsTab | null;
  const initialTab =
    tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "general";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Sync tab state when URL changes (e.g. browser back/forward)
  useEffect(() => {
    const t = searchParams.get("tab") as SettingsTab | null;
    if (t && VALID_TABS.includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      const tab = value as SettingsTab;
      setActiveTab(tab);
      const url = tab === "general" ? "/settings" : `/settings?tab=${tab}`;
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!orgId || !data || !data.settings) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">
          Unable to load settings. Please make sure onboarding is complete.
        </p>
      </div>
    );
  }

  const { settings, org, media } = data;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1700px] mx-auto pb-10">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold font-display tracking-tight text-foreground">
              Organization Settings
            </h1>
            {orgId && <ListedBadge orgId={orgId} />}
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your organization's preferences, branding, and automation.
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        orientation="vertical"
        className="flex flex-col md:flex-row gap-8 w-full items-start"
      >
        {/* ── Sidebar Navigation ── */}
        <div className="w-full md:w-56 lg:w-60 shrink-0">
          <TabsList className="flex flex-col h-auto w-full items-start bg-transparent p-0">
            {/* Core */}
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 pt-1 pb-2">
              Core
            </p>
            {[
              { value: "general", label: "General", icon: <IconSettings size={16} stroke={1.5} /> },
              { value: "booking", label: "Booking Rules", icon: <IconCalendarTime size={16} stroke={1.5} /> },
              { value: "deposits", label: "Deposits", icon: <IconCreditCard size={16} stroke={1.5} /> },
              { value: "surge", label: "Surge Pricing", icon: <IconFlame size={16} stroke={1.5} /> },
            ].map(({ value, label, icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="group w-full justify-start gap-2.5 px-3 py-2 text-sm data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg font-medium transition-colors relative"
              >
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary opacity-0 data-[state=active]:opacity-100 transition-opacity" />
                {icon} {label}
              </TabsTrigger>
            ))}

            {/* Channels */}
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 pt-5 pb-2">
              Channels
            </p>
            {[
              { value: "notifications", label: "Notifications", icon: <IconBellRinging size={16} stroke={1.5} /> },
              { value: "ai", label: "AI Agent", icon: <IconRobot size={16} stroke={1.5} /> },
            ].map(({ value, label, icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="group w-full justify-start gap-2.5 px-3 py-2 text-sm data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg font-medium transition-colors relative"
              >
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary opacity-0 data-[state=active]:opacity-100 transition-opacity" />
                {icon} {label}
              </TabsTrigger>
            ))}

            {/* Identity */}
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 pt-5 pb-2">
              Identity
            </p>
            {[
              { value: "branding", label: "Branding", icon: <IconPalette size={16} stroke={1.5} /> },
              { value: "location", label: "Location", icon: <IconMapPin size={16} stroke={1.5} /> },
              { value: "domain", label: "Domain", icon: <IconWorldWww size={16} stroke={1.5} /> },
            ].map(({ value, label, icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="group w-full justify-start gap-2.5 px-3 py-2 text-sm data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg font-medium transition-colors relative"
              >
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary opacity-0 data-[state=active]:opacity-100 transition-opacity" />
                {icon} {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 max-w-4xl min-w-0">
          <GeneralTab
            orgId={orgId}
            initialData={{
              timezone: settings.timezone,
              currency: settings.currency,
              locale: settings.locale,
              slotDurationMins: settings.slotDurationMins,
              bookingWindowDays: settings.bookingWindowDays,
              cancellationWindowHours: settings.cancellationWindowHours,
              bufferTimeMins: settings.bufferTimeMins,
            }}
          />
          <BookingOperationsTab
            orgId={orgId}
            initialData={{
              timezone: settings.timezone,
              currency: settings.currency,
              locale: settings.locale,
              slotDurationMins: settings.slotDurationMins,
              bookingWindowDays: settings.bookingWindowDays,
              cancellationWindowHours: settings.cancellationWindowHours,
              bufferTimeMins: settings.bufferTimeMins,
            }}
          />
          <DepositManagementTab
            orgId={orgId}
            initialData={{
              depositRequired: settings.depositRequired,
              depositType: settings.depositType,
              depositValue: settings.depositValue,
            }}
          />
          <DynamicSurgePricingTab
            orgId={orgId}
            initialData={{
              surgePricingEnabled: settings.surgePricingEnabled,
              surgeRules: settings.surgeRules || [],
            }}
          />
          <NotificationsQueueTab
            orgId={orgId}
            initialData={{
              smsEnabled: settings.smsEnabled,
              emailEnabled: settings.emailEnabled,
              whatsappEnabled: settings.whatsappEnabled,
              reminderHoursBefore: settings.reminderHoursBefore,
              dashboardNotificationsEnabled: settings.dashboardNotificationsEnabled ?? true,
              dashboardSoundEnabled: settings.dashboardSoundEnabled ?? true,
              dashboardToastEnabled: settings.dashboardToastEnabled ?? true,
            }}
          />
          <AiOperatorTab
            orgId={orgId}
            initialData={{
              aiEnabled: settings.aiEnabled,
              aiPersonaName: settings.aiPersonaName,
              aiConfidenceThreshold: settings.aiConfidenceThreshold,
              aiHandoffPhoneNumber: settings.aiHandoffPhoneNumber || "",
              aiWebchatEnabled: settings.aiWebchatEnabled ?? false,
              aiInstagramEnabled: settings.aiInstagramEnabled ?? false,
              aiSystemPrompt: settings.aiSystemPrompt ?? "",
              aiGreetingMessage: settings.aiGreetingMessage ?? "",
              aiTone: (settings.aiTone as any) ?? "friendly",
              aiLanguage: (settings.aiLanguage as any) ?? "auto",
              aiWorkingHoursEnabled: settings.aiWorkingHoursEnabled ?? false,
              aiWorkingHours: settings.aiWorkingHours ?? [
                { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
                { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
                { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
                { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
                { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" },
                { dayOfWeek: 6, startTime: "10:00", endTime: "16:00" },
                { dayOfWeek: 0, startTime: "10:00", endTime: "16:00" },
              ],
              aiWorkingHoursEnabled_days: [true, true, true, true, true, false, false],
              aiAwayMessage: settings.aiAwayMessage ?? "",
            }}
          />
          <IdentityProfileTab
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
              primary: org.brandColors?.primary || "#000000",
              secondary: org.brandColors?.secondary || "#ffffff",
              accent: org.brandColors?.accent || "#3b82f6",
            }}
            media={media ?? []}
          />
          <LocationTab
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
          <DomainTab
            orgId={orgId}
            initialData={{ customDomain: org.customDomain || "" }}
          />
        </div>
      </Tabs>
    </div>
  );
}
