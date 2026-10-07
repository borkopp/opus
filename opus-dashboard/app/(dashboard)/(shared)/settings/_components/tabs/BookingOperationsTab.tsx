"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSettingsDraft } from "@/hooks/use-settings-draft";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SettingsCard } from "@/components/settings/SettingsCard";

type BookingRules = {
  slotDurationMins: number;
  quickBookingDurationMins: number;
  bookingWindowDays: number;
  cancellationWindowHours: number;
  bufferTimeMins: number;
};
export function BookingOperationsTab({
  orgId,
  initialData,
}: {
  orgId: Id<"orgs">;
  initialData: BookingRules;
}) {
  const { t } = useDashboardI18n();
  const { draft, setDraft, changes, isDirty } = useSettingsDraft(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = useMutation(api.orgSettings.updateOrgSettings);
  const set = (key: keyof BookingRules, value: number) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  };
  async function save() {
    if (
      Object.values(draft).some(
        (value) => !Number.isFinite(value) || !Number.isInteger(value),
      )
    ) {
      setError(
        t(
          "Use whole numbers for booking rules.",
          "Внесете цели броеви за правилата за закажување.",
          "Përdorni numra të plotë për rregullat e rezervimit.",
        ),
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      await update({ orgId, ...changes });
      toast.success(
        t(
          "Booking rules saved",
          "Правилата за закажување се зачувани",
          "Rregullat e rezervimit u ruajtën",
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t(
              "Could not save booking rules.",
              "Правилата не се зачувани.",
              "Rregullat nuk mund të ruheshin.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }
  function numberField(
    key: keyof BookingRules,
    label: string,
    description: string,
    min: number,
    max: number,
  ) {
    return (
      <Field>
        <FieldLabel htmlFor={`booking-${key}`}>{label}</FieldLabel>
        <Input
          id={`booking-${key}`}
          type="number"
          min={min}
          max={max}
          step={1}
          value={Number.isFinite(draft[key]) ? draft[key] : ""}
          onChange={(event) =>
            set(
              key,
              event.target.value === ""
                ? Number.NaN
                : Number(event.target.value),
            )
          }
        />
        <FieldDescription>{description}</FieldDescription>
      </Field>
    );
  }
  return (
    <TabsContent value="booking" className="m-0">
      <SettingsCard
        title={t("Online booking", "Онлајн закажување", "Rezervimi online")}
        description={t(
          "Choose when clients can book and how much time to leave between appointments.",
          "Изберете кога клиентите можат да закажуваат и колкава пауза да има меѓу термините.",
          "Zgjidhni kur klientët mund të rezervojnë dhe sa kohë të lihet midis termineve.",
        )}
        footer={
          <Button onClick={save} disabled={saving || !isDirty}>
            {saving && <Spinner data-icon="inline-start" />}
            {t("Save booking rules", "Зачувај правила", "Ruaj rregullat")}
          </Button>
        }
      >
        <fieldset disabled={saving} className="flex min-w-0 flex-col gap-6">
          <FieldGroup className="grid gap-6 sm:grid-cols-2">
            {numberField(
              "bufferTimeMins",
              t(
                "Time between appointments (minutes)",
                "Пауза меѓу термини (минути)",
                "Koha midis termineve (minuta)",
              ),
              t(
                "Time for preparation after each appointment. Use 0 for no break.",
                "Време за подготовка по секој термин. Внесете 0 ако нема пауза.",
                "Koha për përgatitje pas çdo termini. Përdorni 0 nëse nuk duhet pushim.",
              ),
              0,
              240,
            )}
            {numberField(
              "bookingWindowDays",
              t(
                "Clients can book ahead (days)",
                "Закажување однапред (денови)",
                "Rezervimi paraprak (ditë)",
              ),
              t(
                "How far into the future online appointments are available.",
                "Колку однапред се достапни онлајн термини.",
                "Sa kohë përpara janë të disponueshme terminet online.",
              ),
              1,
              730,
            )}
            {numberField(
              "cancellationWindowHours",
              t(
                "Cancellation notice (hours)",
                "Рок за откажување (часови)",
                "Njoftimi i anulimit (orë)",
              ),
              t(
                "After this deadline, clients must contact the studio to cancel.",
                "По овој рок, клиентите треба да го контактираат студиото за откажување.",
                "Pas këtij afati, klientët duhet të kontaktojnë studion për anulim.",
              ),
              1,
              8760,
            )}
          </FieldGroup>
          <Disclosure
            title={t(
              "Calendar and booking intervals",
              "Календар и интервали за закажување",
              "Kalendari dhe intervalet e rezervimit",
            )}
          >
            <FieldGroup className="grid gap-6 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="booking-start-interval">
                  {t(
                    "Appointment start interval",
                    "Интервал на почеток на термин",
                    "Intervali i fillimit të terminit",
                  )}
                </FieldLabel>
                <Select
                  value={String(draft.slotDurationMins)}
                  onValueChange={(value) => {
                    const interval = Number(value);
                    setDraft((current) => ({
                      ...current,
                      slotDurationMins: interval,
                      quickBookingDurationMins: Math.max(
                        interval,
                        Math.ceil(current.quickBookingDurationMins / interval) *
                          interval,
                      ),
                    }));
                    setError("");
                  }}
                >
                  <SelectTrigger id="booking-start-interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {[
                        ...new Set([
                          5,
                          10,
                          15,
                          20,
                          30,
                          60,
                          draft.slotDurationMins,
                        ]),
                      ]
                        .sort((a, b) => a - b)
                        .map((value) => (
                          <SelectItem key={value} value={String(value)}>
                            {value} {t("minutes", "минути", "minuta")}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {t(
                    "For example, 15 minutes offers starts at 09:00, 09:15 and 09:30. Service duration stays in Services.",
                    "На пример, 15 минути нуди почеток во 09:00, 09:15 и 09:30. Времетраењето на услугите се уредува во Услуги.",
                    "Për shembull, 15 minuta ofron fillime në 09:00, 09:15 dhe 09:30. Kohëzgjatja e shërbimit caktohet te Shërbimet.",
                  )}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="booking-quick-length">
                  {t(
                    "Calendar quick booking length",
                    "Времетраење за брзо закажување",
                    "Kohëzgjatja e rezervimit të shpejtë",
                  )}
                </FieldLabel>
                <Select
                  value={String(draft.quickBookingDurationMins)}
                  onValueChange={(value) =>
                    set("quickBookingDurationMins", Number(value))
                  }
                >
                  <SelectTrigger id="booking-quick-length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {[
                        ...new Set([
                          draft.slotDurationMins,
                          30,
                          45,
                          60,
                          90,
                          120,
                          draft.quickBookingDurationMins,
                        ]),
                      ]
                        .filter(
                          (value) =>
                            value >= draft.slotDurationMins &&
                            value % draft.slotDurationMins === 0 &&
                            value <= 480,
                        )
                        .sort((a, b) => a - b)
                        .map((value) => (
                          <SelectItem key={value} value={String(value)}>
                            {value} {t("minutes", "минути", "minuta")}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {t(
                    "The suggested length when adding an appointment from an empty calendar slot.",
                    "Предложено времетраење при додавање термин од празно место во календарот.",
                    "Kohëzgjatja e sugjeruar kur shtoni një termin nga një orar bosh në kalendar.",
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </Disclosure>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </fieldset>
      </SettingsCard>
    </TabsContent>
  );
}
