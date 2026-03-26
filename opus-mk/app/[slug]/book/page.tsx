"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { toast } from "sonner";
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconCalendar,
  IconUser,
  IconCash,
  IconCreditCard,
  IconCircleCheck,
  IconConfetti,
} from "@tabler/icons-react";

// ── Step definitions ──
type BookingStep = "service" | "datetime" | "details" | "confirmed";

export default function BookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const profile = useQuery(api.public.getPublicProfile, { slug });
  const createBooking = useMutation(api.publicBooking.createPublicBooking);

  const getImageUrl = (urlOrId?: string) => {
    if (!urlOrId) return undefined;
    if (urlOrId.startsWith("http")) return urlOrId;
    return `https://${process.env.NEXT_PUBLIC_CONVEX_URL?.split("//")[1]}/api/storage/${urlOrId}`;
  };

  // ── State ──
  const preselectedServiceId = searchParams.get("service");
  const [step, setStep] = useState<BookingStep>(preselectedServiceId ? "datetime" : "service");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(preselectedServiceId);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<any | null>(null);

  // ── Derived data ──
  const selectedService = profile?.services.find((s) => s._id === selectedServiceId);

  // Build date options (next 14 days)
  const dateOptions = useMemo(() => {
    const dates: { label: string; value: string; date: Date }[] = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      dates.push({
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE, MMM d"),
        value: format(d, "yyyy-MM-dd"),
        date: d,
      });
    }
    return dates;
  }, []);

  // Available slots for selected date
  const slots = useQuery(
    api.publicBooking.getPublicSlots,
    profile && selectedServiceId && selectedDate
      ? {
          orgId: profile._id,
          serviceId: selectedServiceId as Id<"services">,
          staffId: selectedStaffId ? (selectedStaffId as Id<"staff_members">) : ("any" as const),
          date: selectedDate,
        }
      : "skip"
  );

  // ── Loading ──
  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <Skeleton className="h-5 w-32" />
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <p className="text-lg font-semibold">Business not found</p>
        <Link href="/">
          <Button variant="outline" className="mt-4 rounded-full">Back to discover</Button>
        </Link>
      </div>
    );
  }

  // ── Handlers ──
  const handleSelectService = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSelectedSlot(null);
    setSelectedDate(null);
    setStep("datetime");
  };

  const handleSelectSlot = (slot: any) => {
    setSelectedSlot(slot);
    setStep("details");
  };

  const handleSubmitBooking = async () => {
    if (!selectedServiceId || !selectedSlot || !customerName.trim() || !customerPhone.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Pick a staff member from available — prefer selected, else first available
      const staffId = selectedStaffId || selectedSlot.availableStaffIds[0];

      const result = await createBooking({
        orgId: profile._id,
        serviceId: selectedServiceId as Id<"services">,
        staffId: staffId as Id<"staff_members">,
        startAt: selectedSlot.startAt,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        paymentMethod: "cash",
      });

      setConfirmation(result);
      setStep("confirmed");
    } catch (error: any) {
      toast.error(error.data || error.message || "Booking failed. Please try again.");
    }
    setIsSubmitting(false);
  };

  // ── Step indicator ──
  const steps = [
    { key: "service", label: "Service" },
    { key: "datetime", label: "Date & Time" },
    { key: "details", label: "Details" },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {step === "confirmed" ? (
            <Link href={`/${slug}`} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <IconArrowLeft size={20} />
            </Link>
          ) : step === "service" ? (
            <Link href={`/${slug}`} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <IconArrowLeft size={20} />
            </Link>
          ) : (
            <button
              onClick={() => {
                if (step === "datetime") setStep("service");
                if (step === "details") setStep("datetime");
              }}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <IconArrowLeft size={20} />
            </button>
          )}
          <span className="text-sm font-medium">Book at {profile.name}</span>
        </div>

        {/* Step indicator */}
        {step !== "confirmed" && (
          <div className="max-w-3xl mx-auto px-4 pb-3">
            <div className="flex items-center gap-1.5">
              {steps.map((s, i) => (
                <div
                  key={s.key}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= currentStepIndex ? "bg-primary" : "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* ── STEP 1: Service Selection ── */}
        {step === "service" && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Choose a service</h2>
            <p className="text-sm text-muted-foreground mb-6">Select the service you'd like to book.</p>
            <div className="space-y-2">
              {profile.services.map((service) => (
                <button
                  key={service._id}
                  onClick={() => handleSelectService(service._id)}
                  className={`w-full text-left flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.98] ${
                    selectedServiceId === service._id
                      ? "border-primary bg-primary/5"
                      : "border-border/40 bg-card hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                    {service.photoUrl && (
                      <div className="w-12 h-12 rounded-lg bg-secondary shrink-0 overflow-hidden">
                        <img
                          src={getImageUrl(service.photoUrl)}
                          alt={service.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{service.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <IconClock size={12} />
                          {service.durationMins} min
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold shrink-0">
                    {formatPrice(service.priceMinorUnits, service.currency)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Date & Time ── */}
        {step === "datetime" && selectedService && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Pick a date & time</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {selectedService.name} · {selectedService.durationMins} min · {formatPrice(selectedService.priceMinorUnits, selectedService.currency)}
            </p>

            {/* Staff selector (optional — "Any" by default) */}
            {profile.staff.length > 1 && (
              <div className="mb-6">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Staff preference
                </Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => { setSelectedStaffId(null); setSelectedSlot(null); }}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      !selectedStaffId ? "border-primary bg-primary text-primary-foreground" : "border-border/60 hover:border-border"
                    }`}
                  >
                    Any available
                  </button>
                  {profile.staff.map((member) => (
                    <button
                      key={member._id}
                      onClick={() => { setSelectedStaffId(member._id); setSelectedSlot(null); }}
                      className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        selectedStaffId === member._id ? "border-primary bg-primary text-primary-foreground" : "border-border/60 hover:border-border"
                      }`}
                    >
                      {member.displayName.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date picker — horizontal scroll */}
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Date
            </Label>
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
              {dateOptions.map((d) => (
                <button
                  key={d.value}
                  onClick={() => { setSelectedDate(d.value); setSelectedSlot(null); }}
                  className={`shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl border text-center transition-all ${
                    selectedDate === d.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 hover:border-border"
                  }`}
                >
                  <span className="text-xs font-medium">{d.label.split(",")[0]}</span>
                  {d.label.includes(",") && (
                    <span className="text-[10px] opacity-70">{d.label.split(",")[1]?.trim()}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Time slots */}
            {selectedDate && (
              <>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Available times
                </Label>
                {slots === undefined ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-11 rounded-xl" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">No available times on this date.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Try another date or staff member.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((slot) => {
                      const time = new Date(slot.startAt);
                      const timeStr = `${String(time.getUTCHours()).padStart(2, "0")}:${String(time.getUTCMinutes()).padStart(2, "0")}`;
                      const isSelected = selectedSlot?.startAt === slot.startAt;

                      return (
                        <button
                          key={slot.startAt}
                          onClick={() => handleSelectSlot(slot)}
                          className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all active:scale-[0.96] ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/60 hover:border-border"
                          }`}
                        >
                          {timeStr}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Customer Details ── */}
        {step === "details" && selectedService && selectedSlot && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Your details</h2>
            <p className="text-sm text-muted-foreground mb-6">Almost done! Fill in your info to confirm.</p>

            {/* Booking summary */}
            <div className="rounded-xl border border-border/40 bg-card p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {format(new Date(selectedSlot.startAt), "EEE, MMM d")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">
                    {`${String(new Date(selectedSlot.startAt).getUTCHours()).padStart(2, "0")}:${String(new Date(selectedSlot.startAt).getUTCMinutes()).padStart(2, "0")}`}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">
                    {formatPrice(selectedSlot.priceMinorUnits, selectedService.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium mb-1.5 block">
                  Full name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-medium mb-1.5 block">
                  Phone number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+389 7X XXX XXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">
                  Email <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Payment method */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Payment</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3.5 rounded-xl border border-primary bg-primary/5">
                    <IconCash size={20} className="text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Pay in cash</p>
                      <p className="text-xs text-muted-foreground">Pay at the venue</p>
                    </div>
                    <IconCircleCheck size={20} className="text-primary" />
                  </div>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/40 opacity-50 cursor-not-allowed">
                    <IconCreditCard size={20} className="text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Pay online</p>
                      <p className="text-xs text-muted-foreground">Coming soon</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmitBooking}
                disabled={isSubmitting || !customerName.trim() || !customerPhone.trim()}
                className="w-full h-12 rounded-2xl text-base font-semibold mt-4"
              >
                {isSubmitting ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Confirmation ── */}
        {step === "confirmed" && confirmation && (
          <div className="flex flex-col items-center text-center pt-8">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
              <IconConfetti size={36} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Booking Confirmed!</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              You're all set. See you at <strong>{profile.name}</strong>.
            </p>

            <div className="w-full mt-8 rounded-xl border border-border/40 bg-card p-5">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{confirmation.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff</span>
                  <span className="font-medium">{confirmation.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {format(new Date(confirmation.startAt), "EEEE, MMMM d")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">
                    {`${String(new Date(confirmation.startAt).getUTCHours()).padStart(2, "0")}:${String(new Date(confirmation.startAt).getUTCMinutes()).padStart(2, "0")}`}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">
                    {formatPrice(confirmation.priceMinorUnits, confirmation.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="font-medium">Cash at venue</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 w-full mt-8">
              <Link href={`/${slug}`} className="flex-1">
                <Button variant="outline" className="w-full h-11 rounded-xl">
                  Back to {profile.name}
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full h-11 rounded-xl">
                  Explore more
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
