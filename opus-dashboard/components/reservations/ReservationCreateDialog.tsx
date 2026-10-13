"use client";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useReservationAction } from "@/hooks/use-reservation-action";
import {
  ReservationError,
  ReservationInput,
  ReservationSelect,
} from "./ReservationFields";

export function ReservationCreateDialog({
  date: initialDate,
  settings,
  onClose,
  onDateChange,
}: {
  date: string;
  settings: Doc<"reservation_settings">;
  onClose: () => void;
  onDateChange: (date: string) => void;
}) {
  const copy = useReservationCopy();
  const create = useMutation(api.reservations.createManual);
  const action = useReservationAction();
  const [requestId] = useState(() => crypto.randomUUID());
  const [date, setDate] = useState(initialDate);
  const [party, setParty] = useState(
    Math.min(settings.maxPartySize, Math.max(2, settings.minPartySize)),
  );
  const [duration, setDuration] = useState(settings.defaultDurationMins);
  const [source, setSource] = useState<"manual" | "phone" | "walk_in">("phone");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [start, setStart] = useState("");
  const [assignment, setAssignment] = useState("");
  const slots = useQuery(
    api.reservations.getSlots,
    date &&
      party >= settings.minPartySize &&
      party <= settings.maxPartySize &&
      duration >= settings.minDurationMins &&
      duration <= settings.maxDurationMins
      ? { date, partySize: party, durationMins: duration }
      : "skip",
  );
  const slot = slots?.find((item) => String(item.startAt) === start);
  const option = slot?.options.find(
    (item) => item.tableIds.join(",") === assignment,
  );
  async function save() {
    const result = await action.run(
      () =>
        create({
          requestId,
          serviceDate: date,
          startAt: Number(start),
          partySize: party,
          customerName: name,
          customerEmail: email.trim() || undefined,
          customerPhone: phone.trim() || undefined,
          specialRequests: note.trim() || undefined,
          source,
          tableIds: option?.tableIds,
          durationMins: duration,
        }),
      copy("Reservation created"),
    );
    if (result) {
      onDateChange(date);
      onClose();
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy("Add reservation")}</DialogTitle>
          <DialogDescription>
            {copy(
              "Phone bookings and walk-ins use the same table conflict checks as online reservations.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="flex flex-col gap-5"
        >
          <FieldGroup>
            <ReservationSelect
              label={copy("Reservation source")}
              value={source}
              onChange={(value) => setSource(value as typeof source)}
              options={[
                { value: "phone", label: copy("Phone") },
                { value: "manual", label: copy("Manual") },
                ...(settings.walkInsAccepted
                  ? [{ value: "walk_in", label: copy("Walk-in") }]
                  : []),
              ]}
            />
            <ReservationInput
              label={copy("Service date")}
              type="date"
              required
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setStart("");
                setAssignment("");
              }}
            />
            <ReservationInput
              label={copy("Party size")}
              type="number"
              min={settings.minPartySize}
              max={settings.maxPartySize}
              required
              value={party}
              onChange={(event) => {
                setParty(Number(event.target.value));
                setStart("");
                setAssignment("");
              }}
            />
            <ReservationInput
              label={copy("Dining duration (minutes)")}
              type="number"
              min={settings.minDurationMins}
              max={settings.maxDurationMins}
              required
              value={duration}
              onChange={(event) => {
                setDuration(Number(event.target.value));
                setStart("");
                setAssignment("");
              }}
            />
            {slots === undefined ? (
              <Skeleton className="h-12" />
            ) : slots.length ? (
              <ReservationSelect
                label={copy("Arrival time")}
                value={start}
                onChange={(value) => {
                  setStart(value);
                  setAssignment("");
                }}
                options={slots.map((item) => ({
                  value: String(item.startAt),
                  label: item.label,
                }))}
              />
            ) : (
              <p role="status">
                {copy(
                  "No tables are available. Try another date, party size or duration.",
                )}
              </p>
            )}
            {slot && (
              <ReservationSelect
                label={copy("Table assignment (optional)")}
                value={assignment || "auto"}
                onChange={(value) =>
                  setAssignment(value === "auto" ? "" : value)
                }
                options={[
                  { value: "auto", label: copy("Best available table") },
                  ...slot.options.map((item) => ({
                    value: item.tableIds.join(","),
                    label: item.label,
                  })),
                ]}
              />
            )}
            <ReservationInput
              label={copy("Guest name")}
              value={name}
              required
              onChange={(event) => setName(event.target.value)}
            />
            <ReservationInput
              label={copy("Guest email (optional)")}
              hint={copy(
                "Staff-created reservations are managed here. Guests do not receive an email confirmation.",
              )}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <ReservationInput
              label={copy("Guest phone (optional)")}
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <ReservationInput
              label={copy("Special requests (optional)")}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </FieldGroup>
          <ReservationError error={action.error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={action.busy}
            >
              {copy("Cancel")}
            </Button>
            <Button type="submit" disabled={action.busy || !slot}>
              {action.busy ? copy("Creating…") : copy("Create reservation")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
