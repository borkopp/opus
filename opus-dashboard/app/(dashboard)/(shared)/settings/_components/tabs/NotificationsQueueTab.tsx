"use client";

import { useState, useEffect, useRef } from "react";
import { CircleAlert, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { parseReminderHours } from "../validation";
import { SettingsCard, SettingsToggleRow } from "../SettingsCard";

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
    } catch (error) {
      if (isMounted.current) {
        toast.error(error instanceof Error ? error.message : "Failed to save notification settings.");
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent
      value="notifications"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <SettingsCard
        title="Notifications"
        description="Choose how customers receive booking updates and how your team is alerted inside OPUS."
        contentClassName="flex flex-col gap-7"
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Spinner /> : <Save />}
            {isSaving ? "Saving…" : "Save notification settings"}
          </Button>
        }
      >
          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold">Customer messages</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Confirmations and reminders sent before an appointment.
              </p>
            </div>
            <div className="flex flex-col gap-3">
            {([
              { id: "sms-enabled", label: "SMS", desc: "Send confirmations and reminder texts.", key: "smsEnabled" as const },
              { id: "email-enabled", label: "Email", desc: "Deliver booking receipts and reminders by email.", key: "emailEnabled" as const },
              { id: "whatsapp-enabled", label: "WhatsApp", desc: "Reach customers through WhatsApp Business.", key: "whatsappEnabled" as const },
            ]).map(({ id, label, desc, key }) => (
              <SettingsToggleRow
                key={id}
                title={label}
                description={desc}
                control={<Switch
                  id={id}
                  checked={notifications[key]}
                  onCheckedChange={(c) => setNotifications({ ...notifications, [key]: c })}
                />}
              />
            ))}
            </div>
          <div className="grid gap-2 max-w-xl">
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
                if (reminderError) setReminderError(undefined);
              }}
              placeholder="e.g. 24, 2"
              className={cn(reminderError && "border-destructive")}
            />
            {!reminderError && (
              <p id="reminder-hours-hint" className="text-xs text-muted-foreground">
                Enter one or more numbers, e.g. <span className="font-mono">24, 2</span> sends reminders 24 hours and 2 hours before the appointment.
              </p>
            )}
            {reminderError && (
              <p id="reminder-hours-error" role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                <CircleAlert className="shrink-0" />
                {reminderError}
              </p>
            )}
          </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold">Dashboard alerts</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Real-time feedback for the team working inside OPUS.
              </p>
            </div>
          <SettingsToggleRow
            title="In-app notifications"
            description="Show new bookings, cancellations, and no-shows in the notification bell."
            control={<Switch
              id="dashboard-notifications-enabled"
              checked={dashboardNotifs.dashboardNotificationsEnabled}
              onCheckedChange={(c) =>
                setDashboardNotifs({ ...dashboardNotifs, dashboardNotificationsEnabled: c })
              }
            />}
          />

          {dashboardNotifs.dashboardNotificationsEnabled && (
            <div className="flex flex-col gap-3">
              {([
                { id: "dashboard-sound-enabled", label: "Sound", desc: "Play a chime when a new notification arrives.", key: "dashboardSoundEnabled" as const },
                { id: "dashboard-toast-enabled", label: "Toast preview", desc: "Show a brief notification card beneath the bell.", key: "dashboardToastEnabled" as const },
              ]).map(({ id, label, desc, key }) => (
                <SettingsToggleRow
                  key={id}
                  title={label}
                  description={desc}
                  control={<Switch
                    id={id}
                    checked={dashboardNotifs[key]}
                    onCheckedChange={(c) => setDashboardNotifs({ ...dashboardNotifs, [key]: c })}
                  />}
                />
              ))}
            </div>
          )}
          </section>
      </SettingsCard>
    </TabsContent>
  );
}
