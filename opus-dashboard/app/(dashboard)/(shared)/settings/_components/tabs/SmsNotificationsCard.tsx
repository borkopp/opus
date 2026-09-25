"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { SettingsCard, SettingsToggleRow } from "../SettingsCard";
import { parseReminderHours } from "../validation";

export function SmsNotificationsCard({
  orgId,
  isPaid,
  available,
  initialEnabled,
  initialReminderHours,
}: {
  orgId: Id<"orgs">;
  isPaid: boolean;
  available: boolean;
  initialEnabled: boolean;
  initialReminderHours: number[];
}) {
  const { t } = useDashboardI18n();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [hours, setHours] = useState(initialReminderHours.join(", "));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const update = useMutation(api.orgSettings.updateSmsNotificationSettings);

  async function save() {
    const reminderHours = parseReminderHours(hours);
    if (!reminderHours) {
      setError(
        t(
          "Enter up to eight whole-hour reminders between 1 and 336, such as 24, 2.",
          "Внесете до осум потсетници во цели часови помеѓу 1 и 336, на пример 24, 2.",
        ),
      );
      return;
    }
    setSaving(true);
    try {
      await update({
        orgId,
        smsEnabled: enabled,
        smsReminderHoursBefore: reminderHours,
      });
      toast.success(t("SMS settings saved", "Поставките за SMS се зачувани"));
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : t(
              "Could not save SMS settings.",
              "Не успеа зачувувањето на поставките за SMS.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard
      title={t("SMS notifications", "SMS известувања")}
      action={!isPaid && <Badge variant="pro">Pro</Badge>}
      description={t(
        "Send clients appointment confirmations, changes, cancellations, and reminders by SMS.",
        "Испраќајте SMS потврди, промени, откажувања и потсетници за термините на клиентите.",
      )}
      contentClassName="flex flex-col gap-5"
      footer={
        isPaid && (
          <Button onClick={save} disabled={saving || (enabled && !available)}>
            {saving && <Spinner data-icon="inline-start" />}
            {saving
              ? t("Saving…", "Се зачувува…")
              : t("Save SMS settings", "Зачувај поставки за SMS")}
          </Button>
        )
      }
    >
      {!isPaid ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "SMS notifications are included in Pro. Contact OPUS to upgrade and activate them for your studio.",
            "SMS известувањата се дел од Pro. Контактирајте нè за надградба и активирање за вашето студио.",
          )}
        </p>
      ) : (
        !available && (
          <p className="text-sm text-muted-foreground">
            {t(
              "SMS delivery is awaiting activation. Contact OPUS to enable it for your studio.",
              "Испраќањето SMS чека активирање. Контактирајте нè за да го овозможиме за вашето студио.",
            )}
          </p>
        )
      )}
      <SettingsToggleRow
        title={t("Client SMS notifications", "SMS известувања за клиенти")}
        description={t(
          "Uses the phone number saved with the appointment. Email settings stay independent.",
          "Го користи телефонскиот број зачуван со терминот. Поставките за е-пошта се независни.",
        )}
        control={
          <Switch
            id="client-sms-enabled"
            aria-label={t(
              "Client SMS notifications",
              "SMS известувања за клиенти",
            )}
            checked={isPaid && enabled}
            disabled={saving || !isPaid || (!available && !enabled)}
            onCheckedChange={setEnabled}
          />
        }
      />
      {isPaid && enabled && (
        <FieldGroup className="max-w-xl">
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="sms-reminder-hours">
              {t(
                "SMS reminder schedule (hours before)",
                "Распоред за SMS потсетници (часови однапред)",
              )}
            </FieldLabel>
            <Input
              id="sms-reminder-hours"
              value={hours}
              disabled={saving}
              maxLength={64}
              placeholder="24, 2"
              aria-invalid={Boolean(error)}
              aria-describedby="sms-reminder-description"
              onChange={(event) => {
                setHours(event.target.value);
                setError(undefined);
              }}
            />
            <FieldDescription id="sms-reminder-description">
              {t(
                "For example, 24, 2 sends reminders a day and two hours before. Leave empty to send only confirmations and appointment updates.",
                "На пример, 24, 2 испраќа потсетници еден ден и два часа однапред. Оставете празно за да испраќате само потврди и промени на термините.",
              )}
            </FieldDescription>
            <FieldError>{error}</FieldError>
          </Field>
        </FieldGroup>
      )}
    </SettingsCard>
  );
}
