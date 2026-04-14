"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { IconDeviceFloppy, IconAlertCircle } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
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
      <IconAlertCircle size={13} className="shrink-0" />
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
    } catch (e: any) {
      if (isMounted.current) toast.error(e.message ?? "Failed to save settings.");
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
      <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
        <div className="mb-8">
          <h2 className="text-2xl font-medium tracking-tight mb-1">Display & Region</h2>
          <p className="text-muted-foreground">Set your timezone, language, and currency for the platform.</p>
        </div>
        <div className="space-y-10">
          <div className="grid gap-2 max-w-xl">
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
              className={cn("bg-white", errors.timezone && "border-destructive")}
            />
            <p className="text-xs text-muted-foreground">
              Use a city-based timezone, e.g. <span className="font-mono">Europe/London</span> or <span className="font-mono">America/New_York</span>.
            </p>
            <FieldError id="timezone-error" message={errors.timezone} />
          </div>

          <div className="grid gap-2 max-w-xl">
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
              className={cn("bg-white", errors.locale && "border-destructive")}
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
                    "p-6 rounded-2xl border-2 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 group relative overflow-hidden",
                    general.currency === c.code
                      ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                      : "border-border bg-card hover:border-primary/30 hover:bg-muted/30",
                    errors.currency && "border-destructive/50",
                  )}
                >
                  {general.currency === c.code && (
                    <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                      ✓
                    </div>
                  )}
                  <span
                    className={cn(
                      "text-3xl font-black font-display transition-colors",
                      general.currency === c.code
                        ? "text-primary"
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
        </div>

        <div className="mt-10 pt-6 flex">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <IconDeviceFloppy size={18} />
            {isSaving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
