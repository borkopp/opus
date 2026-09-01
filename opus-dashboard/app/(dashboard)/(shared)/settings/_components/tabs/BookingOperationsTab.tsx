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
  label: string;
  unit: string;
  field: Fields;
  min: number;
  max: number;
  description: string;
}> = [
  {
    id: "slot-duration",
    label: "Slot duration",
    unit: "minutes",
    field: "slotDurationMins",
    min: 1,
    max: 480,
    description: "The smallest interval customers can book.",
  },
  {
    id: "quick-booking-duration",
    label: "Quick booking",
    unit: "minutes",
    field: "quickBookingDurationMins",
    min: 1,
    max: 480,
    description:
      "Preferred duration shown when you hover an available calendar slot.",
  },
  {
    id: "buffer-time",
    label: "Buffer time",
    unit: "minutes",
    field: "bufferTimeMins",
    min: 0,
    max: 240,
    description: "Time kept free after every appointment.",
  },
  {
    id: "booking-window",
    label: "Advance booking limit",
    unit: "days",
    field: "bookingWindowDays",
    min: 1,
    max: 730,
    description: "How far ahead customers may book.",
  },
  {
    id: "cancellation-window",
    label: "Cancellation notice",
    unit: "hours",
    field: "cancellationWindowHours",
    min: 1,
    max: 8760,
    description: "Minimum notice required for a customer cancellation.",
  },
];

export function BookingOperationsTab({
  orgId,
  initialData,
}: BookingOperationsTabProps) {
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
      nextErrors.slotDurationMins = "Enter a whole number between 1 and 480.";
    }
    if (
      !posInt(bookingRules.quickBookingDurationMins) ||
      bookingRules.quickBookingDurationMins > 480 ||
      bookingRules.quickBookingDurationMins < bookingRules.slotDurationMins ||
      bookingRules.quickBookingDurationMins % bookingRules.slotDurationMins !==
        0
    ) {
      nextErrors.quickBookingDurationMins = `Use a whole-number multiple of the ${bookingRules.slotDurationMins} minute slot duration, up to 480 minutes.`;
    }
    if (
      !posInt(bookingRules.bookingWindowDays) ||
      bookingRules.bookingWindowDays > 730
    ) {
      nextErrors.bookingWindowDays = "Enter a whole number between 1 and 730.";
    }
    if (
      !posInt(bookingRules.cancellationWindowHours) ||
      bookingRules.cancellationWindowHours > 8760
    ) {
      nextErrors.cancellationWindowHours =
        "Enter a whole number between 1 and 8,760.";
    }
    if (
      !nonNegInt(bookingRules.bufferTimeMins) ||
      bookingRules.bufferTimeMins > 240
    ) {
      nextErrors.bufferTimeMins = "Enter 0 or a whole number up to 240.";
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
      if (isMounted.current) toast.success("Booking rules saved");
    } catch (error) {
      if (isMounted.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to save booking rules.",
        );
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent value="booking" className="m-0">
      <SettingsCard
        title="Booking rules"
        description="Control calendar quick booking, appointment intervals, cancellation notice, and breathing room between bookings."
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {isSaving ? "Saving…" : "Save booking rules"}
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
                {config.label} ({config.unit})
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
                {config.description}
              </FieldDescription>
              <FieldError>{errors[config.field]}</FieldError>
            </Field>
          ))}
        </FieldGroup>
      </SettingsCard>
    </TabsContent>
  );
}
