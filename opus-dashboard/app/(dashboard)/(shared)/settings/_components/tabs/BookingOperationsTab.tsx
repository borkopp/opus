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
import { posInt, nonNegInt, type FieldErrors } from "../validation";

interface BookingOperationsTabProps {
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

type Fields = "slotDurationMins" | "bookingWindowDays" | "cancellationWindowHours" | "bufferTimeMins";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
      <IconAlertCircle size={13} className="shrink-0" />
      {message}
    </p>
  );
}

export function BookingOperationsTab({ orgId, initialData }: BookingOperationsTabProps) {
  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const [bookingRules, setBookingRules] = useState({
    slotDurationMins: initialData.slotDurationMins,
    bookingWindowDays: initialData.bookingWindowDays,
    cancellationWindowHours: initialData.cancellationWindowHours,
    bufferTimeMins: initialData.bufferTimeMins,
  });
  const [errors, setErrors] = useState<FieldErrors<Fields>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setBookingRules({
      slotDurationMins: initialData.slotDurationMins,
      bookingWindowDays: initialData.bookingWindowDays,
      cancellationWindowHours: initialData.cancellationWindowHours,
      bufferTimeMins: initialData.bufferTimeMins,
    });
  }, [
    initialData.slotDurationMins,
    initialData.bookingWindowDays,
    initialData.cancellationWindowHours,
    initialData.bufferTimeMins,
  ]);

  const updateOrgSettings = useMutation(api.orgSettings.updateOrgSettings);

  function validate(): FieldErrors<Fields> {
    const errs: FieldErrors<Fields> = {};
    if (!posInt(bookingRules.slotDurationMins) || bookingRules.slotDurationMins > 480)
      errs.slotDurationMins = "Must be a whole number between 1 and 480 minutes.";
    if (!posInt(bookingRules.bookingWindowDays) || bookingRules.bookingWindowDays > 730)
      errs.bookingWindowDays = "Must be a whole number between 1 and 730 days.";
    if (!posInt(bookingRules.cancellationWindowHours) || bookingRules.cancellationWindowHours > 8760)
      errs.cancellationWindowHours = "Must be a whole number between 1 and 8760 hours.";
    if (!nonNegInt(bookingRules.bufferTimeMins) || bookingRules.bufferTimeMins > 240)
      errs.bufferTimeMins = "Must be 0 or a whole number up to 240 minutes.";
    return errs;
  }

  const clearError = (field: Fields) =>
    errors[field] && setErrors((e) => ({ ...e, [field]: undefined }));

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
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
      if (isMounted.current) toast.success("Booking rules saved");
    } catch (e: any) {
      if (isMounted.current) toast.error(e.message ?? "Failed to save booking rules.");
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  const numField = (
    id: string,
    label: string,
    unit: string,
    field: Fields,
    min: number,
    max: number,
    hint?: string,
  ) => (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}{" "}
        <span className="text-muted-foreground font-normal ml-1">({unit})</span>
      </Label>
      <DebouncedInput
        id={id}
        type="number"
        min={min}
        max={max}
        value={String(bookingRules[field])}
        aria-describedby={errors[field] ? `${id}-error` : hint ? `${id}-hint` : undefined}
        aria-invalid={!!errors[field]}
        onChange={(val) => {
          setBookingRules({ ...bookingRules, [field]: parseInt(val) });
          clearError(field);
        }}
        className={cn("bg-white", errors[field] && "border-destructive")}
      />
      {hint && !errors[field] && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>
      )}
      <FieldError id={`${id}-error`} message={errors[field]} />
    </div>
  );

  return (
    <TabsContent
      value="booking"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <div className="border-b pb-12 mb-12 last:border-b-0">
        <div className="mb-8">
          <h2 className="text-2xl font-medium font-display tracking-tight mb-1">Booking <span className="serif-accent-inline text-2xl">Operations</span></h2>
          <p className="text-sm text-muted-foreground">Control how customers see and book your availability.</p>
        </div>
        <div className="grid gap-6 p-6 border border-border/60 rounded-xl bg-background shadow-s dark:shadow-l sm:grid-cols-2 max-w-4xl">
          {numField("slot-duration", "Slot Duration", "minutes", "slotDurationMins", 1, 480,
            "How long each appointment takes, e.g. 30 for a half-hour slot.")}
          {numField("buffer-time", "Buffer Time", "minutes", "bufferTimeMins", 0, 240,
            "Automatically block time after each appointment so you're never back-to-back.")}
          {numField("booking-window", "Advance Booking Limit", "days", "bookingWindowDays", 1, 730,
            "How far ahead customers can book, e.g. 60 days means two months out.")}
          {numField("cancellation-window", "Cancellation Notice", "hours", "cancellationWindowHours", 1, 8760,
            "How much notice a customer must give to cancel, e.g. 24 = 24 hours.")}
        </div>

        <div className="mt-10 pt-6 flex">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 rounded-full h-10 px-5 active:scale-[0.98] transition-transform">
            <IconDeviceFloppy size={18} />
            {isSaving ? "Saving…" : "Save Booking Rules"}
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
