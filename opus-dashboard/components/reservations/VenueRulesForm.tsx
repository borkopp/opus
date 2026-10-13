"use client";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible } from "radix-ui";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useMutation } from "convex/react";
import type { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useReservationAction } from "@/hooks/use-reservation-action";
import { ReservationError, ReservationInput } from "./ReservationFields";
import type { ReservationPeriod } from "@/convex/lib/hospitalitySettingsValidation";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function VenueRulesForm({
  settings,
}: {
  settings: Doc<"reservation_settings">;
}) {
  const copy = useReservationCopy();
  const { t } = useDashboardI18n();
  const save = useMutation(api.hospitality.saveSettings);
  const action = useReservationAction();
  const [advanced, setAdvanced] = useState(false);
  const [rules, setRules] = useState({
    timezone: settings.timezone ?? "Europe/Skopje",
    defaultDurationMins: settings.defaultDurationMins,
    minDurationMins: settings.minDurationMins,
    maxDurationMins: settings.maxDurationMins,
    bufferMins: settings.bufferMins ?? 15,
    slotIntervalMins: settings.slotIntervalMins,
    bookingWindowDays: settings.bookingWindowDays,
    minAdvanceBookingHours: settings.minAdvanceBookingHours,
    minPartySize: settings.minPartySize,
    maxPartySize: settings.maxPartySize,
    cancellationWindowHours: settings.cancellationWindowHours ?? 24,
    noShowGraceMins: settings.noShowGraceMins ?? 15,
    walkInsAccepted: settings.walkInsAccepted,
    reminderHoursBefore: settings.reminderHoursBefore,
  });
  const [periods, setPeriods] = useState<ReservationPeriod[]>(
    settings.servicePeriods ?? [],
  );
  const updatePeriod = (index: number, patch: Partial<ReservationPeriod>) =>
    setPeriods((current) =>
      current.map((period, i) =>
        i === index ? { ...period, ...patch } : period,
      ),
    );
  const numericFields = [
    { key: "defaultDurationMins", label: copy("Dining duration (minutes)") },
    { key: "minDurationMins", label: copy("Minimum staff duration (minutes)") },
    { key: "maxDurationMins", label: copy("Maximum staff duration (minutes)") },
    { key: "bufferMins", label: copy("Table reset buffer (minutes)") },
    { key: "slotIntervalMins", label: copy("Start interval (minutes)") },
    { key: "minPartySize", label: copy("Minimum party size") },
    { key: "maxPartySize", label: copy("Maximum party size") },
    { key: "bookingWindowDays", label: copy("Booking window (days)") },
    { key: "minAdvanceBookingHours", label: copy("Advance notice (hours)") },
    {
      key: "cancellationWindowHours",
      label: copy("Cancellation notice (hours)"),
    },
    { key: "noShowGraceMins", label: copy("No-show grace (minutes)") },
  ] as const;
  const advancedKeys = [
    "minDurationMins",
    "maxDurationMins",
    "slotIntervalMins",
    "noShowGraceMins",
  ];
  const numberField = (field: (typeof numericFields)[number]) => (
    <ReservationInput
      key={field.key}
      label={field.label}
      type="number"
      min={0}
      required
      value={rules[field.key]}
      onChange={(event) =>
        setRules({ ...rules, [field.key]: Number(event.target.value) })
      }
    />
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void action
          .run(
            () => save({ ...rules, servicePeriods: periods }),
            copy("Reservation rules saved"),
          )
          .then((saved) => {
            if (!saved) setAdvanced(true);
          });
      }}
      className="flex flex-col gap-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>{copy("Service periods")}</CardTitle>
          <CardDescription>
            {copy(
              "Choose the day service starts. For overnight service, close on the following day.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {periods.map((period, index) => (
            <FieldSet key={index}>
              <FieldLegend>
                {copy("Service period")} {index + 1}
              </FieldLegend>
              <FieldGroup>
                <FieldGroup className="grid sm:grid-cols-2">
                  <ReservationInput
                    label={copy("Period {n} name", { n: index + 1 })}
                    required
                    value={period.name}
                    onChange={(event) =>
                      updatePeriod(index, { name: event.target.value })
                    }
                  />
                  <ReservationInput
                    label={copy("Period {n} opens", { n: index + 1 })}
                    type="time"
                    required
                    value={period.startTime}
                    onChange={(event) =>
                      updatePeriod(index, { startTime: event.target.value })
                    }
                  />
                  <ReservationInput
                    label={copy("Period {n} closes", { n: index + 1 })}
                    type="time"
                    required
                    value={period.endTime}
                    onChange={(event) =>
                      updatePeriod(index, { endTime: event.target.value })
                    }
                  />
                  <ReservationInput
                    label={copy("Period {n} last seating (optional)", {
                      n: index + 1,
                    })}
                    type="time"
                    value={period.lastSeatingTime ?? ""}
                    onChange={(event) =>
                      updatePeriod(index, {
                        lastSeatingTime: event.target.value || undefined,
                      })
                    }
                  />
                </FieldGroup>
                <Field orientation="horizontal">
                  <Checkbox
                    id={`overnight-${index}`}
                    checked={period.endDayOffset === 1}
                    onCheckedChange={(checked) =>
                      updatePeriod(index, { endDayOffset: checked ? 1 : 0 })
                    }
                  />
                  <FieldLabel htmlFor={`overnight-${index}`}>
                    {copy("Closes the next day")}
                  </FieldLabel>
                </Field>
                <FieldGroup className="flex flex-row flex-wrap">
                  {weekdays.map((day, dayIndex) => (
                    <Field key={day} orientation="horizontal">
                      <Checkbox
                        id={`period-${index}-${day}`}
                        checked={period.daysOfWeek.includes(dayIndex)}
                        onCheckedChange={(checked) =>
                          updatePeriod(index, {
                            daysOfWeek: checked
                              ? [...period.daysOfWeek, dayIndex]
                              : period.daysOfWeek.filter(
                                  (value) => value !== dayIndex,
                                ),
                          })
                        }
                      />
                      <FieldLabel htmlFor={`period-${index}-${day}`}>
                        {copy(day)}
                      </FieldLabel>
                    </Field>
                  ))}
                </FieldGroup>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPeriods((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                >
                  {copy("Remove period")} {index + 1}
                </Button>
              </FieldGroup>
            </FieldSet>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setPeriods([
                ...periods,
                {
                  name: copy("Dinner"),
                  startTime: "18:00",
                  endTime: "23:00",
                  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                  endDayOffset: 0,
                },
              ])
            }
          >
            {copy("Add service period")}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{copy("Reservation rules")}</CardTitle>
          <CardDescription>
            {copy(
              "Guests see available arrivals. Staff can adjust a visit within the duration limits.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <ReservationInput
              label={copy("Venue timezone")}
              value={rules.timezone}
              onChange={(event) =>
                setRules({ ...rules, timezone: event.target.value })
              }
            />
            <FieldGroup className="grid sm:grid-cols-2">
              {numericFields
                .filter((field) => !advancedKeys.includes(field.key))
                .map(numberField)}
            </FieldGroup>
            <Collapsible.Root open={advanced} onOpenChange={setAdvanced}>
              <Collapsible.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="mb-3 w-full justify-between"
                >
                  {t(
                    "Staff adjustments",
                    "Прилагодувања за персоналот",
                    "Rregullimet për stafin",
                  )}
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <FieldGroup className="grid sm:grid-cols-2">
                  {numericFields
                    .filter((field) => advancedKeys.includes(field.key))
                    .map(numberField)}
                </FieldGroup>
              </Collapsible.Content>
            </Collapsible.Root>
            <Field orientation="horizontal">
              <Checkbox
                id="walkins-accepted"
                checked={rules.walkInsAccepted}
                onCheckedChange={(checked) =>
                  setRules({ ...rules, walkInsAccepted: checked === true })
                }
              />
              <FieldLabel htmlFor="walkins-accepted">
                {copy("Accept walk-ins")}
              </FieldLabel>
            </Field>
            <FieldSet>
              <FieldLegend>{copy("Client email reminders")}</FieldLegend>
              <FieldGroup className="flex flex-row flex-wrap">
                {[24, 3, 2, 1].map((hour) => (
                  <Field key={hour} orientation="horizontal">
                    <Checkbox
                      id={`reminder-${hour}`}
                      checked={rules.reminderHoursBefore.includes(hour)}
                      onCheckedChange={(checked) =>
                        setRules({
                          ...rules,
                          reminderHoursBefore: checked
                            ? [...rules.reminderHoursBefore, hour]
                            : rules.reminderHoursBefore.filter(
                                (value) => value !== hour,
                              ),
                        })
                      }
                    />
                    <FieldLabel htmlFor={`reminder-${hour}`}>
                      {hour} {copy("hours before")}
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
        </CardContent>
      </Card>
      <ReservationError error={action.error} />
      <Button type="submit" disabled={action.busy} className="self-start">
        {action.busy ? copy("Saving…") : copy("Save reservation rules")}
      </Button>
    </form>
  );
}
