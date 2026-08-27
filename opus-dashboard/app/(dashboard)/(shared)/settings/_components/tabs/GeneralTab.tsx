"use client";

import { useState, useEffect, useRef } from "react";
import { CircleAlert, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { Spinner } from "@/components/ui/spinner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { SettingsCard } from "../SettingsCard";
import {
  validTimezone,
  validLocale,
  type FieldErrors,
} from "../validation";

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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
      <CircleAlert className="shrink-0" />
      {message}
    </p>
  );
}

export function GeneralTab({ orgId, initialData }: GeneralTabProps) {
  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

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
  }, [initialData.timezone, initialData.currency, initialData.locale]);

  const updateOrgSettings = useMutation(api.orgSettings.updateOrgSettings);

  function validate(): FieldErrors<Fields> {
    const errs: FieldErrors<Fields> = {};
    if (!validTimezone(general.timezone))
      errs.timezone = "Enter a valid IANA timezone (e.g. Europe/Skopje).";
    if (general.locale && !validLocale(general.locale))
      errs.locale = "Enter a valid locale tag (e.g. en-GB, mk-MK).";
    if (!general.currency)
      errs.currency = "Select a currency.";
    return errs;
  }

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setIsSaving(true);
    try {
      await updateOrgSettings({ orgId, ...general, ...bookingRules });
      if (isMounted.current) toast.success("Settings saved");
    } catch (error) {
      if (isMounted.current) {
        toast.error(error instanceof Error ? error.message : "Failed to save settings.");
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  const clearError = (field: Fields) =>
    errors[field] && setErrors((e) => ({ ...e, [field]: undefined }));

  return (
    <TabsContent
      value="general"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <SettingsCard
        title="Display & region"
        description="Set the timezone, language, and currency used throughout your dashboard and customer experience."
        contentClassName="grid gap-8"
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Spinner /> : <Save />}
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        }
      >
          <div className="grid gap-2 max-w-4xl">
            <Label htmlFor="timezone">Timezone</Label>
            <DebouncedInput
              id="timezone"
              value={general.timezone}
              maxLength={64}
              placeholder="Europe/Skopje"
              aria-describedby={errors.timezone ? "timezone-error" : undefined}
              aria-invalid={!!errors.timezone}
              onChange={(val) => {
                setGeneral({ ...general, timezone: val });
                clearError("timezone");
              }}
              className={cn(errors.timezone && "border-destructive")}
            />
            <p className="text-xs text-muted-foreground">
              Use a city-based timezone, e.g. <span className="font-mono">Europe/London</span> or <span className="font-mono">America/New_York</span>.
            </p>
            <FieldError id="timezone-error" message={errors.timezone} />
          </div>

          <div className="grid gap-2 max-w-4xl">
            <Label htmlFor="locale">
              Language & Region{" "}
              <span className="text-muted-foreground font-normal ml-1">(e.g. en-GB, mk-MK)</span>
            </Label>
            <DebouncedInput
              id="locale"
              value={general.locale}
              maxLength={12}
              placeholder="en-GB"
              aria-describedby={errors.locale ? "locale-error" : undefined}
              aria-invalid={!!errors.locale}
              onChange={(val) => {
                setGeneral({ ...general, locale: val });
                clearError("locale");
              }}
              className={cn(errors.locale && "border-destructive")}
            />
            <FieldError id="locale-error" message={errors.locale} />
          </div>

          <div className="grid gap-3">
            <Label>
              Currency{" "}
              <span className="text-muted-foreground font-normal ml-1">
                (Used for formatting across the platform)
              </span>
            </Label>
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              role="radiogroup"
              aria-label="Currency"
              aria-describedby={errors.currency ? "currency-error" : undefined}
            >
              {[
                { code: "USD", symbol: "$", name: "US Dollar" },
                { code: "EUR", symbol: "€", name: "Euro" },
                { code: "GBP", symbol: "£", name: "British Pound" },
                { code: "MKD", symbol: "ден", name: "MK Denar" },
              ].map((c) => (
                <button
                  key={c.code}
                  type="button"
                  role="radio"
                  aria-checked={general.currency === c.code}
                  onClick={() => {
                    setGeneral({ ...general, currency: c.code });
                    clearError("currency");
                  }}
                  className={cn(
                    "group relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border p-5 transition-[background-color,border-color,transform,box-shadow] duration-150 active:scale-[0.98]",
                    general.currency === c.code
                      ? "border-accent bg-accent/10 shadow-sm"
                      : "border-border/60 bg-background hover:border-accent/30 hover:bg-muted/30",
                    errors.currency && "border-destructive/50",
                  )}
                >
                  {general.currency === c.code && (
                    <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] text-accent-foreground">
                      ✓
                    </div>
                  )}
                  <span
                    className={cn(
                      "text-3xl font-black font-display transition-colors",
                      general.currency === c.code
                        ? "text-accent"
                        : "text-muted-foreground/40 group-hover:text-muted-foreground",
                    )}
                  >
                    {c.symbol}
                  </span>
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-sm font-bold uppercase tracking-wider">{c.code}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{c.name}</span>
                  </div>
                </button>
              ))}
            </div>
            <FieldError id="currency-error" message={errors.currency} />
          </div>
      </SettingsCard>
    </TabsContent>
  );
}
