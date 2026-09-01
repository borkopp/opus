"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { MailCheck, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DebouncedInput } from "@/components/ui/debounced-input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import {
  SettingsCard,
  SettingsSection,
  SettingsToggleRow,
} from "../SettingsCard";
import { parseReminderHours } from "../validation";

type EmailRecipient = {
  userId: Id<"users">;
  staffId: Id<"staff_members">;
  name: string;
  email: string;
  role: "owner" | "manager" | "staff";
};

interface NotificationsQueueTabProps {
  orgId: Id<"orgs">;
  initialData: {
    emailEnabled: boolean;
    reminderHoursBefore: number[];
    staffNewBookingEmailEnabled: boolean;
    staffReminderEmailEnabled: boolean;
    staffReminderHoursBefore: number[];
    staffEmailRecipientUserIds: Id<"users">[];
    emailRecipients: EmailRecipient[];
    dashboardNotificationsEnabled: boolean;
    dashboardSoundEnabled: boolean;
    dashboardToastEnabled: boolean;
  };
}

const DASHBOARD_OPTIONS = [
  {
    id: "dashboard-sound-enabled",
    label: "Sound",
    description: "Play a chime when a new notification arrives.",
    key: "dashboardSoundEnabled",
  },
  {
    id: "dashboard-toast-enabled",
    label: "Toast preview",
    description: "Show a brief notification card beneath the bell.",
    key: "dashboardToastEnabled",
  },
] as const;

const ROLE_LABELS: Record<EmailRecipient["role"], string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

export function NotificationsQueueTab({
  orgId,
  initialData,
}: NotificationsQueueTabProps) {
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [email, setEmail] = useState({
    customerReminderEmailEnabled: initialData.emailEnabled,
    customerReminderHours: initialData.reminderHoursBefore.join(", "),
    staffNewBookingEmailEnabled: initialData.staffNewBookingEmailEnabled,
    staffReminderEmailEnabled: initialData.staffReminderEmailEnabled,
    staffReminderHours: initialData.staffReminderHoursBefore.join(", "),
    staffEmailRecipientUserIds: initialData.staffEmailRecipientUserIds,
  });
  const [dashboard, setDashboard] = useState({
    dashboardNotificationsEnabled: initialData.dashboardNotificationsEnabled,
    dashboardSoundEnabled: initialData.dashboardSoundEnabled,
    dashboardToastEnabled: initialData.dashboardToastEnabled,
  });
  const [customerReminderError, setCustomerReminderError] = useState<string>();
  const [staffReminderError, setStaffReminderError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEmail({
      customerReminderEmailEnabled: initialData.emailEnabled,
      customerReminderHours: initialData.reminderHoursBefore.join(", "),
      staffNewBookingEmailEnabled: initialData.staffNewBookingEmailEnabled,
      staffReminderEmailEnabled: initialData.staffReminderEmailEnabled,
      staffReminderHours: initialData.staffReminderHoursBefore.join(", "),
      staffEmailRecipientUserIds: initialData.staffEmailRecipientUserIds,
    });
    setDashboard({
      dashboardNotificationsEnabled: initialData.dashboardNotificationsEnabled,
      dashboardSoundEnabled: initialData.dashboardSoundEnabled,
      dashboardToastEnabled: initialData.dashboardToastEnabled,
    });
  }, [initialData]);

  const updateEmailNotificationSettings = useMutation(
    api.orgSettings.updateEmailNotificationSettings,
  );
  const updateDashboardNotificationSettings = useMutation(
    api.orgSettings.updateDashboardNotificationSettings,
  );

  const handleSave = async () => {
    const customerReminderHours = parseReminderHours(
      email.customerReminderHours,
    );
    const staffReminderHours = parseReminderHours(email.staffReminderHours);
    let invalid = false;
    if (
      !customerReminderHours ||
      (email.customerReminderEmailEnabled && customerReminderHours.length === 0)
    ) {
      setCustomerReminderError(
        "Enter up to eight whole-hour reminders between 1 and 336, such as 24, 2.",
      );
      invalid = true;
    } else {
      setCustomerReminderError(undefined);
    }
    if (
      !staffReminderHours ||
      (email.staffReminderEmailEnabled && staffReminderHours.length === 0)
    ) {
      setStaffReminderError(
        "Enter up to eight whole-hour reminders between 1 and 336, such as 24, 2.",
      );
      invalid = true;
    } else {
      setStaffReminderError(undefined);
    }
    if (invalid || !customerReminderHours || !staffReminderHours) return;

    setIsSaving(true);
    try {
      await updateEmailNotificationSettings({
        orgId,
        customerReminderEmailEnabled: email.customerReminderEmailEnabled,
        customerReminderHoursBefore: customerReminderHours,
        staffNewBookingEmailEnabled: email.staffNewBookingEmailEnabled,
        staffReminderEmailEnabled: email.staffReminderEmailEnabled,
        staffReminderHoursBefore: staffReminderHours,
        staffEmailRecipientUserIds: email.staffEmailRecipientUserIds,
      });
      await updateDashboardNotificationSettings({ orgId, ...dashboard });
      if (isMounted.current) toast.success("Email and alert settings saved");
    } catch (error) {
      if (isMounted.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to save email settings.",
        );
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent value="notifications" className="m-0">
      <SettingsCard
        title="Email & alerts"
        description="Keep clients verified and informed, then decide exactly which dashboard users hear about new and upcoming appointments."
        contentClassName="flex flex-col gap-7"
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {isSaving ? "Saving…" : "Save email settings"}
          </Button>
        }
      >
        <SettingsSection
          title="Client journey"
          description="Verification and confirmation are transactional parts of online booking, so clients cannot switch them off."
        >
          <div className="flex flex-col gap-3">
            <SettingsToggleRow
              title="Email verification code"
              description="Confirms that the client owns the email address before the appointment is created."
              control={
                <Badge variant="secondary">
                  <ShieldCheck data-icon="inline-start" />
                  Required
                </Badge>
              }
            />
            <SettingsToggleRow
              title="Appointment confirmation"
              description="Sends the appointment overview, calendar file, directions, and studio contact actions."
              control={
                <Badge variant="secondary">
                  <MailCheck data-icon="inline-start" />
                  Always on
                </Badge>
              }
            />
            <SettingsToggleRow
              title="Client reminders"
              description="Email clients before confirmed appointments using the schedule below."
              control={
                <Switch
                  id="customer-reminder-email-enabled"
                  aria-label="Client reminder emails"
                  checked={email.customerReminderEmailEnabled}
                  onCheckedChange={(checked) =>
                    setEmail((current) => ({
                      ...current,
                      customerReminderEmailEnabled: checked,
                    }))
                  }
                />
              }
            />
          </div>

          {email.customerReminderEmailEnabled && (
            <FieldGroup className="max-w-xl">
              <Field data-invalid={Boolean(customerReminderError)}>
                <FieldLabel htmlFor="customer-reminder-hours">
                  Client reminder schedule (hours before)
                </FieldLabel>
                <DebouncedInput
                  id="customer-reminder-hours"
                  value={email.customerReminderHours}
                  maxLength={64}
                  aria-describedby="customer-reminder-description"
                  aria-invalid={Boolean(customerReminderError)}
                  onChange={(value) => {
                    setEmail((current) => ({
                      ...current,
                      customerReminderHours: value,
                    }));
                    setCustomerReminderError(undefined);
                  }}
                  placeholder="24, 2"
                />
                <FieldDescription id="customer-reminder-description">
                  For example, 24, 2 sends one email a day before and another
                  two hours before.
                </FieldDescription>
                <FieldError>{customerReminderError}</FieldError>
              </Field>
            </FieldGroup>
          )}
        </SettingsSection>

        <Separator />

        <SettingsSection
          title="Team email"
          description="Choose which appointment events are emailed to assigned staff and additional dashboard recipients."
        >
          <div className="flex flex-col gap-3">
            <SettingsToggleRow
              title="New appointments"
              description="Email the assigned staff when an appointment is added. Selected dashboard recipients also receive new online bookings."
              control={
                <Switch
                  id="staff-new-booking-email-enabled"
                  aria-label="New booking emails"
                  checked={email.staffNewBookingEmailEnabled}
                  onCheckedChange={(checked) =>
                    setEmail((current) => ({
                      ...current,
                      staffNewBookingEmailEnabled: checked,
                    }))
                  }
                />
              }
            />
            <SettingsToggleRow
              title="Upcoming appointment reminders"
              description="Email assigned staff and selected dashboard recipients before confirmed appointments."
              control={
                <Switch
                  id="staff-reminder-email-enabled"
                  aria-label="Team appointment reminders"
                  checked={email.staffReminderEmailEnabled}
                  onCheckedChange={(checked) =>
                    setEmail((current) => ({
                      ...current,
                      staffReminderEmailEnabled: checked,
                    }))
                  }
                />
              }
            />
          </div>

          {email.staffReminderEmailEnabled && (
            <FieldGroup className="max-w-xl">
              <Field data-invalid={Boolean(staffReminderError)}>
                <FieldLabel htmlFor="staff-reminder-hours">
                  Team reminder schedule (hours before)
                </FieldLabel>
                <DebouncedInput
                  id="staff-reminder-hours"
                  value={email.staffReminderHours}
                  maxLength={64}
                  aria-describedby="staff-reminder-description"
                  aria-invalid={Boolean(staffReminderError)}
                  onChange={(value) => {
                    setEmail((current) => ({
                      ...current,
                      staffReminderHours: value,
                    }));
                    setStaffReminderError(undefined);
                  }}
                  placeholder="24, 2"
                />
                <FieldDescription id="staff-reminder-description">
                  This schedule is independent from the client reminder
                  schedule.
                </FieldDescription>
                <FieldError>{staffReminderError}</FieldError>
              </Field>
            </FieldGroup>
          )}

          <FieldSet>
            <FieldLegend variant="label">
              Additional dashboard recipients
            </FieldLegend>
            <FieldDescription>
              Staff with an appointment email receive only their assigned
              appointments. Select dashboard users here if they should also
              receive studio-wide team emails.
            </FieldDescription>
            <FieldGroup data-slot="checkbox-group">
              {initialData.emailRecipients.map((recipient) => {
                const id = `email-recipient-${recipient.userId}`;
                const checked = email.staffEmailRecipientUserIds.includes(
                  recipient.userId,
                );
                return (
                  <Field
                    key={recipient.userId}
                    orientation="horizontal"
                    variant="surface"
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={(nextChecked) => {
                        setEmail((current) => ({
                          ...current,
                          staffEmailRecipientUserIds: nextChecked
                            ? Array.from(
                                new Set([
                                  ...current.staffEmailRecipientUserIds,
                                  recipient.userId,
                                ]),
                              )
                            : current.staffEmailRecipientUserIds.filter(
                                (userId) => userId !== recipient.userId,
                              ),
                        }));
                      }}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor={id}>
                        {recipient.name}
                        <Badge variant="outline">
                          {ROLE_LABELS[recipient.role]}
                        </Badge>
                      </FieldLabel>
                      <FieldDescription>{recipient.email}</FieldDescription>
                    </FieldContent>
                  </Field>
                );
              })}
            </FieldGroup>
            {initialData.emailRecipients.length === 0 && (
              <FieldDescription>
                There are no active dashboard users to add. Appointment emails
                are linked from the Staff page.
              </FieldDescription>
            )}
          </FieldSet>
        </SettingsSection>

        <Separator />

        <SettingsSection
          title="Dashboard alerts"
          description="Control real-time feedback for staff working inside OPUS."
        >
          <SettingsToggleRow
            title="In-app notifications"
            description="Show new bookings, cancellations, and no-shows in the notification bell."
            control={
              <Switch
                id="dashboard-notifications-enabled"
                aria-label="In-app notifications"
                checked={dashboard.dashboardNotificationsEnabled}
                onCheckedChange={(checked) =>
                  setDashboard((current) => ({
                    ...current,
                    dashboardNotificationsEnabled: checked,
                  }))
                }
              />
            }
          />

          {dashboard.dashboardNotificationsEnabled && (
            <div className="flex flex-col gap-3">
              {DASHBOARD_OPTIONS.map(({ id, label, description, key }) => (
                <SettingsToggleRow
                  key={id}
                  title={label}
                  description={description}
                  control={
                    <Switch
                      id={id}
                      aria-label={label}
                      checked={dashboard[key]}
                      onCheckedChange={(checked) =>
                        setDashboard((current) => ({
                          ...current,
                          [key]: checked,
                        }))
                      }
                    />
                  }
                />
              ))}
            </div>
          )}
        </SettingsSection>
      </SettingsCard>
    </TabsContent>
  );
}
