"use client";

import { cn } from "@/lib/utils";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  IconSettings,
  IconCalendarTime,
  IconCreditCard,
  IconFlame,
  IconBellRinging,
  IconRobot,
  IconPalette,
  IconWorldWww,
  IconDeviceFloppy,
  IconUpload,
  IconTrash,
  IconPhoto,
  IconBrandInstagram,
  IconPhone,
  IconWorld,
} from "@tabler/icons-react";
import { ListedBadge } from "@/components/dashboard/ListingBanner";

const VALID_TABS = ["general", "booking", "deposits", "surge", "notifications", "ai", "branding", "domain"] as const;
type SettingsTab = typeof VALID_TABS[number];

export default function SettingsPage() {
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── URL-driven tab state ──
  const tabFromUrl = searchParams.get("tab") as SettingsTab | null;
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "general";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Sync tab state when URL changes (e.g. browser back/forward)
  useEffect(() => {
    const t = searchParams.get("tab") as SettingsTab | null;
    if (t && VALID_TABS.includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleTabChange = useCallback((value: string) => {
    const tab = value as SettingsTab;
    setActiveTab(tab);
    const url = tab === "general" ? "/settings" : `/settings?tab=${tab}`;
    router.replace(url, { scroll: false });
  }, [router]);

  const data = useQuery(
    api.orgSettings.getOrgSettings,
    orgId ? { orgId } : "skip",
  );

  const updateOrgSettings = useMutation(api.orgSettings.updateOrgSettings);
  const updateDepositSettings = useMutation(
    api.orgSettings.updateDepositSettings,
  );
  const updateSurgePricingRules = useMutation(
    api.orgSettings.updateSurgePricingRules,
  );
  const updateNotificationSettings = useMutation(
    api.orgSettings.updateNotificationSettings,
  );
  const updateAiSettings = useMutation(api.orgSettings.updateAiSettings);
  const updateOrgBranding = useMutation(api.orgSettings.updateOrgBranding);
  const updateLogo = useMutation(api.orgSettings.updateLogo);
  const connectCustomDomain = useMutation(api.orgSettings.connectCustomDomain);
  const generateUploadUrl = useMutation(api.orgMedia.generateUploadUrl);
  const addMedia = useMutation(api.orgMedia.addMedia);
  const removeMedia = useMutation(api.orgMedia.removeMedia);

  const [isSaving, setIsSaving] = useState(false);

  // States
  const [general, setGeneral] = useState({
    timezone: "",
    currency: "",
    locale: "",
  });
  const [bookingRules, setBookingRules] = useState({
    slotDurationMins: 15,
    bookingWindowDays: 60,
    cancellationWindowHours: 24,
    bufferTimeMins: 0,
  });
  const [deposits, setDeposits] = useState({
    depositRequired: false,
    depositType: "fixed" as "fixed" | "percentage",
    depositValueStr: "0",
  });
  const [surge, setSurge] = useState({
    surgePricingEnabled: false,
    surgeRules: [] as any[],
  });
  const [notifications, setNotifications] = useState({
    smsEnabled: false,
    emailEnabled: false,
    whatsappEnabled: false,
    reminderHoursStr: "24,2",
  });
  const [ai, setAi] = useState({
    aiEnabled: false,
    aiPersonaName: "Aria",
    aiConfidenceThreshold: 0.8,
    aiHandoffPhoneNumber: "",
  });
  const [branding, setBranding] = useState({
    name: "",
    logoUrl: "",
    tagline: "",
    bio: "",
    phone: "",
    instagramHandle: "",
    websiteUrl: "",
    primary: "#000000",
    secondary: "#ffffff",
    accent: "#3b82f6",
  });
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
  const [domain, setDomain] = useState({ customDomain: "" });

  useEffect(() => {
    if (data && data.settings && data.org) {
      setGeneral({
        timezone: data.settings.timezone,
        currency: data.settings.currency,
        locale: data.settings.locale,
      });
      setBookingRules({
        slotDurationMins: data.settings.slotDurationMins,
        bookingWindowDays: data.settings.bookingWindowDays,
        cancellationWindowHours: data.settings.cancellationWindowHours,
        bufferTimeMins: data.settings.bufferTimeMins,
      });
      setDeposits({
        depositRequired: data.settings.depositRequired,
        depositType: data.settings.depositType,
        depositValueStr:
          data.settings.depositType === "percentage"
            ? data.settings.depositValue.toString()
            : (data.settings.depositValue / 100).toString(),
      });
      setSurge({
        surgePricingEnabled: data.settings.surgePricingEnabled,
        surgeRules: data.settings.surgeRules || [],
      });
      setNotifications({
        smsEnabled: data.settings.smsEnabled,
        emailEnabled: data.settings.emailEnabled,
        whatsappEnabled: data.settings.whatsappEnabled,
        reminderHoursStr: data.settings.reminderHoursBefore.join(","),
      });
      setAi({
        aiEnabled: data.settings.aiEnabled,
        aiPersonaName: data.settings.aiPersonaName,
        aiConfidenceThreshold: data.settings.aiConfidenceThreshold,
        aiHandoffPhoneNumber: data.settings.aiHandoffPhoneNumber || "",
      });
      setBranding({
        name: data.org.name,
        logoUrl: data.org.logoUrl || "",
        tagline: data.org.tagline || "",
        bio: data.org.bio || "",
        phone: data.org.phone || "",
        instagramHandle: data.org.instagramHandle || "",
        websiteUrl: data.org.websiteUrl || "",
        primary: data.org.brandColors?.primary || "#000000",
        secondary: data.org.brandColors?.secondary || "#ffffff",
        accent: data.org.brandColors?.accent || "#3b82f6",
      });
      setDomain({ customDomain: data.org.customDomain || "" });
    }
  }, [data]);

  if (profile === undefined || data === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!orgId || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">
          Unable to load settings. Please make sure onboarding is complete.
        </p>
      </div>
    );
  }

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      await updateOrgSettings({ orgId, ...general, ...bookingRules });
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSaving(false);
  };

  const handleSaveBookingRules = async () => {
    setIsSaving(true);
    try {
      await updateOrgSettings({ orgId, ...general, ...bookingRules });
      toast.success("Booking rules saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSaving(false);
  };

  const handleSaveDeposits = async () => {
    setIsSaving(true);
    try {
      const val = parseFloat(deposits.depositValueStr);
      const depositValue =
        deposits.depositType === "percentage"
          ? Math.round(val)
          : Math.round(val * 100);
      await updateDepositSettings({
        orgId,
        depositRequired: deposits.depositRequired,
        depositType: deposits.depositType,
        depositValue,
      });
      toast.success("Deposit settings saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSaving(false);
  };

  const handleSaveSurge = async () => {
    setIsSaving(true);
    try {
      await updateSurgePricingRules({
        orgId,
        surgePricingEnabled: surge.surgePricingEnabled,
        surgeRules: surge.surgeRules,
      });
      toast.success("Surge pricing saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSaving(false);
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const arr = notifications.reminderHoursStr
        .split(",")
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n));
      await updateNotificationSettings({
        orgId,
        smsEnabled: notifications.smsEnabled,
        emailEnabled: notifications.emailEnabled,
        whatsappEnabled: notifications.whatsappEnabled,
        reminderHoursBefore: arr,
      });
      toast.success("Notification settings saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSaving(false);
  };

  const handleSaveAi = async () => {
    setIsSaving(true);
    try {
      await updateAiSettings({ orgId, ...ai });
      toast.success("AI settings saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSaving(false);
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      await updateOrgBranding({
        orgId,
        name: branding.name,
        logoUrl: branding.logoUrl || undefined,
        tagline: branding.tagline || undefined,
        bio: branding.bio || undefined,
        phone: branding.phone || undefined,
        instagramHandle: branding.instagramHandle || undefined,
        websiteUrl: branding.websiteUrl || undefined,
        brandColors: {
          primary: branding.primary,
          secondary: branding.secondary,
          accent: branding.accent,
        },
      });
      toast.success("Branding saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSaving(false);
  };

  const handleMediaUpload = async (type: "cover" | "gallery" | "team") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = type === "gallery";
    input.onchange = async () => {
      if (!input.files?.length || !orgId) return;
      setUploadingMedia(type);
      try {
        const existingMedia = data?.media ?? [];
        // If replacing a cover, remove old one first
        if (type === "cover") {
          const oldCover = existingMedia.find((m) => m.type === "cover");
          if (oldCover) await removeMedia({ orgId, mediaId: oldCover._id });
        }
        for (let i = 0; i < input.files.length; i++) {
          const file = input.files[i];
          const postUrl = await generateUploadUrl();
          const res = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          const { storageId } = await res.json();
          const sortOrder =
            type === "cover"
              ? 0
              : existingMedia.filter((m) => m.type === type).length + i;
          await addMedia({ orgId, storageId, type, sortOrder });
        }
        toast.success(
          type === "gallery"
            ? "Photos added"
            : `${type.charAt(0).toUpperCase() + type.slice(1)} updated`,
        );
      } catch (e: any) {
        toast.error(e.message || "Upload failed");
      }
      setUploadingMedia(null);
    };
    input.click();
  };

  const handleRemoveMedia = async (mediaId: Id<"org_media">) => {
    if (!orgId) return;
    try {
      await removeMedia({ orgId, mediaId });
      toast.success("Photo removed");
    } catch (e: any) {
      toast.error(e.message || "Failed to remove");
    }
  };

  const handleSaveDomain = async () => {
    setIsSaving(true);
    try {
      await connectCustomDomain({ orgId, customDomain: domain.customDomain });
      toast.success("Domain updated");
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-[1700px] max-h-screen mx-auto pb-10">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-semibold font-display tracking-tight text-foreground">
            Organization Settings
          </h1>
          {orgId && <ListedBadge orgId={orgId} />}
        </div>
        <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
          Manage global preferences, automation engines, and branding
          configurations for your Omni-Service deployment.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        orientation="vertical"
        className="flex flex-col md:flex-row gap-8 lg:gap-12 w-full mt-2 items-start"
      >
        {/* Vertical Sidebar Navigation */}
        <div className="w-full md:w-64 lg:w-72 shrink-0">
          <TabsList className="flex flex-col h-auto w-full items-start justify-start bg-transparent p-0 space-y-1">
            <TabsTrigger
              value="general"
              className="w-full justify-start gap-3 px-3 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/40 rounded-xl font-medium transition-all"
            >
              <IconSettings size={18} stroke={1.5} className="opacity-70" />{" "}
              General
            </TabsTrigger>
            <TabsTrigger
              value="booking"
              className="w-full justify-start gap-3 px-3 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/40 rounded-xl font-medium transition-all"
            >
              <IconCalendarTime size={18} stroke={1.5} className="opacity-70" />{" "}
              Booking Rules
            </TabsTrigger>
            <TabsTrigger
              value="deposits"
              className="w-full justify-start gap-3 px-3 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/40 rounded-xl font-medium transition-all"
            >
              <IconCreditCard size={18} stroke={1.5} className="opacity-70" />{" "}
              Deposits
            </TabsTrigger>
            <TabsTrigger
              value="surge"
              className="w-full justify-start gap-3 px-3 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/40 rounded-xl font-medium transition-all"
            >
              <IconFlame
                size={18}
                stroke={1.5}
                className="opacity-70 text-orange-500"
              />{" "}
              Surge Pricing
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="w-full justify-start gap-3 px-3 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/40 rounded-xl font-medium transition-all"
            >
              <IconBellRinging size={18} stroke={1.5} className="opacity-70" />{" "}
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="ai"
              className="w-full justify-start gap-3 px-3 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/40 rounded-xl font-medium transition-all"
            >
              <IconRobot
                size={18}
                stroke={1.5}
                className="opacity-70 text-blue-500"
              />{" "}
              AI Rules
            </TabsTrigger>
            <TabsTrigger
              value="branding"
              className="w-full justify-start gap-3 px-3 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/40 rounded-xl font-medium transition-all"
            >
              <IconPalette
                size={18}
                stroke={1.5}
                className="opacity-70 text-purple-500"
              />{" "}
              Branding
            </TabsTrigger>
            <TabsTrigger
              value="domain"
              className="w-full justify-start gap-3 px-3 py-2.5 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted/40 rounded-xl font-medium transition-all"
            >
              <IconWorldWww size={18} stroke={1.5} className="opacity-70" />{" "}
              Domain
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 max-w-4xl min-w-0">
          <TabsContent
            value="general"
            className="m-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-6 pt-6 px-7">
                <CardTitle className="text-xl">Global Settings</CardTitle>
                <CardDescription className="text-sm">
                  Configure primary operating preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-7 px-7">
                <div className="grid gap-2 max-w-xl">
                  <Label>Timezone</Label>
                  <Input
                    value={general.timezone}
                    onChange={(e) =>
                      setGeneral({ ...general, timezone: e.target.value })
                    }
                    className="bg-background"
                  />
                </div>
                <div className="grid gap-2 max-w-xl">
                  <Label>
                    Locale{" "}
                    <span className="text-muted-foreground font-normal ml-1">
                      (e.g. en-GB)
                    </span>
                  </Label>
                  <Input
                    value={general.locale}
                    onChange={(e) =>
                      setGeneral({ ...general, locale: e.target.value })
                    }
                    className="bg-background"
                  />
                </div>
                <div className="grid gap-3">
                  <Label>
                    Currency{" "}
                    <span className="text-muted-foreground font-normal ml-1">
                      (Used for formatting across the platform)
                    </span>
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { code: "USD", symbol: "$", name: "US Dollar" },
                      { code: "EUR", symbol: "€", name: "Euro" },
                      { code: "GBP", symbol: "£", name: "British Pound" },
                      { code: "MKD", symbol: "ден", name: "MK Denar" },
                    ].map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() =>
                          setGeneral({ ...general, currency: c.code })
                        }
                        className={cn(
                          "p-6 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden",
                          general.currency === c.code
                            ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                            : "border-border bg-card hover:border-primary/30 hover:bg-muted/30",
                        )}
                      >
                        {general.currency === c.code && (
                          <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                            ✓
                          </div>
                        )}
                        <span
                          className={cn(
                            "text-3xl font-black font-display transition-colors",
                            general.currency === c.code
                              ? "text-primary"
                              : "text-muted-foreground/40 group-hover:text-muted-foreground",
                          )}
                        >
                          {c.symbol}
                        </span>
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-sm font-bold uppercase tracking-wider">
                            {c.code}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {c.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/40 px-7 py-5 bg-muted/10">
                <Button
                  onClick={handleSaveGeneral}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <IconDeviceFloppy size={18} /> Save Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent
            value="booking"
            className="m-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-6 pt-6 px-7">
                <CardTitle className="text-xl">Booking Operations</CardTitle>
                <CardDescription className="text-sm">
                  Govern how your calendar behaves publicly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-7 px-7">
                <div className="grid gap-2 max-w-xl">
                  <Label>
                    Slot Duration{" "}
                    <span className="text-muted-foreground font-normal ml-1">
                      (Minutes)
                    </span>
                  </Label>
                  <Input
                    type="number"
                    value={bookingRules.slotDurationMins}
                    onChange={(e) =>
                      setBookingRules({
                        ...bookingRules,
                        slotDurationMins: parseInt(e.target.value),
                      })
                    }
                    className="bg-background"
                  />
                </div>
                <div className="grid gap-2 max-w-xl">
                  <Label>
                    Booking Window{" "}
                    <span className="text-muted-foreground font-normal ml-1">
                      (Days out)
                    </span>
                  </Label>
                  <Input
                    type="number"
                    value={bookingRules.bookingWindowDays}
                    onChange={(e) =>
                      setBookingRules({
                        ...bookingRules,
                        bookingWindowDays: parseInt(e.target.value),
                      })
                    }
                    className="bg-background"
                  />
                </div>
                <div className="grid gap-2 max-w-xl">
                  <Label>
                    Cancellation Window{" "}
                    <span className="text-muted-foreground font-normal ml-1">
                      (Hours)
                    </span>
                  </Label>
                  <Input
                    type="number"
                    value={bookingRules.cancellationWindowHours}
                    onChange={(e) =>
                      setBookingRules({
                        ...bookingRules,
                        cancellationWindowHours: parseInt(e.target.value),
                      })
                    }
                    className="bg-background"
                  />
                </div>
                <div className="grid gap-2 max-w-xl">
                  <Label>
                    Buffer Time{" "}
                    <span className="text-muted-foreground font-normal ml-1">
                      (Minutes)
                    </span>
                  </Label>
                  <Input
                    type="number"
                    value={bookingRules.bufferTimeMins}
                    onChange={(e) =>
                      setBookingRules({
                        ...bookingRules,
                        bufferTimeMins: parseInt(e.target.value),
                      })
                    }
                    className="bg-background"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/40 px-7 py-5 bg-muted/10">
                <Button
                  onClick={handleSaveBookingRules}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <IconDeviceFloppy size={18} /> Save Rules
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent
            value="deposits"
            className="m-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-6 pt-6 px-7">
                <CardTitle className="text-xl">Deposit Management</CardTitle>
                <CardDescription className="text-sm">
                  Require upfront capital to secure a booking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-7 px-7">
                <div className="flex items-center space-x-3 bg-muted/20 p-4 rounded-xl border border-border/60 shadow-inner">
                  <Switch
                    checked={deposits.depositRequired}
                    onCheckedChange={(c) =>
                      setDeposits({ ...deposits, depositRequired: c })
                    }
                  />
                  <Label className="select-none font-medium">
                    Require Deposit on Booking Creation
                  </Label>
                </div>

                {deposits.depositRequired && (
                  <div className="grid gap-6 mt-4 p-6 border border-border/60 rounded-xl bg-background shadow-sm">
                    <div className="grid gap-2 max-w-sm">
                      <Label>Deposit Math Type</Label>
                      <Select
                        value={deposits.depositType}
                        onValueChange={(v: any) =>
                          setDeposits({ ...deposits, depositType: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">
                            Fixed Currency Value
                          </SelectItem>
                          <SelectItem value="percentage">
                            Percentage (%) of Total
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2 max-w-sm">
                      <Label>Value</Label>
                      <Input
                        type="number"
                        value={deposits.depositValueStr}
                        step={
                          deposits.depositType === "percentage" ? "1" : "0.01"
                        }
                        className="bg-background"
                        onChange={(e) =>
                          setDeposits({
                            ...deposits,
                            depositValueStr: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/40 px-7 py-5 bg-muted/10">
                <Button
                  onClick={handleSaveDeposits}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <IconDeviceFloppy size={18} /> Save Deposits
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent
            value="surge"
            className="m-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-6 pt-6 px-7">
                <CardTitle className="text-xl">Dynamic Surge Pricing</CardTitle>
                <CardDescription className="text-sm">
                  Automatically scale service pricing during peak demand hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-7 px-7">
                <div className="flex items-center space-x-3 bg-muted/20 p-4 rounded-xl border border-border/60 shadow-inner">
                  <Switch
                    checked={surge.surgePricingEnabled}
                    onCheckedChange={(c) =>
                      setSurge({ ...surge, surgePricingEnabled: c })
                    }
                  />
                  <Label className="select-none font-medium">
                    Enable Surge Pricing Automation
                  </Label>
                </div>

                {/* MVP Note: Complex Array builder truncated for simplicity UI */}
                {surge.surgePricingEnabled && (
                  <div className="text-sm text-neutral-500 italic p-5 border border-dashed border-border/60 rounded-xl bg-background shadow-inner">
                    Surge Rules array modification is currently locked via
                    developer console configurations. <br />
                    <span className="font-medium mt-2 block not-italic">
                      Active rules: {surge.surgeRules.length}
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/40 px-7 py-5 bg-muted/10">
                <Button
                  onClick={handleSaveSurge}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <IconDeviceFloppy size={18} /> Save Engine
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent
            value="notifications"
            className="m-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-6 pt-6 px-7">
                <CardTitle className="text-xl">Notifications Queue</CardTitle>
                <CardDescription className="text-sm">
                  Control how and when clients receive alerts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-7 px-7">
                <div className="flex flex-col gap-0 border border-border/60 rounded-xl overflow-hidden shadow-inner">
                  <div className="flex items-center space-x-3 bg-muted/10 p-5 border-b border-border/60 transition-colors">
                    <Switch
                      checked={notifications.smsEnabled}
                      onCheckedChange={(c) =>
                        setNotifications({ ...notifications, smsEnabled: c })
                      }
                    />
                    <Label className="select-none font-medium text-base">
                      SMS Text Messages
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 bg-muted/10 p-5 border-b border-border/60 transition-colors">
                    <Switch
                      checked={notifications.emailEnabled}
                      onCheckedChange={(c) =>
                        setNotifications({ ...notifications, emailEnabled: c })
                      }
                    />
                    <Label className="select-none font-medium text-base">
                      Email Inboxes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 bg-muted/10 p-5 transition-colors">
                    <Switch
                      checked={notifications.whatsappEnabled}
                      onCheckedChange={(c) =>
                        setNotifications({
                          ...notifications,
                          whatsappEnabled: c,
                        })
                      }
                    />
                    <Label className="select-none font-medium text-base">
                      WhatsApp Business (Meta)
                    </Label>
                  </div>
                </div>
                <div className="grid gap-2 mt-2 max-w-xl">
                  <Label>
                    Reminder Hours Before{" "}
                    <span className="text-muted-foreground font-normal ml-1">
                      (Comma separated)
                    </span>
                  </Label>
                  <Input
                    value={notifications.reminderHoursStr}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        reminderHoursStr: e.target.value,
                      })
                    }
                    placeholder="e.g. 24, 2"
                    className="bg-background"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/40 px-7 py-5 bg-muted/10">
                <Button
                  onClick={handleSaveNotifications}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <IconDeviceFloppy size={18} /> Save Routing
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent
            value="ai"
            className="m-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-6 pt-6 px-7">
                <CardTitle className="text-xl text-blue-500">
                  AI Agent Front-Desk
                </CardTitle>
                <CardDescription className="text-sm">
                  Configure the autonomous Claude-powered booking engine.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-7 px-7">
                <div className="flex items-center space-x-3 bg-muted/20 p-4 rounded-xl border border-border/60 shadow-inner">
                  <Switch
                    checked={ai.aiEnabled}
                    onCheckedChange={(c) => setAi({ ...ai, aiEnabled: c })}
                  />
                  <Label className="select-none font-medium">
                    Activate AI Operator
                  </Label>
                </div>
                {ai.aiEnabled && (
                  <div className="grid gap-6 p-6 border border-border/60 rounded-xl bg-background shadow-sm mt-4">
                    <div className="grid gap-2 max-w-xl">
                      <Label>Persona Name</Label>
                      <Input
                        value={ai.aiPersonaName}
                        className="bg-background"
                        onChange={(e) =>
                          setAi({ ...ai, aiPersonaName: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2 max-w-xl">
                      <Label>
                        Confidence Threshold{" "}
                        <span className="text-muted-foreground font-normal ml-1">
                          (0 to 1 scale)
                        </span>
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={ai.aiConfidenceThreshold}
                        className="bg-background"
                        onChange={(e) =>
                          setAi({
                            ...ai,
                            aiConfidenceThreshold: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2 max-w-xl">
                      <Label>Human Handoff Fallback Number</Label>
                      <Input
                        value={ai.aiHandoffPhoneNumber}
                        className="bg-background"
                        onChange={(e) =>
                          setAi({ ...ai, aiHandoffPhoneNumber: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/40 px-7 py-5 bg-muted/10">
                <Button
                  onClick={handleSaveAi}
                  disabled={isSaving}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <IconDeviceFloppy size={18} /> Deploy AI Profile
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent
            value="branding"
            className="m-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <div className="space-y-6">
              {/* ── Cover Photo ─────────────────────────────────────── */}
              <Card className="rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/40 bg-muted/10 pb-5 pt-5 px-7">
                  <CardTitle className="text-lg">Cover Photo</CardTitle>
                  <CardDescription className="text-sm">
                    The hero banner on your opus.mk listing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {(() => {
                    const cover = (data?.media ?? []).find(
                      (m) => m.type === "cover",
                    );
                    return cover ? (
                      <div className="relative group">
                        <img
                          src={cover.url}
                          alt="Cover"
                          className="w-full h-48 sm:h-56 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="rounded-full shadow-lg"
                              onClick={() => handleMediaUpload("cover")}
                            >
                              <IconUpload size={14} className="mr-1.5" />{" "}
                              Replace
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="rounded-full shadow-lg"
                              onClick={() => handleRemoveMedia(cover._id)}
                            >
                              <IconTrash size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleMediaUpload("cover")}
                        disabled={uploadingMedia === "cover"}
                        className="w-full h-48 sm:h-56 border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-muted/20 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer"
                      >
                        {uploadingMedia === "cover" ? (
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : (
                          <IconPhoto
                            size={28}
                            className="text-muted-foreground/40"
                          />
                        )}
                        <span className="text-sm text-muted-foreground font-medium">
                          {uploadingMedia === "cover"
                            ? "Uploading..."
                            : "Click to upload a cover photo"}
                        </span>
                      </button>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* ── Identity & Profile ──────────────────────────────── */}
              <Card className="rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/40 bg-muted/10 pb-5 pt-5 px-7">
                  <CardTitle className="text-lg">Identity & Profile</CardTitle>
                  <CardDescription className="text-sm">
                    Your business name, tagline, and bio shown on opus.mk.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-start gap-6">
                    {/* Logo preview */}
                    <div className="shrink-0">
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        Logo
                      </Label>
                      <div
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = async () => {
                            if (!input.files?.length) return;
                            setUploadingMedia("logo");
                            try {
                              const file = input.files[0];
                              const postUrl = await generateUploadUrl();
                              const res = await fetch(postUrl, {
                                method: "POST",
                                headers: { "Content-Type": file.type },
                                body: file,
                              });
                              const { storageId } = await res.json();
                              const newLogoUrl = await updateLogo({ orgId, storageId });
                              setBranding((b) => ({ ...b, logoUrl: newLogoUrl }));
                              toast.success("Logo updated successfully");
                            } catch (e: any) {
                              toast.error(e.message || "Logo upload failed");
                            }
                            setUploadingMedia(null);
                          };
                          input.click();
                        }}
                        className="relative h-20 w-20 rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/40 bg-muted/10 flex items-center justify-center cursor-pointer transition-all overflow-hidden group"
                      >
                        {branding.logoUrl ? (
                          <>
                            <img
                              src={branding.logoUrl}
                              alt="Logo"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <IconUpload size={16} className="text-white" />
                            </div>
                          </>
                        ) : uploadingMedia === "logo" ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : (
                          <IconUpload
                            size={18}
                            className="text-muted-foreground/40"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="grid gap-1.5">
                        <Label>Business Name</Label>
                        <Input
                          value={branding.name}
                          className="bg-background"
                          onChange={(e) =>
                            setBranding({ ...branding, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>
                          Tagline{" "}
                          <span className="text-muted-foreground font-normal ml-1">
                            — one-liner that hooks customers
                          </span>
                        </Label>
                        <Input
                          value={branding.tagline}
                          className="bg-background"
                          placeholder="Premium haircuts & wet shaves since 2012"
                          onChange={(e) =>
                            setBranding({
                              ...branding,
                              tagline: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>
                      Bio / About{" "}
                      <span className="text-muted-foreground font-normal ml-1">
                        — tell customers what makes you special
                      </span>
                    </Label>
                    <textarea
                      value={branding.bio}
                      onChange={(e) =>
                        setBranding({ ...branding, bio: e.target.value })
                      }
                      rows={4}
                      placeholder="We're a small team of passionate barbers dedicated to..."
                      className={cn(
                        "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background",
                        "placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "resize-y min-h-[100px]",
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      {branding.bio.length}/500 characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* ── Gallery Photos ──────────────────────────────────── */}
              <Card className="rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/40 bg-muted/10 pb-5 pt-5 px-7 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Gallery</CardTitle>
                    <CardDescription className="text-sm">
                      Showcase your work, venue, and team.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full gap-1.5 shrink-0"
                    onClick={() => handleMediaUpload("gallery")}
                    disabled={uploadingMedia === "gallery"}
                  >
                    {uploadingMedia === "gallery" ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <IconUpload size={14} />
                    )}
                    Add Photos
                  </Button>
                </CardHeader>
                <CardContent className="p-5">
                  {(() => {
                    const gallery = (data?.media ?? []).filter(
                      (m) => m.type === "gallery",
                    );
                    return gallery.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {gallery.map((m) => (
                          <div
                            key={m._id}
                            className="relative group rounded-xl overflow-hidden aspect-square border border-border/40"
                          >
                            <img
                              src={m.url}
                              alt={m.caption || "Gallery"}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <Button
                                size="icon"
                                variant="destructive"
                                className="rounded-full h-8 w-8 shadow-lg"
                                onClick={() => handleRemoveMedia(m._id)}
                              >
                                <IconTrash size={14} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
                          <IconPhoto
                            size={22}
                            className="text-muted-foreground/40"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No gallery photos yet
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          Add photos to showcase your work on opus.mk
                        </p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* ── Contact & Social ────────────────────────────────── */}
              <Card className="rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/40 bg-muted/10 pb-5 pt-5 px-7">
                  <CardTitle className="text-lg">Contact & Social</CardTitle>
                  <CardDescription className="text-sm">
                    How customers can reach you outside the platform.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="grid gap-1.5 max-w-xl">
                    <Label className="flex items-center gap-1.5">
                      <IconPhone size={14} className="text-muted-foreground" />{" "}
                      Phone Number
                    </Label>
                    <Input
                      value={branding.phone}
                      className="bg-background"
                      placeholder="+38972xxxxxxx"
                      onChange={(e) =>
                        setBranding({ ...branding, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5 max-w-xl">
                    <Label className="flex items-center gap-1.5">
                      <IconBrandInstagram
                        size={14}
                        className="text-muted-foreground"
                      />{" "}
                      Instagram Handle
                    </Label>
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-3 h-9 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground">
                        @
                      </span>
                      <Input
                        value={branding.instagramHandle}
                        className="bg-background rounded-l-none"
                        placeholder="yourbusiness"
                        onChange={(e) =>
                          setBranding({
                            ...branding,
                            instagramHandle: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5 max-w-xl">
                    <Label className="flex items-center gap-1.5">
                      <IconWorld size={14} className="text-muted-foreground" />{" "}
                      Website URL
                    </Label>
                    <Input
                      value={branding.websiteUrl}
                      className="bg-background"
                      placeholder="https://yourbusiness.com"
                      onChange={(e) =>
                        setBranding({ ...branding, websiteUrl: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Brand Colors ────────────────────────────────────── */}
              <Card className="rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/40 bg-muted/10 pb-5 pt-5 px-7">
                  <CardTitle className="text-lg">Brand Colors</CardTitle>
                  <CardDescription className="text-sm">
                    Applied to your booking page and opus.mk listing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-2xl">
                    {[
                      { key: "primary" as const, label: "Primary" },
                      { key: "secondary" as const, label: "Secondary" },
                      { key: "accent" as const, label: "Accent" },
                    ].map(({ key, label }) => (
                      <div key={key} className="grid gap-2">
                        <Label className="text-sm">{label}</Label>
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <input
                              type="color"
                              value={branding[key]}
                              onChange={(e) =>
                                setBranding({
                                  ...branding,
                                  [key]: e.target.value,
                                })
                              }
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <div
                              className="h-9 w-9 rounded-lg border-2 border-border/60 shadow-sm cursor-pointer shrink-0"
                              style={{ backgroundColor: branding[key] }}
                            />
                          </div>
                          <Input
                            value={branding[key]}
                            className="bg-background font-mono text-xs uppercase"
                            onChange={(e) =>
                              setBranding({
                                ...branding,
                                [key]: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Live preview strip */}
                  <div className="mt-6 flex gap-0 rounded-xl overflow-hidden h-3 max-w-2xl">
                    <div
                      className="flex-1"
                      style={{ backgroundColor: branding.primary }}
                    />
                    <div
                      className="flex-1"
                      style={{ backgroundColor: branding.secondary }}
                    />
                    <div
                      className="flex-1"
                      style={{ backgroundColor: branding.accent }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Save All Branding ───────────────────────────────── */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveBranding}
                  disabled={isSaving}
                  size="lg"
                  className="gap-2 rounded-xl px-8 shadow-md"
                >
                  <IconDeviceFloppy size={18} /> Save Branding
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="domain"
            className="m-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-6 pt-6 px-7">
                <CardTitle className="text-xl">
                  Custom DNS Integrations
                </CardTitle>
                <CardDescription className="text-sm">
                  White-label your appointment routing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-2 max-w-xl">
                  <Label>Vercel Bound CNAME Endpoint</Label>
                  <Input
                    placeholder="book.mybusiness.com"
                    value={domain.customDomain}
                    className="bg-background"
                    onChange={(e) =>
                      setDomain({ ...domain, customDomain: e.target.value })
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                  Please ensure you add a CNAME record at your registrar
                  pointing exactly to{" "}
                  <strong className="text-foreground">
                    cname.vercel-dns.com
                  </strong>{" "}
                  otherwise the edge resolver will fail the TLS handshake.
                </p>
              </CardContent>
              <CardFooter className="border-t border-border/40 px-7 py-5 bg-muted/10">
                <Button
                  onClick={handleSaveDomain}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <IconDeviceFloppy size={18} /> Provision Edge Record
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
