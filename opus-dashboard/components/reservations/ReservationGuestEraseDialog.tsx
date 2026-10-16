"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useReservationAction } from "@/hooks/use-reservation-action";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { StaffReservation } from "./ReservationEditDialog";
import { ReservationError } from "./ReservationFields";

/** Callers expose this only to owners; the mutation enforces the same role. */
export function ReservationGuestEraseDialog({
  reservation,
  onClose,
}: {
  reservation: StaffReservation;
  onClose: () => void;
}) {
  const copy = useReservationCopy();
  const action = useReservationAction();
  const eraseGuest = useMutation(api.reservations.eraseGuest);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.busy) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy("Anonymize guest details?")}</DialogTitle>
          <DialogDescription>
            {copy(
              "This removes guest details, account links and email management links from all of this guest’s reservations at this venue. Reservations and table assignments remain. Historical audit records are retained.",
            )}
          </DialogDescription>
        </DialogHeader>
        <p className="font-medium [overflow-wrap:anywhere]">
          {reservation.customerName}
        </p>
        <ReservationError error={action.error} />
        <DialogFooter>
          <Button variant="outline" disabled={action.busy} onClick={onClose}>
            {copy("Cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={action.busy}
            onClick={() =>
              void action
                .run(
                  () => eraseGuest({ customerId: reservation.customerId }),
                  copy("Guest details anonymized"),
                )
                .then((saved) => {
                  if (saved) onClose();
                })
            }
          >
            {copy("Anonymize guest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
