"use client";

import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SettingsToggleRow } from "../SettingsCard";

const CLIENT_REMINDER_HOURS = [24, 3, 2, 1];

export function ClientEmailReminders({
  isPaid,
  enabled,
  hours,
  saving,
  error,
  onEnabledChange,
  onHoursChange,
}: {
  isPaid: boolean;
  enabled: boolean;
  hours: number[];
  saving: boolean;
  error?: string;
  onEnabledChange: (enabled: boolean) => void;
  onHoursChange: (hours: number[]) => void;
}) {
  const { t } = useDashboardI18n();
  const disabled = !isPaid || !enabled || saving;
  // Keep any previously saved custom times visible until the owner removes
  // them. Saving unrelated settings must not silently change the schedule.
  const hourOptions = [...new Set([...CLIENT_REMINDER_HOURS, ...hours])].sort(
    (first, second) => second - first,
  );

  return (
    <div className="flex flex-col gap-5">
      <SettingsToggleRow
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {t("Client email reminders", "Потсетници за клиенти по е-пошта")}
            {!isPaid && <Badge variant="pro">Pro</Badge>}
          </span>
        }
        description={
          isPaid
            ? t(
                "Email clients before their confirmed appointments.",
                "Испраќајте е-пошта на клиентите пред потврдените термини.",
              )
            : t(
                "Upgrade to Pro to send clients appointment reminders by email.",
                "Надградете на Pro за да испраќате потсетници за термини по е-пошта.",
              )
        }
        control={
          <Switch
            id="customer-reminder-email-enabled"
            aria-label={t(
              "Client reminder emails",
              "Е-пораки за потсетување на клиенти",
            )}
            checked={isPaid && enabled}
            disabled={!isPaid || saving}
            onCheckedChange={onEnabledChange}
          />
        }
      />
      <FieldGroup className="max-w-xl">
        <Field data-disabled={disabled} data-invalid={Boolean(error)}>
          <FieldLabel id="customer-reminder-label">
            {t("Before the appointment", "Пред терминот")}
          </FieldLabel>
          <ToggleGroup
            type="multiple"
            variant="outline"
            size="lg"
            spacing={2}
            className="flex-wrap"
            aria-labelledby="customer-reminder-label"
            aria-describedby="customer-reminder-description customer-reminder-error"
            aria-invalid={Boolean(error)}
            disabled={disabled}
            value={hours.map(String)}
            onValueChange={(values) => onHoursChange(values.map(Number))}
          >
            {hourOptions.map((hoursBefore) => (
              <ToggleGroupItem
                key={hoursBefore}
                value={String(hoursBefore)}
                aria-label={t(
                  `${hoursBefore} ${hoursBefore === 1 ? "hour" : "hours"} before the appointment`,
                  `${hoursBefore} ${hoursBefore === 1 ? "час" : "часа"} пред терминот`,
                )}
              >
                {t(
                  `${hoursBefore} ${hoursBefore === 1 ? "hour" : "hours"}`,
                  `${hoursBefore} ${hoursBefore === 1 ? "час" : "часа"}`,
                )}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription id="customer-reminder-description">
            {t(
              "Select one or more times. A reminder is sent at each selected time.",
              "Изберете едно или повеќе времиња. За секое избрано време се испраќа потсетник.",
            )}
          </FieldDescription>
          <FieldError id="customer-reminder-error">{error}</FieldError>
        </Field>
      </FieldGroup>
    </div>
  );
}
