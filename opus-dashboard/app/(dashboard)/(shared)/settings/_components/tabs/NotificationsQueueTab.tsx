"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { IconDeviceFloppy, IconAlertCircle } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { parseReminderHours } from "../validation";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
      <IconAlertCircle size={13} className="shrink-0" />
      {message}
    </p>
  );
}

interface NotificationsQueueTabProps {
  orgId: Id<"orgs">;
  initialData: {
    smsEnabled: boolean;
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    reminderHoursBefore: number[];
    dashboardNotificationsEnabled: boolean;
    dashboardSoundEnabled: boolean;
    dashboardToastEnabled: boolean;
  };
}

export function NotificationsQueueTab({ orgId, initialData }: NotificationsQueueTabProps) {
  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const [notifications, setNotifications] = useState({
    smsEnabled: initialData.smsEnabled,
    emailEnabled: initialData.emailEnabled,
    whatsappEnabled: initialData.whatsappEnabled,
    reminderHoursStr: initialData.reminderHoursBefore.join(","),
  });
  const [dashboardNotifs, setDashboardNotifs] = useState({
    dashboardNotificationsEnabled: initialData.dashboardNotificationsEnabled,
    dashboardSoundEnabled: initialData.dashboardSoundEnabled,
    dashboardToastEnabled: initialData.dashboardToastEnabled,
  });
  const [reminderError, setReminderError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotifications({
      smsEnabled: initialData.smsEnabled,
      emailEnabled: initialData.emailEnabled,
      whatsappEnabled: initialData.whatsappEnabled,
      reminderHoursStr: initialData.reminderHoursBefore.join(","),
    });
    setDashboardNotifs({
      dashboardNotificationsEnabled: initialData.dashboardNotificationsEnabled,
      dashboardSoundEnabled: initialData.dashboardSoundEnabled,
      dashboardToastEnabled: initialData.dashboardToastEnabled,
    });
  }, [
    initialData.smsEnabled,
    initialData.emailEnabled,
    initialData.whatsappEnabled,
    initialData.reminderHoursBefore,
    initialData.dashboardNotificationsEnabled,
    initialData.dashboardSoundEnabled,
    initialData.dashboardToastEnabled,
  ]);

  const updateNotificationSettings = useMutation(api.orgSettings.updateNotificationSettings);
  const updateDashboardNotificationSettings = useMutation(
    api.orgSettings.updateDashboardNotificationSettings,
  );

  const handleSave = async () => {
    const arr = parseReminderHours(notifications.reminderHoursStr);
    if (!arr) {
      setReminderError("Enter one or more positive whole numbers separated by commas (e.g. 24, 2).");
      return;
    }
    setReminderError(undefined);
    setIsSaving(true);
    try {
      await updateNotificationSettings({
        orgId,
        smsEnabled: notifications.smsEnabled,
        emailEnabled: notifications.emailEnabled,
        whatsappEnabled: notifications.whatsappEnabled,
        reminderHoursBefore: arr,
      });
      await updateDashboardNotificationSettings({
        orgId,
        dashboardNotificationsEnabled: dashboardNotifs.dashboardNotificationsEnabled,
        dashboardSoundEnabled: dashboardNotifs.dashboardSoundEnabled,
        dashboardToastEnabled: dashboardNotifs.dashboardToastEnabled,
      });
      if (isMounted.current) toast.success("Notification settings saved");
    } catch (e: any) {
      if (isMounted.current) toast.error(e.message ?? "Failed to save notification settings.");
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent
      value="notifications"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
        <div className="mb-8">
          <h2 className="text-2xl font-medium tracking-tight mb-1">Outbound Notifications</h2>
          <p className="text-muted-foreground">
            Choose how and when customers receive booking alerts.
          </p>
        </div>
        <div className="space-y-10">
          <div className="divide-y divide-border/50 border border-border/60 rounded-xl overflow-hidden">
            {([
              { id: "sms-enabled",      label: "SMS Text Messages",     desc: "Send confirmation and reminder texts to customers",      key: "smsEnabled" as const },
              { id: "email-enabled",     label: "Email Inboxes",          desc: "Deliver booking receipts and reminders via email",        key: "emailEnabled" as const },
              { id: "whatsapp-enabled",  label: "WhatsApp Business (Meta)", desc: "Reach customers through WhatsApp for confirmations",    key: "whatsappEnabled" as const },
            ]).map(({ id, label, desc, key }) => (
              <div key={id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <div>
                  <Label htmlFor={id} className="select-none font-medium cursor-pointer">{label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <Switch
                  id={id}
                  checked={notifications[key]}
                  onCheckedChange={(c) => setNotifications({ ...notifications, [key]: c })}
                />
              </div>
            ))}
          </div>
          <div className="grid gap-2 mt-2 max-w-xl">
            <Label htmlFor="reminder-hours">
              Send reminders before appointment{" "}
              <span className="text-muted-foreground font-normal ml-1">
                (hours, comma-separated)
              </span>
            </Label>
            <DebouncedInput
              id="reminder-hours"
              value={notifications.reminderHoursStr}
              maxLength={64}
              aria-describedby={reminderError ? "reminder-hours-error" : "reminder-hours-hint"}
              aria-invalid={!!reminderError}
              onChange={(val) => {
                setNotifications({ ...notifications, reminderHoursStr: val });
                reminderError && setReminderError(undefined);
              }}
              placeholder="e.g. 24, 2"
              className={cn("bg-white", reminderError && "border-destructive")}
            />
            {!reminderError && (
              <p id="reminder-hours-hint" className="text-xs text-muted-foreground">
                Enter one or more numbers, e.g. <span className="font-mono">24, 2</span> sends reminders 24 hours and 2 hours before the appointment.
              </p>
            )}
            {reminderError && (
              <p id="reminder-hours-error" role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                <IconAlertCircle size={13} className="shrink-0" />
                {reminderError}
              </p>
            )}
          </div>
        </div>
        <div className="mt-10 pt-6 flex">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <IconDeviceFloppy size={18} />
            {isSaving ? "Saving…" : "Save Notification Settings"}
          </Button>
        </div>
      </div>

      {/* ── Dashboard Alerts ── */}
      <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
        <div className="mb-8">
          <h2 className="text-2xl font-medium tracking-tight mb-1">Dashboard Alerts</h2>
          <p className="text-muted-foreground">
            Control in-app notifications shown in your dashboard navbar.
          </p>
        </div>
        <div className="space-y-10">
          {/* Master toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Dashboard Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Show real-time alerts in the notification bell when new bookings, cancellations,
                or no-shows occur.
              </p>
            </div>
            <Switch
              id="dashboard-notifications-enabled"
              checked={dashboardNotifs.dashboardNotificationsEnabled}
              onCheckedChange={(c) =>
                setDashboardNotifs({ ...dashboardNotifs, dashboardNotificationsEnabled: c })
              }
            />
          </div>

          {dashboardNotifs.dashboardNotificationsEnabled && (
            <div className="divide-y divide-border/50 border border-border/60 rounded-xl overflow-hidden">
              {([
                { id: "dashboard-sound-enabled", label: "Sound",       desc: "Play a chime when a new notification arrives.",                          key: "dashboardSoundEnabled" as const },
                { id: "dashboard-toast-enabled", label: "Toast Popup",  desc: "Show a brief popup card beneath the bell with notification details.",   key: "dashboardToastEnabled" as const },
              ]).map(({ id, label, desc, key }) => (
                <div key={id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <Switch
                    id={id}
                    checked={dashboardNotifs[key]}
                    onCheckedChange={(c) => setDashboardNotifs({ ...dashboardNotifs, [key]: c })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-10 pt-6 flex">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <IconDeviceFloppy size={18} />
            {isSaving ? "Saving…" : "Save Alert Settings"}
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
