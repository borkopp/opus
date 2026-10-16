"use client";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { ReservationAmendDialog } from "./ReservationAmendDialog";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
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

export type StaffReservation = FunctionReturnType<
  typeof api.reservations.listDay
>[number];
export type ReservationEditMode =
  | "reschedule"
  | "move"
  | "duration"
  | "cancel"
  | "details";
type EditProps = {
  reservation: StaffReservation;
  mode: ReservationEditMode;
  onClose: () => void;
  onDateChange: (date: string) => void;
};
export function ReservationEditDialog(props: EditProps) {
  return props.mode === "details" ? (
    <ReservationAmendDialog
      reservation={props.reservation}
      onClose={props.onClose}
    />
  ) : (
    <ReservationScheduleEditDialog {...props} mode={props.mode} />
  );
}
function ReservationScheduleEditDialog({
  reservation,
  mode,
  onClose,
  onDateChange,
}: {
  reservation: StaffReservation;
  mode: Exclude<ReservationEditMode, "details">;
  onClose: () => void;
  onDateChange: (date: string) => void;
}) {
  const copy = useReservationCopy();
  const { t } = useDashboardI18n();
  const change = useMutation(api.reservations.change);
  const action = useReservationAction();
  const [date, setDate] = useState(reservation.serviceDate ?? "");
  const [duration, setDuration] = useState(reservation.durationMins);
  const [start, setStart] = useState(String(reservation.startAt));
  const [option, setOption] = useState("");
  const [reason, setReason] = useState("");
  const slots = useQuery(
    api.reservations.getSlots,
    mode === "reschedule" && date
      ? {
          date,
          partySize: reservation.partySize,
          durationMins: duration,
          reservationId: reservation._id,
        }
      : "skip",
  );
  const moveOptions = useQuery(
    api.reservations.getMoveOptions,
    mode === "move"
      ? { reservationId: reservation._id, durationMins: duration }
      : "skip",
  );
  const slot = slots?.find((item) => String(item.startAt) === start);
  const options = mode === "move" ? moveOptions : slot?.options;
  const selected = options?.find((item) => item.tableIds.join(",") === option);
  const title = {
    reschedule: copy("Reschedule reservation"),
    move: copy("Move reservation"),
    duration: copy("Change dining duration"),
    cancel: copy("Cancel reservation"),
  }[mode];
  async function save() {
    const saved = await action.run(
      () =>
        change({
          reservationId: reservation._id,
          expectedRevision: reservation.revision ?? 0,
          action: mode,
          ...(mode === "reschedule"
            ? {
                serviceDate: date,
                startAt: Number(start),
                tableIds: selected?.tableIds,
              }
            : mode === "move"
              ? { tableIds: selected!.tableIds, durationMins: duration }
              : mode === "duration"
                ? { durationMins: duration }
                : { reason: reason.trim() || undefined }),
        }),
      copy("Reservation updated"),
    );
    if (saved) {
      if (mode === "reschedule") onDateChange(date);
      onClose();
    }
  }
  const unavailable =
    (mode === "reschedule" && !slot) || (mode === "move" && !selected);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.busy) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {reservation.customerName} · {reservation.partySize}{" "}
            {copy(
              "guests. Changes are confirmed only after availability is checked.",
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
            {mode === "reschedule" && (
              <ReservationInput
                label={copy("New service date")}
                type="date"
                value={date}
                required
                onChange={(event) => {
                  setDate(event.target.value);
                  setStart("");
                  setOption("");
                }}
              />
            )}
            {(mode === "duration" || mode === "move") && (
              <ReservationInput
                label={copy("New dining duration (minutes)")}
                hint={t(
                  "Total minutes from the booked arrival time, including time already spent.",
                  "Вкупно минути од резервираното време на пристигнување, вклучувајќи го веќе поминатото време.",
                  "Minutat totale nga ora e rezervuar e mbërritjes, duke përfshirë kohën e kaluar.",
                )}
                type="number"
                min={1}
                max={1440}
                required
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              />
            )}{" "}
            {mode === "cancel" && (
              <ReservationInput
                label={copy("Cancellation reason (optional)")}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            )}{" "}
            {mode === "reschedule" &&
              (slots === undefined ? (
                <Skeleton className="h-12" />
              ) : slots.length ? (
                <ReservationSelect
                  label={copy("New arrival time")}
                  value={start}
                  onChange={(value) => {
                    setStart(value);
                    setOption("");
                  }}
                  options={slots.map((item) => ({
                    value: String(item.startAt),
                    label: item.label,
                  }))}
                />
              ) : (
                <p role="status">
                  {copy(
                    "No available times on this date. Choose another date.",
                  )}
                </p>
              ))}
            {(mode === "move" || mode === "reschedule") &&
              (mode === "move" && moveOptions === undefined ? (
                <Skeleton className="h-12" />
              ) : options?.length ? (
                <ReservationSelect
                  label={copy("Table assignment")}
                  value={option}
                  onChange={setOption}
                  options={options.map((item) => ({
                    value: item.tableIds.join(","),
                    label: item.label,
                  }))}
                />
              ) : mode === "move" ? (
                <p role="status">
                  {copy("No alternative tables are available for this visit.")}
                </p>
              ) : null)}
          </FieldGroup>
          <ReservationError error={action.error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={action.busy}
              onClick={onClose}
            >
              {copy("Keep reservation")}
            </Button>
            <Button
              type="submit"
              variant={mode === "cancel" ? "destructive" : "default"}
              disabled={action.busy || Boolean(unavailable)}
            >
              {action.busy
                ? copy("Saving…")
                : mode === "cancel"
                  ? copy("Confirm cancellation")
                  : copy("Confirm change")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
