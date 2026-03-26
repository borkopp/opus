"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconX, IconCheck, IconAlertTriangle } from "@tabler/icons-react";

interface NewReservationModalProps {
  orgId: Id<"orgs">;
  source: "manual" | "walk_in";
  onClose: () => void;
}

export function NewReservationModal({ orgId, source, onClose }: NewReservationModalProps) {
  const createReservation = useMutation(api.hospitality.reservations.createReservation);

  const settings = useQuery(api.hospitality.reservationSettings.getReservationSettings, { orgId });

  const [step, setStep] = useState<1 | 2>(1);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("19:00");
  const [partySize, setPartySize] = useState(2);
  const [durationMins, setDurationMins] = useState(settings?.defaultDurationMins ?? 60);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [occasion, setOccasion] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate party size against settings
  const minParty = settings?.minPartySize ?? 1;
  const maxParty = settings?.maxPartySize ?? 20;

  const partySizeError =
    partySize < minParty ? `Minimum party size is ${minParty}` :
    partySize > maxParty ? `Maximum party size is ${maxParty}` : null;

  function handleNext() {
    if (!customerName.trim()) {
      setError("Customer name is required");
      return;
    }
    if (partySizeError) {
      setError(partySizeError);
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      // Parse date+time to ms
      const startAt = new Date(`${date}T${time}:00`).getTime();

      // For now, use a placeholder customer ID — in production this would search/create
      // We'll need to create the customer first if they don't exist
      const customersQuery = await fetch(""); // placeholder

      await createReservation({
        orgId,
        startAt,
        durationMins,
        partySize,
        customerId: "" as any, // Will be handled by actual customer lookup
        source,
        specialRequests: specialRequests || undefined,
        occasion: occasion ? (occasion as any) : undefined,
      });

      toast.success("Reservation created");
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to create reservation");
    } finally {
      setIsSubmitting(false);
    }
  }

  const occasions = ["birthday", "anniversary", "business", "date", "other"];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground font-display">
              {source === "walk_in" ? "Seat Walk-in" : "New Reservation"}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <IconX className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="p-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-accent" : "bg-muted"}`} />
              <span className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-accent" : "bg-muted"}`} />
            </div>

            {step === 1 && (
              <div className="flex flex-col gap-4">
                {/* Date & Time row */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Date</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Time</span>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      step={
                        settings?.slotIntervalMins
                          ? settings.slotIntervalMins * 60
                          : 900
                      }
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                </div>

                {/* Party size & Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Party size ({minParty}–{maxParty})
                    </span>
                    <input
                      type="number"
                      min={minParty}
                      max={maxParty}
                      value={partySize}
                      onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Duration (min)</span>
                    <input
                      type="number"
                      min={15}
                      max={300}
                      step={15}
                      value={durationMins}
                      onChange={(e) => setDurationMins(parseInt(e.target.value) || 60)}
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                </div>

                {/* Customer */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Guest name *</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Smith"
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Phone</span>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+44 7..."
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Email</span>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="john@..."
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                </div>

                {/* Special requests */}
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Special requests</span>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={2}
                    placeholder="Dietary requirements, seating preferences..."
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </label>

                {/* Occasion */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Occasion (optional)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {occasions.map((o) => (
                      <button
                        key={o}
                        onClick={() => setOccasion(occasion === o ? "" : o)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize transition-all ${
                          occasion === o
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Reservation Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Guest</span>
                    <span className="font-medium text-foreground">{customerName}</span>
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium text-foreground">{date}</span>
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium text-foreground">{time}</span>
                    <span className="text-muted-foreground">Party</span>
                    <span className="font-medium text-foreground">{partySize} guests</span>
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium text-foreground">{durationMins} mins</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                  <div className="flex items-center gap-2">
                    <IconCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Table will be automatically assigned
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <IconAlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            {step === 2 ? (
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
            ) : (
              <div />
            )}

            {step === 1 ? (
              <Button variant="terracotta" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button variant="terracotta" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Confirm Reservation"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
