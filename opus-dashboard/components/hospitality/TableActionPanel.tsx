"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  IconX,
  IconUsers,
  IconClock,
  IconCheck,
  IconAlertTriangle,
  IconUserPlus,
  IconBan,
} from "@tabler/icons-react";

interface TableActionPanelProps {
  table: any;
  orgId: Id<"orgs">;
  onClose: () => void;
}

export function TableActionPanel({ table, orgId, onClose }: TableActionPanelProps) {
  const updateStatus = useMutation(api.hospitality.tables.updateTableStatus);
  const seatReservation = useMutation(api.hospitality.reservations.seatReservation);
  const completeReservation = useMutation(api.hospitality.reservations.completeReservation);
  const cancelReservation = useMutation(api.hospitality.reservations.cancelReservation);
  const markNoShow = useMutation(api.hospitality.reservations.markNoShow);

  const [confirmCancel, setConfirmCancel] = useState(false);

  const reservation = table.currentReservation;
  const customer = table.customer;
  const status = table.status;

  async function handleSeat() {
    if (!reservation?._id) return;
    try {
      await seatReservation({ orgId, reservationId: reservation._id });
      toast.success("Guest seated");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleComplete() {
    if (!reservation?._id) return;
    try {
      await completeReservation({ orgId, reservationId: reservation._id });
      toast.success("Table completed");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleCancel() {
    if (!reservation?._id) return;
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    try {
      await cancelReservation({ orgId, reservationId: reservation._id, cancelledBy: "dashboard" });
      toast.success("Reservation cancelled");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleNoShow() {
    if (!reservation?._id) return;
    try {
      await markNoShow({ orgId, reservationId: reservation._id });
      toast.success("Marked as no-show");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleMarkCleaning() {
    try {
      await updateStatus({ orgId, tableId: table._id, status: "cleaning" });
      toast.success(`${table.label} marked cleaning`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleMarkAvailable() {
    try {
      await updateStatus({ orgId, tableId: table._id, status: "available" });
      toast.success(`${table.label} is available`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="w-[300px] bg-card border-l border-border flex flex-col h-full animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground">{table.label}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <IconUsers className="h-3 w-3" /> {table.capacity} seats
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{
              background: status === "available" ? "#f0f0ee" :
                         status === "reserved" ? "#FDF0ED" :
                         status === "occupied" ? "#1A1A18" :
                         status === "cleaning" ? "#FEF9E7" : "#F5F3F0",
              color: status === "occupied" ? "#fff" : "#1A1A18",
            }}>
              {status}
            </span>
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <IconX className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content based on status */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* AVAILABLE */}
        {status === "available" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">This table is available for seating.</p>

            {reservation && (
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-xs font-semibold text-accent mb-1">Next reservation</p>
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(reservation.startAt), "HH:mm")} — {customer?.name ?? "Guest"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Party of {reservation.partySize}
                </p>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-muted-foreground"
              onClick={() => updateStatus({ orgId, tableId: table._id, status: "inactive" })}
            >
              <IconBan className="h-4 w-4 mr-2" /> Mark inactive
            </Button>
          </div>
        )}

        {/* RESERVED */}
        {status === "reserved" && reservation && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">{customer?.name ?? "Guest"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <IconUsers className="h-3 w-3" /> Party of {reservation.partySize}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <IconClock className="h-3 w-3" /> {format(new Date(reservation.startAt), "HH:mm")} — {reservation.durationMins}min
              </p>
            </div>

            {reservation.specialRequests && (
              <div className="p-2.5 rounded-lg bg-secondary text-xs text-foreground">
                <span className="font-semibold text-muted-foreground block mb-1">Special requests</span>
                {reservation.specialRequests}
              </div>
            )}

            {reservation.occasion && (
              <span className="inline-flex w-fit px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold capitalize">
                {reservation.occasion}
              </span>
            )}

            {customer && (
              <div className="flex items-center gap-3 py-2 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Visits</p>
                  <p className="text-sm font-bold font-outfit">{customer.totalVisits ?? 0}</p>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <p className="text-xs text-muted-foreground">LTV</p>
                  <p className="text-sm font-bold font-outfit">
                    £{((customer.totalSpendMinorUnits ?? 0) / 100).toFixed(0)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button variant="terracotta" size="sm" onClick={handleSeat}>
                <IconCheck className="h-4 w-4 mr-2" /> Seat now
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel} className="text-destructive hover:text-destructive">
                {confirmCancel ? "Click again to confirm" : "Cancel reservation"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNoShow} className="text-muted-foreground">
                <IconAlertTriangle className="h-4 w-4 mr-2" /> No show
              </Button>
            </div>
          </div>
        )}

        {/* OCCUPIED */}
        {status === "occupied" && (
          <div className="flex flex-col gap-4">
            {reservation && (
              <>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-foreground">{customer?.name ?? "Guest"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <IconUsers className="h-3 w-3" /> Party of {reservation.partySize}
                  </p>
                  <p className="text-xs text-accent font-medium flex items-center gap-1">
                    <IconClock className="h-3 w-3" />
                    Seated {formatDistanceToNow(new Date(reservation.startAt), { addSuffix: true })}
                  </p>
                </div>
              </>
            )}

            {!reservation && (
              <p className="text-sm text-muted-foreground">Walk-in currently seated.</p>
            )}

            <div className="flex flex-col gap-2">
              <Button variant="terracotta" size="sm" onClick={handleComplete}>
                <IconCheck className="h-4 w-4 mr-2" /> Complete & mark cleaning
              </Button>
            </div>
          </div>
        )}

        {/* CLEANING */}
        {status === "cleaning" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Table is being cleaned.</p>
            <Button variant="terracotta" size="sm" onClick={handleMarkAvailable}>
              <IconCheck className="h-4 w-4 mr-2" /> Mark available
            </Button>
          </div>
        )}

        {/* INACTIVE */}
        {status === "inactive" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">This table is currently inactive.</p>
            <Button variant="terracotta" size="sm" onClick={handleMarkAvailable}>
              Mark available
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
