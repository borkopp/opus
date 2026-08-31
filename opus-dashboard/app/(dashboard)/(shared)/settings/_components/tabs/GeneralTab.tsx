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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SettingsCard } from "../SettingsCard";
import { validLocale, validTimezone, type FieldErrors } from "../validation";

interface GeneralTabProps {
  orgId: Id<"orgs">;
  initialData: {
    timezone: string;
    currency: string;
    locale: string;
    slotDurationMins: number;
    bookingWindowDays: number;
    cancellationWindowHours: number;
    bufferTimeMins: number;
  };
}

type Fields = "timezone" | "locale" | "currency";

const CURRENCIES = [
  { code: "MKD", symbol: "ден", name: "Macedonian denar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US dollar" },
  { code: "GBP", symbol: "£", name: "British pound" },
] as const;

export function GeneralTab({ orgId, initialData }: GeneralTabProps) {
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [general, setGeneral] = useState({
    timezone: initialData.timezone,
    currency: initialData.currency,
    locale: initialData.locale,
  });
  const [bookingRules] = useState({
    slotDurationMins: initialData.slotDurationMins,
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
      locale: initialData.locale,
    });
  }, [initialData.currency, initialData.locale, initialData.timezone]);

  const updateOrgSettings = useMutation(api.orgSettings.updateOrgSettings);

  function validate(): FieldErrors<Fields> {
    const nextErrors: FieldErrors<Fields> = {};
    if (!validTimezone(general.timezone)) {
      nextErrors.timezone =
        "Enter a valid IANA timezone, such as Europe/Skopje.";
    }
    if (!validLocale(general.locale)) {
      nextErrors.locale = "Enter a valid locale tag, such as mk-MK or en-GB.";
    }
    if (!general.currency) {
      nextErrors.currency = "Select a currency.";
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
      if (isMounted.current) toast.success("Settings saved");
    } catch (error) {
      if (isMounted.current) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save settings.",
        );
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent value="general" className="m-0">
      <SettingsCard
        title="General"
        description="Set the language, timezone, and currency used across the dashboard and booking experience."
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        }
      >
        <FieldGroup className="max-w-3xl">
          <Field data-invalid={Boolean(errors.timezone)}>
            <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
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
            <FieldDescription id="timezone-description">
              Use a city-based timezone so appointment times remain accurate.
            </FieldDescription>
            <FieldError>{errors.timezone}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.locale)}>
            <FieldLabel htmlFor="locale">Language and region</FieldLabel>
            <DebouncedInput
              id="locale"
              value={general.locale}
              maxLength={12}
              placeholder="mk-MK"
              aria-describedby="locale-description"
              aria-invalid={Boolean(errors.locale)}
              onChange={(value) => {
                setGeneral((current) => ({ ...current, locale: value }));
                clearError("locale");
              }}
            />
            <FieldDescription id="locale-description">
              Use a locale tag such as mk-MK or en-GB.
            </FieldDescription>
            <FieldError>{errors.locale}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.currency)}>
            <FieldLabel>Currency</FieldLabel>
            <FieldDescription>
              Used to format service prices and booking totals.
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
              aria-label="Currency"
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
                    {currency.name}
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
