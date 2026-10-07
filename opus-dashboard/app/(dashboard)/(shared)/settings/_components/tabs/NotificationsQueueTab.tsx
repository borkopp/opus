"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useSettingsDraft } from "@/hooks/use-settings-draft";
import { useEmailNotificationSettings } from "@/hooks/use-email-notification-settings";
import { ProFeatureNotice } from "@/components/billing/ProFeatureNotice";
import { ReminderTimesField } from "@/components/notifications/ReminderTimesField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Disclosure } from "@/components/ui/disclosure";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import {
  SettingsCard,
  SettingsToggleRow,
} from "@/components/settings/SettingsCard";
import { SmsNotificationsCard } from "./SmsNotificationsCard";
import { ClientEmailReminders } from "./ClientEmailReminders";

type EmailRecipient = {
  userId: Id<"users">;
  staffId: Id<"staff_members">;
  name: string;
  email: string;
  role: "owner" | "manager" | "staff";
};

interface NotificationsQueueTabProps {
  orgId: Id<"orgs">;
  isPaid: boolean;
  smsAvailable: boolean;
  initialData: {
    smsEnabled: boolean;
    smsReminderHoursBefore: number[];
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

export function NotificationsQueueTab({
  orgId,
  isPaid,
  smsAvailable,
  initialData,
}: NotificationsQueueTabProps) {
  const { t } = useDashboardI18n();
  return (
    <TabsContent value="notifications" className="m-0 flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        {t(
          "These settings apply to your studio. ",
          "Овие поставки важат за студиото. ",
          "Këto cilësime vlejnë për studion. ",
        )}
        <Link
          className="underline underline-offset-4"
          href="/notifications/preferences"
        >
          {t(
            "Manage my personal alerts",
            "Уреди ги моите лични известувања",
            "Menaxho njoftimet e mia personale",
          )}
        </Link>
      </p>
      {isPaid ? (
        <ClientEmailSettings orgId={orgId} initialData={initialData} />
      ) : (
        <ProFeatureNotice
          title={t(
            "Client email reminders",
            "Потсетници за клиенти по е-пошта",
            "Kujtesa me email për klientët",
          )}
          description={t(
            "Appointment confirmations and email verification are included. Scheduled client reminders are available with Pro.",
            "Потврдите за термини и верификацијата се вклучени. Закажаните потсетници за клиенти се достапни со Pro.",
            "Konfirmimet dhe verifikimi me email përfshihen. Kujtesat e planifikuara për klientët janë në Pro.",
          )}
          actionLabel={t("View Pro", "Погледни Pro", "Shiko Pro")}
        />
      )}
      <SmsNotificationsCard
        orgId={orgId}
        isPaid={isPaid}
        available={smsAvailable}
        initialEnabled={initialData.smsEnabled}
        initialReminderHours={initialData.smsReminderHoursBefore}
      />
      <TeamEmailSettings orgId={orgId} initialData={initialData} />
      <DashboardAlertSettings orgId={orgId} initialData={initialData} />
    </TabsContent>
  );
}

type EmailSettingsProps = {
  orgId: Id<"orgs">;
  initialData: NotificationsQueueTabProps["initialData"];
};
function ClientEmailSettings({ orgId, initialData }: EmailSettingsProps) {
  const { t } = useDashboardI18n();
  const form = useEmailNotificationSettings(orgId, {
    customerReminderEmailEnabled: initialData.emailEnabled,
    customerReminderHoursBefore: initialData.reminderHoursBefore,
  });
  return (
    <SettingsCard
      title={t("Client email", "Е-пошта за клиенти", "Email për klientët")}
      description={t(
        "Email verification and appointment confirmations are always included.",
        "Верификацијата на е-пошта и потврдите за термини се секогаш вклучени.",
        "Verifikimi me email dhe konfirmimet e termineve përfshihen gjithmonë.",
      )}
      footer={
        <Button onClick={form.save} disabled={form.saving || !form.isDirty}>
          {form.saving && <Spinner data-icon="inline-start" />}
          {t(
            "Save client reminders",
            "Зачувај потсетници за клиенти",
            "Ruaj kujtesat për klientët",
          )}
        </Button>
      }
    >
      <ClientEmailReminders
        isPaid
        enabled={form.draft.customerReminderEmailEnabled}
        hours={form.draft.customerReminderHoursBefore}
        savedHours={initialData.reminderHoursBefore}
        saving={form.saving}
        error={form.error || undefined}
        onEnabledChange={(enabled) =>
          form.setDraft((current) => ({
            ...current,
            customerReminderEmailEnabled: enabled,
          }))
        }
        onHoursChange={(hours) =>
          form.setDraft((current) => ({
            ...current,
            customerReminderHoursBefore: hours,
          }))
        }
      />
      {form.error && !form.draft.customerReminderEmailEnabled && (
        <Alert variant="destructive">
          <AlertDescription>{form.error}</AlertDescription>
        </Alert>
      )}
    </SettingsCard>
  );
}

function TeamEmailSettings({ orgId, initialData }: EmailSettingsProps) {
  const { t } = useDashboardI18n();
  const form = useEmailNotificationSettings(orgId, {
    staffNewBookingEmailEnabled: initialData.staffNewBookingEmailEnabled,
    staffReminderEmailEnabled: initialData.staffReminderEmailEnabled,
    staffReminderHoursBefore: initialData.staffReminderHoursBefore,
    staffEmailRecipientUserIds: initialData.staffEmailRecipientUserIds,
  });
  return (
    <SettingsCard
      title={t("Team email", "Е-пошта за тимот", "Email për ekipin")}
      description={t(
        "Notify assigned staff about their appointments. You can also include additional studio recipients.",
        "Известете ги вработените за нивните термини. Можете да вклучите и дополнителни примачи од студиото.",
        "Njoftoni stafin për terminet e tyre. Mund të shtoni edhe marrës të tjerë të studios.",
      )}
      footer={
        <Button onClick={form.save} disabled={form.saving || !form.isDirty}>
          {form.saving && <Spinner data-icon="inline-start" />}
          {t(
            "Save team email",
            "Зачувај тимска е-пошта",
            "Ruaj email-in e ekipit",
          )}
        </Button>
      }
    >
      <fieldset disabled={form.saving} className="flex min-w-0 flex-col gap-5">
        <SettingsToggleRow
          title={t("New appointments", "Нови термини", "Termine të reja")}
          description={t(
            "Email assigned staff when an appointment is added. Additional recipients also receive new online bookings.",
            "Испраќајте е-пошта на вработениот при нов термин. Дополнителните примачи добиваат и нови онлајн закажувања.",
            "Dërgoni email stafit kur shtohet një termin. Marrësit shtesë marrin edhe rezervimet e reja online.",
          )}
          control={
            <Switch
              aria-label={t(
                "New appointment emails",
                "Е-пошта за нови термини",
                "Email për termine të reja",
              )}
              checked={form.draft.staffNewBookingEmailEnabled}
              onCheckedChange={(enabled) =>
                form.setDraft((current) => ({
                  ...current,
                  staffNewBookingEmailEnabled: enabled,
                }))
              }
            />
          }
        />
        <SettingsToggleRow
          title={t(
            "Upcoming appointment reminders",
            "Потсетници за претстојни термини",
            "Kujtesa për terminet e ardhshme",
          )}
          description={t(
            "Remind assigned staff and additional recipients before appointments.",
            "Потсетете ги вработените и дополнителните примачи пред термините.",
            "Kujtoni stafin dhe marrësit shtesë para termineve.",
          )}
          control={
            <Switch
              aria-label={t(
                "Team appointment reminders",
                "Тимски потсетници за термини",
                "Kujtesat e termineve për ekipin",
              )}
              checked={form.draft.staffReminderEmailEnabled}
              onCheckedChange={(enabled) =>
                form.setDraft((current) => ({
                  ...current,
                  staffReminderEmailEnabled: enabled,
                }))
              }
            />
          }
        />
        {form.draft.staffReminderEmailEnabled && (
          <ReminderTimesField
            id="team-reminder"
            hours={form.draft.staffReminderHoursBefore}
            savedHours={initialData.staffReminderHoursBefore}
            onChange={(hours) =>
              form.setDraft((current) => ({
                ...current,
                staffReminderHoursBefore: hours,
              }))
            }
          />
        )}
        <Disclosure
          title={t(
            "Additional email recipients",
            "Дополнителни примачи на е-пошта",
            "Marrës shtesë të email-it",
          )}
          description={t(
            "Choose who also receives studio-wide team emails.",
            "Изберете кој добива тимски е-пораки за целото студио.",
            "Zgjidhni kush merr edhe email-e për të gjithë studion.",
          )}
        >
          <FieldGroup>
            {initialData.emailRecipients.map((recipient) => (
              <Field key={recipient.userId} orientation="horizontal">
                <Checkbox
                  id={`email-recipient-${recipient.userId}`}
                  checked={form.draft.staffEmailRecipientUserIds.includes(
                    recipient.userId,
                  )}
                  onCheckedChange={(checked) =>
                    form.setDraft((current) => ({
                      ...current,
                      staffEmailRecipientUserIds:
                        checked === true
                          ? [
                              ...new Set([
                                ...current.staffEmailRecipientUserIds,
                                recipient.userId,
                              ]),
                            ]
                          : current.staffEmailRecipientUserIds.filter(
                              (id) => id !== recipient.userId,
                            ),
                    }))
                  }
                />
                <FieldContent>
                  <FieldLabel htmlFor={`email-recipient-${recipient.userId}`}>
                    {recipient.name}
                  </FieldLabel>
                  <FieldDescription>{recipient.email}</FieldDescription>
                </FieldContent>
              </Field>
            ))}
          </FieldGroup>
          {initialData.emailRecipients.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t(
                "No additional team accounts are available.",
                "Нема дополнителни тимски сметки.",
                "Nuk ka llogari të tjera të ekipit.",
              )}
            </p>
          )}
        </Disclosure>
        {form.error && (
          <Alert variant="destructive">
            <AlertDescription>{form.error}</AlertDescription>
          </Alert>
        )}
      </fieldset>
    </SettingsCard>
  );
}

function DashboardAlertSettings({ orgId, initialData }: EmailSettingsProps) {
  const { t } = useDashboardI18n();
  const form = useSettingsDraft({
    dashboardNotificationsEnabled: initialData.dashboardNotificationsEnabled,
    dashboardSoundEnabled: initialData.dashboardSoundEnabled,
    dashboardToastEnabled: initialData.dashboardToastEnabled,
  });
  const [saving, setSaving] = useState(false);
  const update = useMutation(
    api.orgSettings.updateDashboardNotificationSettings,
  );
  async function save() {
    setSaving(true);
    try {
      await update({ orgId, ...form.draft });
      toast.success(
        t(
          "Dashboard alerts saved",
          "Известувањата се зачувани",
          "Njoftimet u ruajtën",
        ),
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : t(
              "Could not save alerts.",
              "Известувањата не се зачувани.",
              "Njoftimet nuk mund të ruheshin.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }
  const options = [
    {
      key: "dashboardNotificationsEnabled",
      label: t(
        "Notification bell alerts",
        "Известувања во ѕвончето",
        "Njoftimet te zilja",
      ),
    },
    {
      key: "dashboardSoundEnabled",
      label: t("Play a sound", "Пушти звук", "Luaj tingull"),
    },
    {
      key: "dashboardToastEnabled",
      label: t(
        "Show a notification preview",
        "Прикажи преглед на известување",
        "Shfaq pamje paraprake të njoftimit",
      ),
    },
  ] as const;
  return (
    <Disclosure
      title={t(
        "Dashboard alerts",
        "Известувања на контролната табла",
        "Njoftimet në panel",
      )}
      description={t(
        "Studio-wide sound and notification previews while OPUS is open.",
        "Звук и преглед на известувања за студиото додека OPUS е отворен.",
        "Tinguj dhe pamje paraprake për studion kur OPUS është i hapur.",
      )}
    >
      <FieldGroup>
        {options.map(({ key, label }) => (
          <Field key={key} orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={`alert-${key}`}>{label}</FieldLabel>
            </FieldContent>
            <Switch
              id={`alert-${key}`}
              checked={form.draft[key]}
              disabled={saving}
              onCheckedChange={(enabled) =>
                form.setDraft((current) => ({ ...current, [key]: enabled }))
              }
            />
          </Field>
        ))}
      </FieldGroup>
      <Button
        onClick={save}
        disabled={saving || !form.isDirty}
        className="self-start"
      >
        {saving && <Spinner data-icon="inline-start" />}
        {t("Save dashboard alerts", "Зачувај известувања", "Ruaj njoftimet")}
      </Button>
    </Disclosure>
  );
}
