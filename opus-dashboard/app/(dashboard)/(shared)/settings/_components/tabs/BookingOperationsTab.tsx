"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { DebouncedInput } from "@/components/ui/debounced-input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { TabsContent } from "@/components/ui/tabs";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { SettingsCard } from "../SettingsCard";
import { nonNegInt, posInt, type FieldErrors } from "../validation";

interface BookingOperationsTabProps {
  orgId: Id<"orgs">;
  initialData: {
    timezone: string;
    currency: string;
    locale: string;
    slotDurationMins: number;
    quickBookingDurationMins: number;
    bookingWindowDays: number;
    cancellationWindowHours: number;
    bufferTimeMins: number;
  };
}

type Fields =
  | "slotDurationMins"
  | "quickBookingDurationMins"
  | "bookingWindowDays"
  | "cancellationWindowHours"
  | "bufferTimeMins";

const FIELD_CONFIG: Array<{
  id: string;
  labelEn: string;
  labelMk: string;
  unitEn: string;
  unitMk: string;
  field: Fields;
  min: number;
  max: number;
  descriptionEn: string;
  descriptionMk: string;
}> = [
  {
    id: "slot-duration",
    labelEn: "Slot duration",
    labelMk: "Времетраење на термин",
    unitEn: "minutes",
    unitMk: "минути",
    field: "slotDurationMins",
    min: 1,
    max: 480,
    descriptionEn: "The smallest interval customers can book.",
    descriptionMk: "Најмалиот интервал што клиентите можат да го закажат.",
  },
  {
    id: "quick-booking-duration",
    labelEn: "Quick booking",
    labelMk: "Брзо закажување",
    unitEn: "minutes",
    unitMk: "минути",
    field: "quickBookingDurationMins",
    min: 1,
    max: 480,
    descriptionEn:
      "Preferred duration shown when you hover an available calendar slot.",
    descriptionMk:
      "Претпочитано времетраење што се прикажува при посочување на слободен термин во календарот.",
  },
  {
    id: "buffer-time",
    labelEn: "Buffer time",
    labelMk: "Пауза меѓу термини",
    unitEn: "minutes",
    unitMk: "минути",
    field: "bufferTimeMins",
    min: 0,
    max: 240,
    descriptionEn: "Time kept free after every appointment.",
    descriptionMk: "Слободно време по секој термин за подготовка.",
  },
  {
    id: "booking-window",
    labelEn: "Advance booking limit",
    labelMk: "Ограничување за закажување однапред",
    unitEn: "days",
    unitMk: "денови",
    field: "bookingWindowDays",
    min: 1,
    max: 730,
    descriptionEn: "How far ahead customers may book.",
    descriptionMk: "Колку однапред клиентите можат да закажат термин.",
  },
  {
    id: "cancellation-window",
    labelEn: "Cancellation notice",
    labelMk: "Рок за откажување",
    unitEn: "hours",
    unitMk: "часови",
    field: "cancellationWindowHours",
    min: 1,
    max: 8760,
    descriptionEn: "Minimum notice required for a customer cancellation.",
    descriptionMk: "Минимален рок за најава за откажување од страна на клиент.",
  },
];

export function BookingOperationsTab({
  orgId,
  initialData,
}: BookingOperationsTabProps) {
  const { t } = useDashboardI18n();
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [bookingRules, setBookingRules] = useState({
    slotDurationMins: initialData.slotDurationMins,
    quickBookingDurationMins: initialData.quickBookingDurationMins,
    bookingWindowDays: initialData.bookingWindowDays,
    cancellationWindowHours: initialData.cancellationWindowHours,
    bufferTimeMins: initialData.bufferTimeMins,
  });
  const [errors, setErrors] = useState<FieldErrors<Fields>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setBookingRules({
      slotDurationMins: initialData.slotDurationMins,
      quickBookingDurationMins: initialData.quickBookingDurationMins,
      bookingWindowDays: initialData.bookingWindowDays,
      cancellationWindowHours: initialData.cancellationWindowHours,
      bufferTimeMins: initialData.bufferTimeMins,
    });
  }, [
    initialData.bookingWindowDays,
    initialData.bufferTimeMins,
    initialData.cancellationWindowHours,
    initialData.quickBookingDurationMins,
    initialData.slotDurationMins,
  ]);

  const updateOrgSettings = useMutation(api.orgSettings.updateOrgSettings);

  function validate(): FieldErrors<Fields> {
    const nextErrors: FieldErrors<Fields> = {};
    if (
      !posInt(bookingRules.slotDurationMins) ||
      bookingRules.slotDurationMins > 480
    ) {
      nextErrors.slotDurationMins = t(
        "Enter a whole number between 1 and 480.",
        "Внесете цел број помеѓу 1 и 480.",
      );
    }
    if (
      !posInt(bookingRules.quickBookingDurationMins) ||
      bookingRules.quickBookingDurationMins > 480 ||
      bookingRules.quickBookingDurationMins < bookingRules.slotDurationMins ||
      bookingRules.quickBookingDurationMins % bookingRules.slotDurationMins !==
        0
    ) {
      nextErrors.quickBookingDurationMins = t(
        `Use a whole-number multiple of the ${bookingRules.slotDurationMins} minute slot duration, up to 480 minutes.`,
        `Користете цел број што е содржател на времетраењето на терминот од ${bookingRules.slotDurationMins} минути, до 480 минути.`,
      );
    }
    if (
      !posInt(bookingRules.bookingWindowDays) ||
      bookingRules.bookingWindowDays > 730
    ) {
      nextErrors.bookingWindowDays = t(
        "Enter a whole number between 1 and 730.",
        "Внесете цел број помеѓу 1 и 730.",
      );
    }
    if (
      !posInt(bookingRules.cancellationWindowHours) ||
      bookingRules.cancellationWindowHours > 8760
    ) {
      nextErrors.cancellationWindowHours = t(
        "Enter a whole number between 1 and 8,760.",
        "Внесете цел број помеѓу 1 и 8.760.",
      );
    }
    if (
      !nonNegInt(bookingRules.bufferTimeMins) ||
      bookingRules.bufferTimeMins > 240
    ) {
      nextErrors.bufferTimeMins = t(
        "Enter 0 or a whole number up to 240.",
        "Внесете 0 или цел број до 240.",
      );
    }
    return nextErrors;
  }

  const clearError = (field: Fields) => {
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const handleSave = async () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      await updateOrgSettings({
        orgId,
        ...bookingRules,
        timezone: initialData.timezone,
        currency: initialData.currency,
        locale: initialData.locale,
      });
      if (isMounted.current) {
        toast.success(
          t("Booking rules saved", "Правилата за закажување се зачувани"),
        );
      }
    } catch (error) {
      if (isMounted.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : t(
                "Failed to save booking rules.",
                "Не успеа зачувувањето на правилата за закажување.",
              ),
        );
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent value="booking" className="m-0">
      <SettingsCard
        title={t("Booking rules", "Правила за закажување")}
        description={t(
          "Control calendar quick booking, appointment intervals, cancellation notice, and breathing room between bookings.",
          "Управувајте со брзото закажување во календарот, интервалите на термини, рокот за откажување и паузите меѓу третмани.",
        )}
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {isSaving
              ? t("Saving…", "Се зачувува…")
              : t("Save booking rules", "Зачувај правила за закажување")}
          </Button>
        }
      >
        <FieldGroup className="grid gap-6 sm:grid-cols-2">
          {FIELD_CONFIG.map((config) => (
            <Field
              key={config.field}
              data-invalid={Boolean(errors[config.field])}
            >
              <FieldLabel htmlFor={config.id}>
                {t(config.labelEn, config.labelMk)} (
                {t(config.unitEn, config.unitMk)})
              </FieldLabel>
              <DebouncedInput
                id={config.id}
                type="number"
                min={config.min}
                max={config.max}
                value={String(bookingRules[config.field])}
                aria-describedby={`${config.id}-description`}
                aria-invalid={Boolean(errors[config.field])}
                onChange={(value) => {
                  setBookingRules((current) => ({
                    ...current,
                    [config.field]: Number.parseInt(value, 10),
                  }));
                  clearError(config.field);
                }}
              />
              <FieldDescription id={`${config.id}-description`}>
                {t(config.descriptionEn, config.descriptionMk)}
              </FieldDescription>
              <FieldError>{errors[config.field]}</FieldError>
            </Field>
          ))}
        </FieldGroup>
      </SettingsCard>
    </TabsContent>
  );
}
