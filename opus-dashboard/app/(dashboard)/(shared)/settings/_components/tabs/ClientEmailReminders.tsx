"use client";

import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ReminderTimesField } from "@/components/notifications/ReminderTimesField";
import { SettingsToggleRow } from "@/components/settings/SettingsCard";

export function ClientEmailReminders({
  isPaid,
  enabled,
  hours,
  savedHours,
  saving,
  error,
  onEnabledChange,
  onHoursChange,
}: {
  isPaid: boolean;
  enabled: boolean;
  hours: number[];
  savedHours: number[];
  saving: boolean;
  error?: string;
  onEnabledChange: (enabled: boolean) => void;
  onHoursChange: (hours: number[]) => void;
}) {
  const { t } = useDashboardI18n();
  const disabled = !isPaid || !enabled || saving;
  return (
    <div className="flex flex-col gap-5">
      <SettingsToggleRow
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {t(
              "Client email reminders",
              "Потсетници за клиенти по е-пошта",
              "Kujtesa me email për klientët",
            )}
            {!isPaid && (
              <Badge data-replay-public variant="pro">
                Pro
              </Badge>
            )}
          </span>
        }
        description={
          isPaid
            ? t(
                "Email clients before their confirmed appointments.",
                "Испраќајте е-пошта на клиентите пред потврдените термини.",
                "Dërgoni email klientëve para termineve të tyre të konfirmuara.",
              )
            : t(
                "Upgrade to Pro to send clients appointment reminders by email.",
                "Надградете на Pro за да испраќате потсетници за термини по е-пошта.",
                "Përmirësoni në Pro për t'u dërguar klientëve kujtesa të termineve me email.",
              )
        }
        control={
          <Switch
            id="customer-reminder-email-enabled"
            aria-label={t(
              "Client reminder emails",
              "Е-пораки за потсетување на клиенти",
              "Email kujtues për klientët",
            )}
            checked={isPaid && enabled}
            disabled={!isPaid || saving}
            onCheckedChange={onEnabledChange}
          />
        }
      />
      {enabled && (
        <ReminderTimesField
          id="client-email-reminder"
          hours={hours}
          savedHours={savedHours}
          onChange={onHoursChange}
          disabled={disabled}
          error={error}
        />
      )}
    </div>
  );
}
