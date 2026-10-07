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
  labelSq: string;
  unitEn: string;
  unitMk: string;
  unitSq: string;
  field: Fields;
  min: number;
  max: number;
  descriptionEn: string;
  descriptionMk: string;
  descriptionSq: string;
}> = [
  {
    id: "slot-duration",
    labelEn: "Slot duration",
    labelMk: "Времетраење на термин",
    labelSq: "Kohëzgjatja e orarit",
    unitEn: "minutes",
    unitMk: "минути",
    unitSq: "minuta",
    field: "slotDurationMins",
    min: 1,
    max: 480,
    descriptionEn: "The smallest interval customers can book.",
    descriptionMk: "Најмалиот интервал што клиентите можат да го закажат.",
    descriptionSq: "Intervali më i vogël që klientët mund të rezervojnë.",
  },
  {
    id: "quick-booking-duration",
    labelEn: "Quick booking",
    labelMk: "Брзо закажување",
    labelSq: "Rezervim i shpejtë",
    unitEn: "minutes",
    unitMk: "минути",
    unitSq: "minuta",
    field: "quickBookingDurationMins",
    min: 1,
    max: 480,
    descriptionEn:
      "Preferred duration shown when you hover an available calendar slot.",
    descriptionMk:
      "Претпочитано времетраење што се прикажува при посочување на слободен термин во календарот.",
    descriptionSq:
      "Kohëzgjatja e preferuar e shfaqur kur kaloni kursorin mbi një orar të lirë në kalendar.",
  },
  {
    id: "buffer-time",
    labelEn: "Buffer time",
    labelMk: "Пауза меѓу термини",
    labelSq: "Koha e pushimit",
    unitEn: "minutes",
    unitMk: "минути",
    unitSq: "minuta",
    field: "bufferTimeMins",
    min: 0,
    max: 240,
    descriptionEn: "Time kept free after every appointment.",
    descriptionMk: "Слободно време по секој термин за подготовка.",
    descriptionSq: "Koha e mbajtur e lirë pas çdo termini.",
  },
  {
    id: "booking-window",
    labelEn: "Advance booking limit",
    labelMk: "Ограничување за закажување однапред",
    labelSq: "Kufiri i rezervimit paraprak",
    unitEn: "days",
    unitMk: "денови",
    unitSq: "ditë",
    field: "bookingWindowDays",
    min: 1,
    max: 730,
    descriptionEn: "How far ahead customers may book.",
    descriptionMk: "Колку однапред клиентите можат да закажат термин.",
    descriptionSq: "Sa kohë përpara mund të rezervojnë klientët.",
  },
  {
    id: "cancellation-window",
    labelEn: "Cancellation notice",
    labelMk: "Рок за откажување",
    labelSq: "Njoftimi i anulimit",
    unitEn: "hours",
    unitMk: "часови",
    unitSq: "orë",
    field: "cancellationWindowHours",
    min: 1,
    max: 8760,
    descriptionEn: "Minimum notice required for a customer cancellation.",
    descriptionMk: "Минимален рок за најава за откажување од страна на клиент.",
    descriptionSq: "Njoftimi minimal i kërkuar për anulim nga klienti.",
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
        "Vendosni një numër të plotë midis 1 dhe 480.",
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
        `Përdorni një numër të plotë që është shumëfish i kohëzgjatjes së orarit prej ${bookingRules.slotDurationMins} minutash, deri në 480 minuta.`,
      );
    }
    if (
      !posInt(bookingRules.bookingWindowDays) ||
      bookingRules.bookingWindowDays > 730
    ) {
      nextErrors.bookingWindowDays = t(
        "Enter a whole number between 1 and 730.",
        "Внесете цел број помеѓу 1 и 730.",
        "Vendosni një numër të plotë midis 1 dhe 730.",
      );
    }
    if (
      !posInt(bookingRules.cancellationWindowHours) ||
      bookingRules.cancellationWindowHours > 8760
    ) {
      nextErrors.cancellationWindowHours = t(
        "Enter a whole number between 1 and 8,760.",
        "Внесете цел број помеѓу 1 и 8.760.",
        "Vendosni një numër të plotë midis 1 dhe 8.760.",
      );
    }
    if (
      !nonNegInt(bookingRules.bufferTimeMins) ||
      bookingRules.bufferTimeMins > 240
    ) {
      nextErrors.bufferTimeMins = t(
        "Enter 0 or a whole number up to 240.",
        "Внесете 0 или цел број до 240.",
        "Vendosni 0 ose një numër të plotë deri në 240.",
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
          t(
            "Booking rules saved",
            "Правилата за закажување се зачувани",
            "Rregullat e rezervimit u ruajtën",
          ),
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
                "Dështoi ruajtja e rregullave të rezervimit.",
              ),
        );
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent value="booking" className="m-0 flex flex-col gap-6">
      <SettingsCard
        title={t(
          "Booking rules",
          "Правила за закажување",
          "Rregullat e rezervimit",
        )}
        description={t(
          "Control calendar quick booking, appointment intervals, cancellation notice, and breathing room between bookings.",
          "Управувајте со брзото закажување во календарот, интервалите на термини, рокот за откажување и паузите меѓу третмани.",
          "Menaxhoni rezervimin e shpejtë në kalendar, intervalet e termineve, njoftimin e anulimit dhe kohën e pushimit midis rezervimeve.",
        )}
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {isSaving
              ? t("Saving…", "Се зачувува…", "Po ruhet…")
              : t(
                  "Save booking rules",
                  "Зачувај правила за закажување",
                  "Ruaj rregullat e rezervimit",
                )}
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
                {t(config.labelEn, config.labelMk, config.labelSq)} (
                {t(config.unitEn, config.unitMk, config.unitSq)})
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
                {t(
                  config.descriptionEn,
                  config.descriptionMk,
                  config.descriptionSq,
                )}
              </FieldDescription>
              <FieldError>{errors[config.field]}</FieldError>
            </Field>
          ))}
        </FieldGroup>
      </SettingsCard>
    </TabsContent>
  );
}
