"use client";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ReminderTimesField({
  id,
  hours,
  savedHours,
  onChange,
  disabled,
  error,
  allowEmpty = false,
}: {
  id: string;
  hours: number[];
  savedHours: number[];
  onChange: (hours: number[]) => void;
  disabled?: boolean;
  error?: string;
  allowEmpty?: boolean;
}) {
  const { t } = useDashboardI18n();
  // Custom schedules saved by older clients remain visible and selectable.
  const options = [...new Set([24, 3, 2, 1, ...savedHours, ...hours])].sort(
    (a, b) => b - a,
  );
  return (
    <Field data-disabled={disabled} data-invalid={Boolean(error)}>
      <FieldLabel id={`${id}-label`}>
        {t("Before the appointment", "Пред терминот", "Para terminit")}
      </FieldLabel>
      <ToggleGroup
        type="multiple"
        variant="outline"
        spacing={2}
        value={hours.map(String)}
        disabled={disabled}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-help`}
        aria-invalid={Boolean(error)}
        className="flex-wrap"
        onValueChange={(values) =>
          onChange(values.map(Number).sort((a, b) => b - a))
        }
      >
        {options.map((hour) => (
          <ToggleGroupItem
            key={hour}
            value={String(hour)}
            disabled={hours.length >= 8 && !hours.includes(hour)}
          >
            {hour === 24
              ? t("1 day", "1 ден", "1 ditë")
              : t(
                  `${hour} ${hour === 1 ? "hour" : "hours"}`,
                  `${hour} ${hour === 1 ? "час" : "часа"}`,
                  `${hour} orë`,
                )}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <FieldDescription id={`${id}-help`}>
        {allowEmpty
          ? t(
              "Choose reminder times, or select none for confirmations and updates only.",
              "Изберете времиња за потсетување, или ниту едно за само потврди и промени.",
              "Zgjidhni kohët e kujtesave, ose asnjë për vetëm konfirmime dhe ndryshime.",
            )
          : t(
              "A reminder is sent at each selected time.",
              "За секое избрано време се испраќа потсетник.",
              "Një kujtesë dërgohet në çdo kohë të zgjedhur.",
            )}
      </FieldDescription>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
