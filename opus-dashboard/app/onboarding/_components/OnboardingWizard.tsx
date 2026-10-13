"use client";

import {
  parseBillingCurrency,
  type BillingCurrency,
} from "../../../../shared/billing-currency";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import posthog from "posthog-js";
import { api } from "@/convex/_generated/api";
import { trackStudioRegistration } from "../../../../shared/analytics/meta-pixel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  ONBOARDING_STEPS,
  PRO_ONBOARDING_STEPS,
  onboardingStep,
  onboardingIndustry,
  onboardingChoicePath,
  hospitalityHome,
  type ActivationState,
  type BeautyCategory,
  type ServiceDraft,
  type WizardStep,
} from "@/lib/onboarding";
import type { BusinessLocation } from "@/lib/mapbox";
import {
  BILLING_PATH,
  upgradeDestination,
  upgradeLoginPath,
  withProTeamLimit,
} from "@/lib/upgrade";
import {
  parseProTeamLimit,
  type ProTeamLimit,
} from "../../../../shared/pro-pricing";
import { BusinessStep } from "./BusinessStep";
import { CategoryStep } from "./CategoryStep";
import { OwnerStep } from "./OwnerStep";
import { LocationStep } from "./LocationStep";
import { ServiceStep } from "./ServiceStep";
import { HoursStep, DAYS, type OpeningHour } from "./HoursStep";
import { ReviewStep } from "./ReviewStep";
import { BusinessTypeStep } from "./BusinessTypeStep";
import { OnboardingHeader } from "./OnboardingHeader";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { CreateVenue } from "@/components/reservations/CreateVenue";

function createDraft(state: ActivationState | null | undefined) {
  return {
    name: state?.org.name ?? "",
    category: state?.org.beautyCategory ?? null,
    ownerName: state?.ownerNameComplete ? (state.owner?.displayName ?? "") : "",
    location:
      state?.org.address && state.org.city && state.org.coordinates
        ? ({
            address: state.org.address,
            city: state.org.city,
            country: state.org.country ?? "MK",
            neighborhood: state.org.neighborhood ?? "",
            postalCode: state.org.postalCode ?? "",
            coordinates: state.org.coordinates,
            displayName: [state.org.address, state.org.city].join(", "),
          } as BusinessLocation)
        : null,
    service: {
      name: state?.firstService?.name ?? "",
      durationMins: state?.firstService?.durationMins ?? 30,
      price: state?.firstService
        ? (state.firstService.priceMinorUnits / 100).toFixed(2)
        : "",
    },
    hours: DAYS.map(
      (_, dayOfWeek) =>
        state?.org.openingHours?.find((day) => day.dayOfWeek === dayOfWeek) ?? {
          dayOfWeek,
          open: "09:00",
          close: "18:00",
          isClosed: dayOfWeek === 6,
        },
    ),
  };
}

export function OnboardingWizard() {
  const params = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );
  const venueAccess = useQuery(
    api.hospitality.getAccess,
    profile?.industry === "hospitality" ? {} : "skip",
  );
  const requestedStep = onboardingStep(params.get("step"));
  const upgrading = params.get("plan") === "pro";
  const teamLimit = parseProTeamLimit(params.get("team"));
  const currency = parseBillingCurrency(params.get("currency"));
  const selectedIndustry = profile?.orgId
    ? profile.industry
    : onboardingIndustry(params.get("industry"));
  const redirect =
    profile?.industry === "hospitality" && venueAccess
      ? hospitalityHome(venueAccess.onboardingComplete, profile.role)
      : profile?.orgId && profile.role !== "owner"
        ? profile.bookingAccess === "own"
          ? "/beauty/bookings"
          : "/beauty"
        : null;
  useEffect(() => {
    if (!isLoading && !isAuthenticated)
      router.replace(
        `/login?callbackUrl=${encodeURIComponent(`/onboarding${params.size ? `?${params.toString()}` : ""}`)}`,
      );
    else if (redirect) router.replace(redirect);
  }, [isLoading, isAuthenticated, router, params, redirect]);
  if (
    isLoading ||
    !isAuthenticated ||
    !profile ||
    redirect ||
    (profile.industry === "hospitality" && !venueAccess)
  )
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  const backToChoice = () =>
    router.push(onboardingChoicePath(params.toString()));
  if (!profile.orgId && selectedIndustry !== "beauty_wellness")
    return (
      <main className="min-h-dvh bg-background">
        <OnboardingHeader />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-8 pt-8 sm:px-8 sm:pb-16 sm:pt-12">
          {selectedIndustry === "hospitality" ? (
            <CreateVenue
              onBack={backToChoice}
              onCreated={() => router.replace("/hospitality")}
            />
          ) : (
            <BusinessTypeStep search={params.toString()} />
          )}
        </div>
      </main>
    );
  return (
    <OnboardingFlow
      key={`${profile.orgId ?? "new"}:${upgrading}:${requestedStep}:${teamLimit}:${currency}`}
      requestedStep={requestedStep}
      upgrading={upgrading}
      teamLimit={teamLimit}
      currency={currency}
      onBackToChoice={!profile.orgId ? backToChoice : undefined}
    />
  );
}

function OnboardingFlow({
  requestedStep,
  upgrading,
  teamLimit,
  currency,
  onBackToChoice,
}: {
  requestedStep: WizardStep | null;
  upgrading: boolean;
  teamLimit?: ProTeamLimit;
  currency?: BillingCurrency;
  onBackToChoice?: () => void;
}) {
  const { t } = useDashboardI18n();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );
  const state = useQuery(api.activation.getState, profile?.orgId ? {} : "skip");
  const [draft, setDraft] = useState<ReturnType<typeof createDraft> | null>(
    null,
  );
  const [manualStep, setManualStep] = useState(requestedStep);
  const startBusiness = useMutation(api.activation.startBeautyBusiness);
  const saveOwnerName = useMutation(api.activation.saveOwnerName);
  const saveLocation = useMutation(api.activation.saveLocation);
  const saveFirstService = useMutation(api.activation.saveFirstService);
  const saveHours = useMutation(api.activation.saveHours);

  useEffect(() => {
    if (!isLoading && !isAuthenticated)
      router.replace(
        upgrading ? upgradeLoginPath(teamLimit, currency) : "/login",
      );
  }, [isAuthenticated, isLoading, router, upgrading, teamLimit, currency]);
  const shouldLeave = upgrading
    ? profile &&
      upgradeDestination({
        hasStudio: Boolean(profile.orgId),
        role: profile.role,
        plan: profile.plan,
        operationalSetupComplete: state?.operationalSetupComplete ?? false,
      }) === BILLING_PATH
    : state?.onboardingComplete && !requestedStep;
  useEffect(() => {
    if (shouldLeave)
      router.replace(
        upgrading
          ? withProTeamLimit(BILLING_PATH, teamLimit, currency)
          : "/beauty",
      );
  }, [shouldLeave, upgrading, router, teamLimit, currency]);

  if (
    isLoading ||
    !isAuthenticated ||
    !profile ||
    (profile.orgId && !state) ||
    shouldLeave
  )
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );

  const current = draft ?? createDraft(state);
  const steps = upgrading ? PRO_ONBOARDING_STEPS : ONBOARDING_STEPS;
  const derived = state?.nextStep ?? "business";
  const selected = !profile.orgId
    ? "business"
    : !state?.org.beautyCategory && manualStep !== "business"
      ? "category"
      : !state?.ownerNameComplete &&
          manualStep !== "business" &&
          manualStep !== "category"
        ? "owner"
        : (manualStep ?? derived);
  const step =
    upgrading && selected === "review"
      ? derived === "review"
        ? "hours"
        : derived
      : selected;
  const index = steps.indexOf(step);
  const next = () =>
    setManualStep(steps[Math.min(index + 1, steps.length - 1)]);
  const back = () => setManualStep(steps[Math.max(index - 1, 0)]);
  const update = (patch: Partial<ReturnType<typeof createDraft>>) =>
    setDraft({ ...current, ...patch });

  async function saveName(name: string) {
    const result = await startBusiness({ name });
    if (result.created)
      trackStudioRegistration(
        process.env.NEXT_PUBLIC_META_PIXEL_ID,
        result.orgId,
      );
    update({ name });
    next();
  }
  async function saveCategory(category: BeautyCategory) {
    await startBusiness({ name: current.name, category });
    posthog.capture("onboarding_business_configured", { category });
    update({ category });
    next();
  }
  async function confirmLocation(location: BusinessLocation) {
    await saveLocation({
      address: location.address,
      city: location.city,
      neighborhood: location.neighborhood || undefined,
      postalCode: location.postalCode || undefined,
      country: location.country,
      coordinates: location.coordinates,
    });
    posthog.capture("onboarding_location_configured", {
      country: location.country,
      has_neighborhood: Boolean(location.neighborhood),
    });
    update({ location });
    next();
  }
  async function confirmOwnerName(ownerName: string) {
    await saveOwnerName({ name: ownerName });
    update({ ownerName });
    next();
  }
  async function confirmService(service: ServiceDraft) {
    await saveFirstService({
      serviceId: state?.firstService?._id,
      name: service.name,
      durationMins: service.durationMins,
      priceMinorUnits: Math.round(
        Number(service.price.replace(",", ".")) * 100,
      ),
    });
    posthog.capture("onboarding_first_service_configured", {
      duration_mins: service.durationMins,
      price_minor_units: Math.round(
        Number(service.price.replace(",", ".")) * 100,
      ),
    });
    update({ service });
    next();
  }
  async function confirmHours(hours: OpeningHour[]) {
    await saveHours({ openingHours: hours });
    posthog.capture("onboarding_hours_configured", {
      open_day_count: hours.filter((day) => !day.isClosed).length,
    });
    update({ hours });
    next();
  }

  return (
    <main className="min-h-dvh bg-background">
      <OnboardingHeader
        dashboardHref={state?.operationalSetupComplete ? "/beauty" : undefined}
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-8 pt-4 sm:px-8 sm:pb-16 sm:pt-8">
        {upgrading && (
          <Alert className="mb-6 max-w-xl">
            <AlertTitle data-replay-public>OPUS Pro</AlertTitle>
            <AlertDescription data-replay-public>
              {t(
                "Set up your studio, then review your subscription and confirm payment.",
                "Поставете го студиото, па прегледајте ја претплатата и потврдете го плаќањето.",
                "Konfiguroni studion tuaj, më pas rishikoni abonimin dhe konfirmoni pagesën.",
              )}
            </AlertDescription>
          </Alert>
        )}
        <OnboardingProgress
          step={index + 1}
          total={steps.length}
          label={t(
            "Studio setup",
            "Поставување на студиото",
            "Konfigurimi i studios",
          )}
          description={t(
            "Your booking website",
            "Вашата страница за закажување",
            "Faqja juaj e rezervimeve",
          )}
        />
        <div
          key={step}
          className="flex w-full min-w-0 items-start justify-center"
        >
          {step === "business" && (
            <BusinessStep
              name={current.name}
              onSaved={saveName}
              onBack={onBackToChoice}
            />
          )}
          {step === "category" && (
            <CategoryStep
              category={current.category}
              onBack={back}
              onSaved={saveCategory}
            />
          )}
          {step === "owner" && (
            <OwnerStep
              name={current.ownerName}
              onBack={back}
              onSaved={confirmOwnerName}
            />
          )}
          {step === "location" && state && (
            <LocationStep
              state={state}
              value={current.location}
              canGoBack
              onBack={back}
              onSaved={confirmLocation}
            />
          )}
          {step === "service" && (
            <ServiceStep
              value={current.service}
              category={current.category ?? "beauty_salon"}
              slotDurationMins={state?.settings?.slotDurationMins ?? 15}
              onBack={back}
              onSaved={confirmService}
              onImported={(service) => {
                update({ service });
                next();
              }}
            />
          )}
          {step === "hours" && (
            <HoursStep
              minimumDurationMins={current.service.durationMins}
              hours={current.hours}
              canGoBack
              onBack={back}
              onSaved={confirmHours}
            />
          )}
          {step === "review" && state && (
            <ReviewStep
              state={state}
              onBack={back}
              onPublished={() => router.replace("/beauty")}
            />
          )}
        </div>
      </div>
    </main>
  );
}
