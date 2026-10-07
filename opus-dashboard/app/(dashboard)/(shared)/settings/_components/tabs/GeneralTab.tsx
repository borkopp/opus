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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  normalizeDashboardLocale,
  resolveDashboardLanguage,
  SUPPORTED_DASHBOARD_LOCALES,
} from "@/lib/i18n/types";
import { SettingsCard } from "../SettingsCard";
import { validLocale, validTimezone, type FieldErrors } from "../validation";

interface GeneralTabProps {
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

type Fields = "timezone" | "locale" | "currency";

const CURRENCIES = [
  {
    code: "MKD",
    symbol: "ден",
    nameEn: "Macedonian denar",
    nameMk: "Македонски денар",
    nameSq: "Denar maqedonas",
  },
  {
    code: "EUR",
    symbol: "€",
    nameEn: "Euro",
    nameMk: "Евро",
    nameSq: "Euro",
  },
  {
    code: "USD",
    symbol: "$",
    nameEn: "US dollar",
    nameMk: "Американски долар",
    nameSq: "Dollar amerikan",
  },
  {
    code: "GBP",
    symbol: "£",
    nameEn: "British pound",
    nameMk: "Британска фунта",
    nameSq: "Paund britanik",
  },
] as const;

export function GeneralTab({ orgId, initialData }: GeneralTabProps) {
  const isMounted = useRef(true);
  const { t, setLanguage, locale } = useDashboardI18n();

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [general, setGeneral] = useState<{
    timezone: string;
    currency: string;
    locale: string;
  }>({
    timezone: initialData.timezone,
    currency: initialData.currency,
    locale: normalizeDashboardLocale(locale),
  });
  const [bookingRules] = useState({
    slotDurationMins: initialData.slotDurationMins,
    quickBookingDurationMins: initialData.quickBookingDurationMins,
    bookingWindowDays: initialData.bookingWindowDays,
    cancellationWindowHours: initialData.cancellationWindowHours,
    bufferTimeMins: initialData.bufferTimeMins,
  });
  const [errors, setErrors] = useState<FieldErrors<Fields>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setGeneral({
      timezone: initialData.timezone,
      currency: initialData.currency,
      locale: normalizeDashboardLocale(locale),
    });
  }, [initialData.currency, locale, initialData.timezone]);

  const updateOrgSettings = useMutation(api.orgSettings.updateOrgSettings);

  function validate(): FieldErrors<Fields> {
    const nextErrors: FieldErrors<Fields> = {};
    if (!validTimezone(general.timezone)) {
      nextErrors.timezone = t(
        "Enter a valid IANA timezone, such as Europe/Skopje.",
        "Внесете валидна IANA временска зона, на пример Europe/Skopje.",
        "Vendosni një zonë kohore të vlefshme IANA, si Europe/Skopje.",
      );
    }
    if (
      !validLocale(general.locale) ||
      !SUPPORTED_DASHBOARD_LOCALES.some(
        (option) => option.code === general.locale,
      )
    ) {
      nextErrors.locale = t(
        "Enter a valid locale tag, such as mk-MK or en-GB.",
        "Изберете поддржан јазик, како mk-MK или en-GB.",
        "Zgjidhni një gjuhë të mbështetur, si mk-MK, sq-AL ose en-GB.",
      );
    }
    if (!general.currency) {
      nextErrors.currency = t(
        "Select a currency.",
        "Изберете валута.",
        "Zgjidhni një monedhë.",
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
      await updateOrgSettings({ orgId, ...general, ...bookingRules });
      setLanguage(resolveDashboardLanguage(general.locale));
      if (isMounted.current)
        toast.success(
          t(
            "Settings saved",
            "Поставките се зачувани",
            "Cilësimet u ruajtën",
          ),
        );
    } catch (error) {
      if (isMounted.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : t(
                "Failed to save settings.",
                "Неуспешно зачувување на поставките.",
                "Ruajtja e cilësimeve dështoi.",
              ),
        );
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent value="general" className="m-0">
      <SettingsCard
        title={t("General", "Општо", "Të përgjithshme")}
        description={t(
          "Set the language, timezone, and currency used across the dashboard and booking experience.",
          "Поставете го јазикот, временската зона и валутата што се користат во контролната табла и при закажувањето.",
          "Vendosni gjuhën, zonën kohore dhe monedhën që përdoren në panel dhe gjatë procesit të rezervimit.",
        )}
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {isSaving
              ? t("Saving…", "Се зачувува…", "Duke ruajtur…")
              : t("Save changes", "Зачувај промени", "Ruaj ndryshimet")}
          </Button>
        }
      >
        <FieldGroup className="max-w-3xl">
          <Field data-invalid={Boolean(errors.timezone)}>
            <FieldLabel data-replay-public htmlFor="timezone">
              {t("Timezone", "Временска зона", "Zona kohore")}
            </FieldLabel>
            <DebouncedInput
              id="timezone"
              value={general.timezone}
              maxLength={64}
              placeholder="Europe/Skopje"
              aria-describedby="timezone-description"
              aria-invalid={Boolean(errors.timezone)}
              onChange={(value) => {
                setGeneral((current) => ({ ...current, timezone: value }));
                clearError("timezone");
              }}
            />
            <FieldDescription data-replay-public id="timezone-description">
              {t(
                "Use a city-based timezone so appointment times remain accurate.",
                "Користете временска зона според град за точни термини на закажување.",
                "Përdorni një zonë kohore sipas qytetit në mënyrë që oraret e termineve të mbeten të sakta.",
              )}
            </FieldDescription>
            <FieldError>{errors.timezone}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.locale)}>
            <FieldLabel data-replay-public htmlFor="locale-select">
              {t("Language", "Јазик на платформата", "Gjuha e platformës")}
            </FieldLabel>
            <Select
              value={general.locale}
              onValueChange={(value) => {
                setGeneral((current) => ({ ...current, locale: value }));
                clearError("locale");
              }}
            >
              <SelectTrigger
                id="locale-select"
                aria-describedby="locale-description"
                aria-invalid={Boolean(errors.locale)}
                className="w-full"
              >
                <SelectValue
                  placeholder={t(
                    "Select language",
                    "Изберете јазик",
                    "Zgjidhni gjuhën",
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SUPPORTED_DASHBOARD_LOCALES.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {t(option.label.en, option.label.mk, option.label.sq)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription data-replay-public id="locale-description">
              {t(
                "Choose the language used across the dashboard.",
                "Изберете го јазикот што се користи на контролната табла.",
                "Zgjidhni gjuhën e përdorur në të gjithë panelin.",
              )}
            </FieldDescription>
            <FieldError>{errors.locale}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.currency)}>
            <FieldLabel data-replay-public>
              {t("Currency", "Валута", "Monedha")}
            </FieldLabel>
            <FieldDescription data-replay-public>
              {t(
                "Used to format service prices and booking totals.",
                "Се користи за прикажување на цените на услугите и вкупните износи.",
                "Përdoret për formatimin e çmimeve të shërbimeve dhe shumave totale të rezervimeve.",
              )}
            </FieldDescription>
            <ToggleGroup
              type="single"
              value={general.currency}
              onValueChange={(value) => {
                if (!value) return;
                setGeneral((current) => ({ ...current, currency: value }));
                clearError("currency");
              }}
              variant="outline"
              spacing={2}
              aria-label={t("Currency", "Валута", "Monedha")}
              className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {CURRENCIES.map((currency) => (
                <ToggleGroupItem
                  key={currency.code}
                  value={currency.code}
                  className="h-auto min-h-14 flex-col items-start gap-0.5 px-3 py-2 text-left"
                >
                  <span className="text-sm font-semibold">
                    {currency.symbol} {currency.code}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {t(currency.nameEn, currency.nameMk, currency.nameSq)}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldError>{errors.currency}</FieldError>
          </Field>
        </FieldGroup>
      </SettingsCard>
    </TabsContent>
  );
}
