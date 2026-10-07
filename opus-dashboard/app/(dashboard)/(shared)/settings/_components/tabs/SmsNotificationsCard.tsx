"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReminderTimesField } from "@/components/notifications/ReminderTimesField";
import { ProFeatureNotice } from "@/components/billing/ProFeatureNotice";
import { useSettingsDraft } from "@/hooks/use-settings-draft";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  SettingsCard,
  SettingsToggleRow,
} from "@/components/settings/SettingsCard";

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
  const { draft, setDraft, isDirty } = useSettingsDraft({
    enabled: initialEnabled,
    hours: initialReminderHours,
  });
  const { enabled, hours } = draft;
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const update = useMutation(api.orgSettings.updateSmsNotificationSettings);

  async function save() {
    const reminderHours = hours;
    setSaving(true);
    try {
      await update({
        orgId,
        smsEnabled: enabled,
        smsReminderHoursBefore: reminderHours,
      });
      toast.success(
        t(
          "SMS settings saved",
          "Поставките за SMS се зачувани",
          "Cilësimet e SMS u ruajtën",
        ),
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : t(
              "Could not save SMS settings.",
              "Не успеа зачувувањето на поставките за SMS.",
              "Nuk mund të ruheshin cilësimet e SMS.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isPaid)
    return (
      <ProFeatureNotice
        title={t("SMS notifications", "SMS известувања", "Njoftimet me SMS")}
        description={t(
          "Client confirmations, changes and reminders by SMS are included in Pro after activation.",
          "SMS потврди, промени и потсетници се дел од Pro по активирање.",
          "Konfirmimet, ndryshimet dhe kujtesat me SMS përfshihen në Pro pas aktivizimit.",
        )}
        actionLabel={t("View Pro", "Погледни Pro", "Shiko Pro")}
      />
    );
  return (
    <SettingsCard
      title={t("SMS notifications", "SMS известувања", "Njoftimet me SMS")}
      action={
        !isPaid && (
          <Badge data-replay-public variant="pro">
            Pro
          </Badge>
        )
      }
      description={t(
        "Send clients appointment confirmations, changes, cancellations, and reminders by SMS.",
        "Испраќајте SMS потврди, промени, откажувања и потсетници за термините на клиентите.",
        "Dërgoni konfirmime, ndryshime, anulime dhe kujtesa të termineve për klientët me SMS.",
      )}
      contentClassName="flex flex-col gap-5"
      footer={
        isPaid && (
          <Button
            onClick={save}
            disabled={saving || !isDirty || (enabled && !available)}
          >
            {saving && <Spinner data-icon="inline-start" />}
            {saving
              ? t("Saving…", "Се зачувува…", "Po ruhet…")
              : t(
                  "Save SMS settings",
                  "Зачувај поставки за SMS",
                  "Ruaj cilësimet e SMS",
                )}
          </Button>
        )
      }
    >
      {!isPaid ? (
        <p data-replay-public className="text-sm text-muted-foreground">
          {t(
            "SMS notifications are included in Pro. Contact OPUS to upgrade and activate them for your studio.",
            "SMS известувањата се дел од Pro. Контактирајте нè за надградба и активирање за вашето студио.",
            "Njoftimet me SMS përfshihen në Pro. Kontaktoni me OPUS për ta përmirësuar dhe aktivizuar për studion tuaj.",
          )}
        </p>
      ) : (
        !available && (
          <p data-replay-public className="text-sm text-muted-foreground">
            {t(
              "SMS delivery is awaiting activation. Contact OPUS to enable it for your studio.",
              "Испраќањето SMS чека активирање. Контактирајте нè за да го овозможиме за вашето студио.",
              "Dërgimi i SMS-ve po pret aktivizimin. Kontaktoni me OPUS për ta mundësuar për studion tuaj.",
            )}
          </p>
        )
      )}
      <SettingsToggleRow
        title={t(
          "Client SMS notifications",
          "SMS известувања за клиенти",
          "Njoftimet me SMS për klientët",
        )}
        description={t(
          "Uses the phone number saved with the appointment. Email settings stay independent.",
          "Го користи телефонскиот број зачуван со терминот. Поставките за е-пошта се независни.",
          "Përdor numrin e telefonit të ruajtur me terminin. Cilësimet e email-it mbeten të pavarura.",
        )}
        control={
          <Switch
            id="client-sms-enabled"
            aria-label={t(
              "Client SMS notifications",
              "SMS известувања за клиенти",
              "Njoftimet me SMS për klientët",
            )}
            checked={isPaid && enabled}
            disabled={saving || !isPaid || (!available && !enabled)}
            onCheckedChange={(value) =>
              setDraft((current) => ({ ...current, enabled: value }))
            }
          />
        }
      />
      {isPaid && enabled && (
        <ReminderTimesField
          id="sms-reminder"
          hours={hours}
          savedHours={initialReminderHours}
          onChange={(value) => {
            setDraft((current) => ({ ...current, hours: value }));
            setError(undefined);
          }}
          disabled={saving}
          error={error}
          allowEmpty
        />
      )}
    </SettingsCard>
  );
}
