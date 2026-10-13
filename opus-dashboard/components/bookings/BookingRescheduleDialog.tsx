"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { wallClockNow } from "@/convex/lib/bookingTime";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  bookingDateKey,
  bookingTimeLabel,
  dateFromKey,
} from "@/lib/booking-wall-clock";
import { bookingServiceLabel } from "./service-label";
import type { BookingView } from "./types";

export function BookingRescheduleDialog({
  booking,
  timezone,
  onClose,
  onConfirm,
}: {
  booking: BookingView;
  timezone: string;
  onClose: () => void;
  onConfirm: (newStartAt: number) => Promise<boolean>;
}) {
  const { t } = useDashboardI18n();
  const [date, setDate] = useState(() => bookingDateKey(booking.startAt));
  const [selectedStartAt, setSelectedStartAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validDate = Boolean(dateFromKey(date));
  const availableSlots = useQuery(
    api.slots.getRescheduleSlots,
    validDate ? { orgId: booking.orgId, bookingId: booking._id, date } : "skip",
  );
  const slots = availableSlots?.filter(
    (slot) => slot.startAt !== booking.startAt,
  );
  const selectedSlot = slots?.find((slot) => slot.startAt === selectedStartAt);
  const staleSelection =
    selectedStartAt !== null && slots !== undefined && !selectedSlot;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedSlot || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (await onConfirm(selectedSlot.startAt)) {
        onClose();
      } else {
        setError(
          t(
            "The appointment could not be moved. Choose an available time and try again.",
            "Терминот не се премести. Изберете слободно време и обидете се повторно.",
            "Termini nuk u zhvendos. Zgjidhni një kohë të lirë dhe provoni përsëri.",
          ),
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        showCloseButton={!saving}
      >
        <DialogHeader>
          <DialogTitle>
            {t(
              "Reschedule appointment",
              "Презакажи термин",
              "Ricakto terminin",
            )}
          </DialogTitle>
          <DialogDescription>
            {booking.customer?.name ?? t("Client", "Клиент", "Klienti")} ·{" "}
            {bookingServiceLabel(booking, t("Service", "Услуга", "Shërbim"))}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={submit}
          className="flex flex-col gap-5"
          aria-busy={saving}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reschedule-date">
                {t("New date", "Нов датум", "Data e re")}
              </FieldLabel>
              <Input
                id="reschedule-date"
                type="date"
                value={date}
                min={bookingDateKey(wallClockNow(timezone))}
                required
                disabled={saving}
                onChange={(event) => {
                  setDate(event.target.value);
                  setSelectedStartAt(null);
                  setError(null);
                }}
              />
            </Field>
            <Field>
              <FieldLabel id="reschedule-times-label">
                {t("Available times", "Слободни термини", "Oraret e lira")}
              </FieldLabel>
              {validDate && slots === undefined ? (
                <p
                  role="status"
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Spinner />
                  {t(
                    "Loading available times…",
                    "Вчитување слободни термини…",
                    "Duke ngarkuar oraret e lira…",
                  )}
                </p>
              ) : slots?.length ? (
                <div
                  role="group"
                  aria-labelledby="reschedule-times-label"
                  className="grid max-h-60 grid-cols-4 gap-2 overflow-y-auto"
                >
                  {slots.map((slot) => (
                    <Button
                      key={slot.startAt}
                      type="button"
                      variant={
                        selectedStartAt === slot.startAt ? "default" : "outline"
                      }
                      aria-pressed={selectedStartAt === slot.startAt}
                      aria-label={t(
                        `Select ${bookingTimeLabel(slot.startAt)}`,
                        `Избери ${bookingTimeLabel(slot.startAt)}`,
                        `Zgjidh ${bookingTimeLabel(slot.startAt)}`,
                      )}
                      disabled={saving}
                      onClick={() => {
                        setSelectedStartAt(slot.startAt);
                        setError(null);
                      }}
                      className="min-h-11"
                    >
                      {bookingTimeLabel(slot.startAt)}
                    </Button>
                  ))}
                </div>
              ) : validDate ? (
                <p role="status" className="text-sm text-muted-foreground">
                  {t(
                    "No available times on this date.",
                    "Нема слободни термини на овој датум.",
                    "Nuk ka orare të lira në këtë datë.",
                  )}
                </p>
              ) : null}
            </Field>
          </FieldGroup>
          {(error || staleSelection) && (
            <Alert variant="destructive">
              <AlertDescription>
                {error ??
                  t(
                    "This time is no longer available. Choose another time.",
                    "Овој термин повеќе не е достапен. Изберете друго време.",
                    "Ky orar nuk është më i lirë. Zgjidhni një orar tjetër.",
                  )}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              {t("Keep appointment", "Задржи термин", "Mbaj terminin")}
            </Button>
            <Button type="submit" disabled={saving || !selectedSlot}>
              {saving && <Spinner data-icon="inline-start" />}
              {t(
                "Confirm new time",
                "Потврди ново време",
                "Konfirmo kohën e re",
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
