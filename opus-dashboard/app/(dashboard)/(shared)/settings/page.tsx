"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import {
  CalendarClock,
  Globe2,
  MapPin,
  Palette,
  Settings2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { GeneralTab } from "./_components/tabs/GeneralTab";
import { BookingOperationsTab } from "./_components/tabs/BookingOperationsTab";
import { IdentityProfileTab } from "./_components/tabs/IdentityProfileTab";
import { LocationTab } from "./_components/tabs/LocationTab";
import { DomainTab } from "./_components/tabs/DomainTab";

const VALID_TABS = [
  "general",
  "booking",
  "branding",
  "location",
  "domain",
] as const;
type SettingsTab = (typeof VALID_TABS)[number];

const SETTINGS_GROUPS = [
  {
    label: "Business",
    items: [
      { value: "branding", label: "Branding", icon: Palette },
      { value: "location", label: "Location", icon: MapPin },
      { value: "domain", label: "Domain", icon: Globe2 },
      { value: "general", label: "Display & region", icon: Settings2 },
    ],
  },
  {
    label: "Appointments",
    items: [
      { value: "booking", label: "Booking rules", icon: CalendarClock },
    ],
  },
] satisfies Array<{
  label: string;
  items: Array<{
    value: SettingsTab;
    label: string;
    icon: typeof Settings2;
  }>;
}>;

export default function SettingsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── URL-driven tab state ──
  const tabFromUrl = searchParams.get("tab") as SettingsTab | null;
  const activeTab =
    tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "branding";

  const handleTabChange = useCallback(
    (value: string) => {
      const tab = value as SettingsTab;
      const url = tab === "branding" ? "/settings" : `/settings?tab=${tab}`;
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
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 pb-12">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Settings2 />
          </div>
          <div>
            <p className="micro-label text-muted-foreground">Workspace</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Settings
            </h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Shape how {org.name} appears, accepts bookings, communicates with
          customers, and runs day to day.
        </p>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        orientation="vertical"
        className="grid w-full items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10"
      >
        <Card className="overflow-hidden border border-border/60 p-2 lg:sticky lg:top-4">
          <TabsList
            aria-label="Settings sections"
            className="flex h-auto w-full items-stretch justify-start gap-1 overflow-x-auto bg-transparent p-0 lg:flex-col lg:overflow-visible"
          >
            {SETTINGS_GROUPS.map((group, groupIndex) => (
              <div
                key={group.label}
                className={cn(
                  "flex shrink-0 gap-1 lg:w-full lg:flex-col",
                  groupIndex > 0 && "lg:mt-4",
                )}
              >
                <p className="micro-label hidden px-3 pb-1 text-muted-foreground lg:block">
                  {group.label}
                </p>
                {group.items.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="h-10 flex-none justify-start gap-2.5 rounded-xl px-3 text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-muted/70 hover:text-foreground active:scale-[0.98] data-[state=active]:bg-accent/10 data-[state=active]:font-semibold data-[state=active]:text-accent data-[state=active]:shadow-none lg:w-full"
                  >
                    <Icon />
                    {label}
                  </TabsTrigger>
                ))}
              </div>
            ))}
          </TabsList>
        </Card>

        <div className="min-w-0 max-w-5xl">
          <GeneralTab
            key={`general-${settings.updatedAt}`}
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
            key={`booking-${settings.updatedAt}`}
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
          <DomainTab
            orgId={orgId}
            initialData={{ customDomain: org.customDomain || "" }}
          />
        </div>
      </Tabs>
    </div>
  );
}
