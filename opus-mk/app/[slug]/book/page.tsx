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
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { toast } from "sonner";
import { useOpusUser } from "@/components/OpusUserContext";
import {
  IconArrowLeft,
  IconClock,
  IconCash,
  IconCircleCheck,
  IconConfetti,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

// ── Step definitions ──
type BookingStep = "service" | "datetime" | "details" | "confirmed";

function ConfettiTrigger() {
  useEffect(() => {
    const end = Date.now() + 2 * 1000;
    const colors = ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
    
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors
      });
    }, 200);
  }, []);
  return null;
}

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
  const [customerNote, setCustomerNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<any | null>(null);

  // ── Opus user context (pre-fill when signed in) ──
  const { isAuthenticated, opusUser } = useOpusUser();
  const [hasPreFilled, setHasPreFilled] = useState(false);

  useEffect(() => {
    if (isAuthenticated && opusUser && !hasPreFilled) {
      if (!customerName) setCustomerName(opusUser.name);
      if (!customerEmail) setCustomerEmail(opusUser.email);
      if (!customerPhone && opusUser.phone) setCustomerPhone(opusUser.phone);
      setHasPreFilled(true);
    }
  }, [isAuthenticated, opusUser, hasPreFilled, customerName, customerEmail, customerPhone]);

  // ── Derived data ──
  const selectedService = profile?.services.find((s: any) => s._id === selectedServiceId);

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
        customerNote: customerNote.trim() || undefined,
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
          {step === "confirmed" || step === "service" ? (
            <Link href={`/${slug}`} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" aria-label={`Back to ${profile.name}`}>
              <IconArrowLeft size={20} aria-hidden="true" />
            </Link>
          ) : (
            <button
              onClick={() => {
                if (step === "datetime") setStep("service");
                if (step === "details") setStep("datetime");
              }}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Go back"
            >
              <IconArrowLeft size={20} aria-hidden="true" />
            </button>
          )}
          <span className="text-sm font-medium">Book at {profile.name}</span>
        </div>

        {/* Step indicator */}
        {step !== "confirmed" && (
          <div className="max-w-3xl mx-auto px-4 pb-3">
            <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label={`Step ${currentStepIndex + 1} of ${steps.length}: ${steps[currentStepIndex].label}`}>
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
          <div className="animate-slide-up-fade-in group/step">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight mb-2">Choose a Service</h2>
              <p className="text-muted-foreground">Select the service you'd like to book to continue.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.services.map((service: any) => (
                <button
                  key={service._id}
                  onClick={() => handleSelectService(service._id)}
                  className={`group relative text-left flex flex-col p-5 rounded-3xl transition-all duration-300 outline-none ${
                    selectedServiceId === service._id
                      ? "bg-primary shadow-lg shadow-primary/20 scale-[0.98] ring-2 ring-primary"
                      : "bg-card hover:bg-secondary/40 ring-1 ring-border/50 hover:ring-border hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between w-full mb-4">
                    {service.photoUrl ? (
                      <div className="w-14 h-14 rounded-2xl bg-muted shrink-0 overflow-hidden relative shadow-sm border border-border/20">
                        <Image
                          src={getImageUrl(service.photoUrl)!}
                          alt={service.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          sizes="56px"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm border border-primary/20">
                        <span className="font-bold text-xl">{service.name.charAt(0)}</span>
                      </div>
                    )}
                    
                    {/* Floating price tag */}
                    <div className={`px-3 py-1 rounded-full text-sm font-bold tracking-tight shrink-0 transition-colors ${
                      selectedServiceId === service._id
                        ? "bg-primary-foreground text-primary" 
                        : "bg-background shadow-sm border border-border/50 text-foreground group-hover:border-primary/30"
                    }`}>
                      {formatPrice(service.priceMinorUnits, service.currency)}
                    </div>
                  </div>

                  <div className="flex flex-col w-full">
                    <p className={`text-lg font-semibold leading-tight mb-1.5 transition-colors ${
                      selectedServiceId === service._id ? "text-primary-foreground" : "text-foreground"
                    }`}>
                      {service.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-auto">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                        selectedServiceId === service._id ? "text-primary-foreground/80" : "text-muted-foreground group-hover:text-foreground"
                      }`}>
                        <IconClock size={14} className={selectedServiceId === service._id ? "text-primary-foreground/80" : "text-primary/70"} aria-hidden="true" />
                        {service.durationMins} min
                      </div>
                    </div>
                  </div>

                  {/* Absolute positioned gradient overlay on hover (subtle gloss) */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/0 via-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none dark:to-white/5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Date & Time ── */}
        {step === "datetime" && selectedService && (
          <div className="animate-slide-up-fade-in group/step">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight mb-2">Date & Time</h2>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/40 text-xs font-semibold text-muted-foreground border border-border/40">
                <span className="flex items-center gap-1.5"><IconClock size={14} className="text-primary" /> {selectedService.durationMins} min</span>
                <span className="w-1 h-1 rounded-full bg-border/80" />
                <span className="text-foreground">{formatPrice(selectedService.priceMinorUnits, selectedService.currency)}</span>
              </div>
            </div>

            {/* Staff selector (optional — "Any" by default) */}
            {profile.staff.length > 1 && (
              <div className="mb-8 animate-fade-in">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
                  With whom?
                </Label>
                <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                  <button
                    onClick={() => { setSelectedStaffId(null); setSelectedSlot(null); }}
                    aria-pressed={!selectedStaffId}
                    className={`relative shrink-0 flex items-center justify-center min-w-[90px] px-4 h-11 rounded-full text-sm font-semibold transition-all duration-300 ${
                      !selectedStaffId
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                        : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent hover:border-border/50"
                    }`}
                  >
                    Any Staff
                  </button>
                  {profile.staff.map((member: any) => (
                    <button
                      key={member._id}
                      onClick={() => { setSelectedStaffId(member._id); setSelectedSlot(null); }}
                      aria-pressed={selectedStaffId === member._id}
                      className={`relative shrink-0 flex gap-2 items-center justify-center min-w-[90px] px-4 h-11 rounded-full text-sm font-semibold transition-all duration-300 ${
                        selectedStaffId === member._id
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                          : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent hover:border-border/50"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center text-[10px] uppercase font-bold flex-shrink-0">
                        {member.displayName.charAt(0)}
                      </div>
                      {member.displayName.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date picker */}
            <div className="mb-8 relative auto-rows-min">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Select Date
                </Label>
                {selectedDate && <span className="text-xs font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full">{format(new Date(selectedDate), "MMMM yyyy")}</span>}
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-4 -mx-4 px-4 md:grid md:grid-cols-7 md:mx-0 md:px-0 md:gap-3 items-stretch relative">
                {/* Visual fade edges on mobile */}
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent md:hidden z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent md:hidden z-10 pointer-events-none" />
                
                {dateOptions.map((d) => {
                  const isSelected = selectedDate === d.value;
                  const displayDayStr = d.label === "Today" ? "Today" : d.label === "Tomorrow" ? "Tmrw" : format(d.date, "EEE");
                  const displayNumStr = format(d.date, "d");

                  return (
                    <button
                      key={d.value}
                      onClick={() => { setSelectedDate(d.value); setSelectedSlot(null); }}
                      aria-pressed={isSelected}
                      className={`shrink-0 relative group flex flex-col items-center justify-center w-[4.5rem] md:w-full py-3.5 rounded-2xl transition-all duration-300 outline-none ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.05] z-10"
                          : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40 hover:text-foreground border border-transparent hover:border-border/50 focus-visible:ring-2 focus-visible:ring-primary"
                      }`}
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 transition-colors ${isSelected ? "text-primary-foreground/80" : ""}`}>
                        {displayDayStr}
                      </span>
                      <span className={`text-2xl font-bold font-display tracking-tighter ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                        {displayNumStr}
                      </span>
                      {isSelected && (
                         <div className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            <div className="relative min-h-[120px] transition-all">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
                {selectedDate ? "Available Times" : "Time"}
              </Label>
              
              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-border/60 bg-secondary/5">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                    <IconClock size={20} className="text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Choose a date to see available times</p>
                </div>
              ) : slots === undefined ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-2xl" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-border/60 bg-secondary/5">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <IconClock size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-semibold">Fully booked</p>
                  <p className="text-sm text-muted-foreground mt-1 text-center max-w-[250px]">No time slots available on this date. Please select another date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 animate-slide-up-fade-in">
                  {slots.map((slot: any) => {
                    const time = new Date(slot.startAt);
                    const timeStr = `${String(time.getUTCHours()).padStart(2, "0")}:${String(time.getUTCMinutes()).padStart(2, "0")}`;
                    const isSelected = selectedSlot?.startAt === slot.startAt;

                    return (
                      <button
                        key={slot.startAt}
                        onClick={() => handleSelectSlot(slot)}
                        aria-pressed={isSelected}
                        className={`group relative h-12 w-full flex items-center justify-center rounded-2xl text-[15px] font-semibold transition-all duration-300 outline-none ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-105 z-10"
                            : "bg-secondary/30 text-foreground hover:bg-secondary/60 hover:scale-[1.02] active:scale-[0.98] border border-transparent hover:border-border/50"
                        }`}
                      >
                         <span>{timeStr}</span>
                         <span className="absolute inset-0 rounded-2xl ring-2 ring-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Customer Details ── */}
        {step === "details" && selectedService && selectedSlot && (
          <div className="animate-slide-up-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight mb-2">Review & Confirm</h2>
              <p className="text-muted-foreground">Please provide your details to finalize the appointment.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px]">
              {/* Left Column: Form */}
              <div className="flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="group/input relative">
                    <Input
                      id="name"
                      placeholder=" "
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      aria-required="true"
                      autoComplete="name"
                      className="peer h-[3.5rem] rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all text-base px-4 pt-5 pb-1 placeholder:text-transparent"
                    />
                    <Label
                      htmlFor="name"
                      className="absolute left-4 top-4 text-muted-foreground text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-primary peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[11px] font-medium cursor-text"
                    >
                      Full Name
                    </Label>
                  </div>
                  
                  <div className="group/input relative">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder=" "
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                      aria-required="true"
                      autoComplete="tel"
                      className="peer h-[3.5rem] rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all text-base px-4 pt-5 pb-1 placeholder:text-transparent"
                    />
                    <Label
                      htmlFor="phone"
                      className="absolute left-4 top-4 text-muted-foreground text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-primary peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[11px] font-medium cursor-text"
                    >
                      Phone Number
                    </Label>
                  </div>
                  
                  <div className="group/input relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder=" "
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      autoComplete="email"
                      className="peer h-[3.5rem] rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all text-base px-4 pt-5 pb-1 placeholder:text-transparent"
                    />
                    <Label
                      htmlFor="email"
                      className="absolute left-4 top-4 text-muted-foreground text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-primary peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[11px] font-medium cursor-text"
                    >
                      Email <span className="opacity-60 font-normal">(Optional)</span>
                    </Label>
                  </div>
                  
                  <div className="group/input relative">
                    <textarea
                      id="note"
                      placeholder=" "
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      className="peer min-h-[4rem] w-full resize-none rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all text-base px-4 pt-5 pb-2 placeholder:text-transparent outline-none flex"
                      rows={2}
                    />
                    <Label
                      htmlFor="note"
                      className="absolute left-4 top-4 text-muted-foreground text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-primary peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[11px] font-medium cursor-text"
                    >
                      Note <span className="opacity-60 font-normal">(Optional)</span>
                    </Label>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Payment</h3>
                  <div className="grid gap-3">
                    <label className="relative flex cursor-pointer items-center justify-between rounded-xl border-2 border-primary bg-primary/5 p-4 shadow-sm transition-all hover:bg-primary/10">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-primary/20 p-2 text-primary">
                          <IconCash size={20} aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">Pay in cash</p>
                          <p className="text-xs text-muted-foreground">Pay at the studio</p>
                        </div>
                      </div>
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <IconCircleCheck size={14} />
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div className="flex flex-col h-full mt-2 md:mt-0">
                <div className="rounded-2xl border border-border/40 bg-card shadow-sm h-full flex flex-col overflow-hidden">
                  <div className="bg-secondary/20 p-5 flex flex-col flex-1 relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <IconCircleCheck size={100} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                        {selectedService.photoUrl ? (
                           <div className="h-14 w-14 overflow-hidden rounded-xl bg-muted shrink-0 relative shadow-sm border border-border/20">
                              <Image src={getImageUrl(selectedService.photoUrl)!} alt={selectedService.name} fill className="object-cover" sizes="56px" />
                           </div>
                        ) : (
                           <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm border border-primary/20">
                             <span className="font-bold text-lg">{selectedService.name.charAt(0)}</span>
                           </div>
                        )}
                        <div>
                          <h3 className="font-semibold">{selectedService.name}</h3>
                          <p className="text-muted-foreground text-xs flex items-center gap-1.5 mt-0.5 font-medium">
                            <IconClock size={12} /> {selectedService.durationMins} min
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 text-sm mt-auto border-t border-border/40 pt-4">
                        <div className="flex justify-between items-center group/item transition-colors">
                           <span className="text-muted-foreground font-medium">When</span>
                           <div className="text-right">
                             <div className="font-semibold text-foreground group-hover/item:text-primary transition-colors">{format(new Date(selectedSlot.startAt), "EEEE, MMM d")}</div>
                             <div className="text-muted-foreground text-xs font-medium">
                               {`${String(new Date(selectedSlot.startAt).getUTCHours()).padStart(2, "0")}:${String(new Date(selectedSlot.startAt).getUTCMinutes()).padStart(2, "0")}`}
                             </div>
                           </div>
                        </div>
                        
                        <div className="flex justify-between items-end pt-2">
                          <span className="text-muted-foreground font-medium">Total amount</span>
                          <span className="text-xl font-bold tracking-tight text-foreground">
                            {formatPrice(selectedSlot.priceMinorUnits, selectedService.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-secondary/5 border-t border-border/40 mt-auto">
                    <Button
                      onClick={handleSubmitBooking}
                      disabled={isSubmitting || !customerName.trim() || !customerPhone.trim()}
                      className="w-full h-12 rounded-xl text-sm font-semibold bg-cta text-cta-foreground hover:bg-cta/90 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-cta/20"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                      <span className="relative flex items-center justify-center gap-2">
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Confirming...
                          </>
                        ) : (
                          <>
                            Confirm Booking
                            <IconArrowLeft className="rotate-180 transition-transform group-hover:translate-x-0.5" size={16} />
                          </>
                        )}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Confirmation ── */}
        {step === "confirmed" && confirmation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center pt-10 pb-8"
          >
            <ConfettiTrigger />

            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
              className="w-24 h-24 rounded-full bg-success flex items-center justify-center mb-8 relative shadow-xl shadow-success/20 text-success-foreground"
            >
              <IconConfetti size={44} aria-hidden="true" />
              <motion.div 
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border-[3px] border-success/40"
              />
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: "spring", damping: 15 }}
              className="text-4xl font-black tracking-tight mb-3 font-display"
            >
              Booking Confirmed!
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: "spring", damping: 15 }}
              className="text-muted-foreground text-lg mb-10 max-w-sm"
            >
              You're all set! We look forward to seeing you at <strong>{profile.name}</strong>.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: "spring", damping: 20 }}
              className="w-full max-w-sm rounded-[2rem] bg-card border border-border/40 shadow-sm overflow-hidden"
            >
              {/* Receipt Header Style */}
              <div className="bg-secondary/20 p-6 flex items-center gap-4 border-b border-dashed border-border/60 relative">
                <div className="absolute left-0 bottom-0 w-6 h-6 -translate-x-1/2 translate-y-1/2 rounded-full bg-background border-r border-border/40 z-10" />
                <div className="absolute right-0 bottom-0 w-6 h-6 translate-x-1/2 translate-y-1/2 rounded-full bg-background border-l border-border/40 z-10" />

                {selectedService?.photoUrl ? (
                  <div className="h-16 w-16 overflow-hidden rounded-[1.25rem] bg-muted shrink-0 relative shadow-sm border border-border/20">
                    <Image src={getImageUrl(selectedService.photoUrl)!} alt={confirmation.serviceName} fill className="object-cover transition-transform duration-700 hover:scale-110" sizes="64px" />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-[1.25rem] bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm border border-primary/20">
                    <span className="font-bold text-2xl">{confirmation.serviceName.charAt(0)}</span>
                  </div>
                )}
                
                <div className="text-left flex-1 min-w-0">
                  <h3 className="font-bold text-[17px] leading-tight mb-1 truncate">{confirmation.serviceName}</h3>
                  <p className="text-muted-foreground text-sm font-medium">
                    with {confirmation.staffName.split(" ")[0]}
                  </p>
                </div>
              </div>
              
              <div className="p-7 bg-card space-y-5 text-[15px] relative">
                <div className="flex justify-between items-center group/item hover:bg-secondary/40 -mx-3 px-3 py-1.5 rounded-lg transition-colors">
                  <span className="text-muted-foreground font-medium flex items-center gap-2"><IconClock size={16} /> Date & Time</span>
                  <div className="text-right">
                    <div className="font-bold text-foreground">{format(new Date(confirmation.startAt), "MMM d, yyyy")}</div>
                    <div className="text-muted-foreground font-semibold text-sm mt-0.5">{`${String(new Date(confirmation.startAt).getUTCHours()).padStart(2, "0")}:${String(new Date(confirmation.startAt).getUTCMinutes()).padStart(2, "0")}`}</div>
                  </div>
                </div>
                
                <Separator className="border-dashed my-2" />
                
                <div className="flex justify-between items-center -mx-3 px-3 py-1.5 rounded-lg">
                  <span className="text-muted-foreground font-medium">Total Price</span>
                  <span className="font-black text-xl text-foreground tracking-tight">
                    {formatPrice(confirmation.priceMinorUnits, confirmation.currency)}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, type: "spring", damping: 15 }}
              className="flex gap-4 w-full max-w-sm mt-10"
            >
              <Link href={`/${slug}`} className="flex-1">
                <Button variant="outline" className="w-full h-14 rounded-2xl font-bold bg-background hover:bg-secondary/50 border-border/60 hover:border-border transition-all">
                  Back to Hub
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button className="w-full h-14 rounded-2xl font-bold tracking-wide shadow-sm hover:shadow-md transition-all">
                  Done
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
