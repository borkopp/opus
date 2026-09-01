"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { publicBookingErrorMessage } from "@/lib/public-booking-errors";
import { dateInTimezone } from "@/lib/public-booking-format";
import { BookingConfirmationStep } from "./BookingConfirmationStep";
import { BookingStepProgress, type BookingStep } from "./BookingStepProgress";
import { CustomerDetailsStep } from "./CustomerDetailsStep";
import { DateTimeSelectionStep } from "./DateTimeSelectionStep";
import { OtpVerificationStep } from "./OtpVerificationStep";
import { ServiceSelectionStep } from "./ServiceSelectionStep";
import { StaffSelectionStep } from "./StaffSelectionStep";
import type { PublicSite } from "./types";
import posthog from "posthog-js";

interface BookingFormProps {
  site: PublicSite;
  initialServiceId?: string;
  initialStaffId?: string;
}

type BookingResult = {
  bookingId: string;
  serviceName: string;
  staffName: string;
  startAt: number;
  endAt: number;
  priceMinorUnits: number;
  currency: string;
};

type PendingBooking = {
  challengeId: Id<"booking_email_verifications">;
  expiresAt: number;
  resendAfter: number;
  orgId: Id<"orgs">;
  serviceId: Id<"services">;
  staffId: Id<"staff_members">;
  startAt: number;
  customerName: string;
  customerPhone?: string;
  customerEmail: string;
  customerNote?: string;
};

export function BookingForm({
  site,
  initialServiceId,
  initialStaffId,
}: BookingFormProps) {
  const router = useRouter();
  const initialService = site.services.find(
    (service) => service._id === initialServiceId,
  );
  const initialStaff =
    initialStaffId === "any"
      ? "any"
      : site.staff.some((member) => member._id === initialStaffId)
        ? initialStaffId
        : undefined;
  const compatibleInitialStaff =
    initialService && initialStaff
      ? initialStaff === "any" ||
        (initialService.staffIds as string[]).includes(initialStaff)
        ? initialStaff
        : undefined
      : initialStaff;
  const initialStep: BookingStep = initialService
    ? compatibleInitialStaff
      ? "datetime"
      : "staff"
    : "service";
  const today = useMemo(
    () => dateInTimezone(new Date(), site.bookingSettings.timezone),
    [site.bookingSettings.timezone],
  );

  const [currentStep, setCurrentStep] = useState<BookingStep>(initialStep);
  const [selectedServiceId, setSelectedServiceId] = useState<
    string | undefined
  >(initialService?._id);
  const [selectedStaffId, setSelectedStaffId] = useState<
    string | "any" | undefined
  >(compatibleInitialStaff);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlotTimestamp, setSelectedSlotTimestamp] = useState<
    number | null
  >(null);
  const [selectedSlotStaffId, setSelectedSlotStaffId] = useState<string | null>(
    null,
  );
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(
    null,
  );
  const [otp, setOtp] = useState("");
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(
    null,
  );

  const requestBookingEmailOtp = useAction(
    api.publicBooking.requestBookingEmailOtp,
  );
  const confirmPublicBooking = useAction(
    api.publicBooking.confirmPublicBooking,
  );
  const selectedService = site.services.find(
    (service) => service._id === selectedServiceId,
  );
  const completedSteps = useMemo(() => {
    const completed = new Set<BookingStep>();
    if (selectedServiceId) completed.add("service");
    if (selectedServiceId && selectedStaffId) completed.add("staff");
    if (selectedSlotTimestamp && selectedSlotStaffId) {
      completed.add("datetime");
    }
    if (customerName.trim() && customerEmail.trim()) completed.add("details");
    return completed;
  }, [
    customerEmail,
    customerName,
    selectedServiceId,
    selectedSlotStaffId,
    selectedSlotTimestamp,
    selectedStaffId,
  ]);

  const scrollToFlowStart = () => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  };

  const goToStep = (step: BookingStep) => {
    setCurrentStep(step);
    setError(null);
    scrollToFlowStart();
  };

  const resetSlot = () => {
    setSelectedSlotTimestamp(null);
    setSelectedSlotStaffId(null);
  };

  const handleSelectService = (serviceId: string) => {
    const service = site.services.find(
      (candidate) => candidate._id === serviceId,
    );
    if (!service) return;

    setSelectedServiceId(serviceId);
    resetSlot();
    setError(null);

    const currentStaffStillEligible =
      selectedStaffId === "any" ||
      (selectedStaffId &&
        (service.staffIds as string[]).includes(selectedStaffId));

    if (currentStaffStillEligible) {
      setCurrentStep("datetime");
      scrollToFlowStart();
      return;
    }

    setSelectedStaffId(undefined);
    setCurrentStep("staff");
    scrollToFlowStart();
  };

  const handleSelectStaff = (staffId: string | "any") => {
    setSelectedStaffId(staffId);
    resetSlot();
    setError(null);
    setCurrentStep("datetime");
    scrollToFlowStart();
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    resetSlot();
    setError(null);
  };

  const handleSelectSlot = (startAt: number, staffId: string) => {
    setSelectedSlotTimestamp(startAt);
    setSelectedSlotStaffId(staffId);
    setError(null);
  };

  const handleContinueToDetails = () => {
    if (!selectedSlotTimestamp || !selectedSlotStaffId) return;
    setCurrentStep("details");
    setError(null);
    scrollToFlowStart();
  };

  const handleSubmitDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedService || !selectedSlotTimestamp || !selectedSlotStaffId) {
      setError("Изберете услуга, специјалист и слободен термин.");
      return;
    }

    const normalizedName = customerName.trim();
    const normalizedEmail = customerEmail.trim().toLowerCase();
    if (normalizedName.length < 2) {
      setError("Внесете име и презиме.");
      return;
    }
    if (!normalizedEmail) {
      setError("Внесете е-пошта за да го потврдите терминот.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const challenge = await requestBookingEmailOtp({
        orgId: site._id,
        email: normalizedEmail,
      });

      setPendingBooking({
        ...challenge,
        orgId: site._id,
        serviceId: selectedService._id,
        staffId: selectedSlotStaffId as Id<"staff_members">,
        startAt: selectedSlotTimestamp,
        customerName: normalizedName,
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: normalizedEmail,
        customerNote: customerNote.trim() || undefined,
      });
      setOtp("");
      scrollToFlowStart();
    } catch (caught) {
      setError(publicBookingErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingBooking || otp.length !== 6) {
      setError("Внесете го шестцифрениот код од е-поштата.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await confirmPublicBooking({
        orgId: pendingBooking.orgId,
        serviceId: pendingBooking.serviceId,
        staffId: pendingBooking.staffId,
        startAt: pendingBooking.startAt,
        customerName: pendingBooking.customerName,
        customerPhone: pendingBooking.customerPhone,
        customerEmail: pendingBooking.customerEmail,
        customerNote: pendingBooking.customerNote,
        challengeId: pendingBooking.challengeId,
        otp,
      });

      posthog.capture("public_booking_confirmed", {
        duration_mins: selectedService?.durationMins,
        price_minor_units: result.priceMinorUnits,
        currency: result.currency,
      });
      setBookingResult(result);
      setPendingBooking(null);
      scrollToFlowStart();
    } catch (caught) {
      setError(publicBookingErrorMessage(caught));
      setOtp("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingBooking) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const challenge = await requestBookingEmailOtp({
        orgId: pendingBooking.orgId,
        email: pendingBooking.customerEmail,
      });
      setPendingBooking((current) =>
        current ? { ...current, ...challenge } : current,
      );
      setOtp("");
    } catch (caught) {
      setError(publicBookingErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookAnother = () => {
    setBookingResult(null);
    setPendingBooking(null);
    setSelectedServiceId(undefined);
    setSelectedStaffId(undefined);
    setSelectedDate(today);
    resetSlot();
    setOtp("");
    setError(null);
    setCurrentStep("service");
    scrollToFlowStart();
  };

  if (bookingResult) {
    return (
      <main className="min-h-[calc(100vh-9rem)] bg-secondary/45">
        <BookingConfirmationStep
          site={site}
          result={bookingResult}
          customerEmail={customerEmail}
          onBookAnother={handleBookAnother}
        />
      </main>
    );
  }

  if (pendingBooking) {
    const staffName =
      site.staff.find((member) => member._id === pendingBooking.staffId)
        ?.displayName || "Специјалист";

    return (
      <main className="min-h-[calc(100vh-9rem)] bg-secondary/45">
        <OtpVerificationStep
          customerEmail={pendingBooking.customerEmail}
          serviceName={selectedService?.name || "Услуга"}
          staffName={staffName}
          startAt={pendingBooking.startAt}
          otp={otp}
          expiresAt={pendingBooking.expiresAt}
          resendAfter={pendingBooking.resendAfter}
          isSubmitting={isSubmitting}
          error={error}
          onChangeOtp={(value) => {
            setOtp(value);
            setError(null);
          }}
          onSubmit={handleSubmitOtp}
          onResend={handleResendOtp}
          onBack={() => {
            setPendingBooking(null);
            setOtp("");
            setError(null);
            scrollToFlowStart();
          }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-9rem)] bg-secondary/45">
      <BookingStepProgress
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
        disabled={isSubmitting}
      />

      {currentStep === "service" && (
        <ServiceSelectionStep
          site={site}
          selectedStaffId={selectedStaffId}
          selectedServiceId={selectedServiceId}
          onSelectService={handleSelectService}
          onBack={() => router.push("/")}
        />
      )}

      {currentStep === "staff" && selectedServiceId && (
        <StaffSelectionStep
          site={site}
          selectedServiceId={selectedServiceId}
          selectedStaffId={selectedStaffId}
          onSelectStaff={handleSelectStaff}
          onBack={() => goToStep("service")}
        />
      )}

      {currentStep === "datetime" && selectedServiceId && selectedStaffId && (
        <DateTimeSelectionStep
          site={site}
          selectedStaffId={selectedStaffId}
          selectedServiceId={selectedServiceId}
          selectedDate={selectedDate}
          selectedSlotTimestamp={selectedSlotTimestamp}
          onSelectDate={handleSelectDate}
          onSelectSlot={handleSelectSlot}
          onContinue={handleContinueToDetails}
          onBack={() => goToStep("staff")}
        />
      )}

      {currentStep === "details" &&
        selectedServiceId &&
        selectedSlotTimestamp &&
        selectedSlotStaffId && (
          <CustomerDetailsStep
            site={site}
            selectedStaffId={selectedSlotStaffId}
            selectedServiceId={selectedServiceId}
            selectedSlotTimestamp={selectedSlotTimestamp}
            customerName={customerName}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            customerNote={customerNote}
            isSubmitting={isSubmitting}
            error={error}
            onChangeName={setCustomerName}
            onChangeEmail={setCustomerEmail}
            onChangePhone={setCustomerPhone}
            onChangeNote={setCustomerNote}
            onSubmit={handleSubmitDetails}
            onBack={() => goToStep("datetime")}
          />
        )}
    </main>
  );
}
