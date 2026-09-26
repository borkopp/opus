"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Store } from "lucide-react";
import posthog from "posthog-js";
import { api } from "@/convex/_generated/api";
import { trackStudioRegistration } from "../../../../shared/analytics/meta-pixel";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  ONBOARDING_STEPS,
  PRO_ONBOARDING_STEPS,
  onboardingStep,
  type ActivationState,
  type BeautyCategory,
  type ServiceDraft,
  type WizardStep,
} from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import type { BusinessLocation } from "@/lib/mapbox";
import {
  BILLING_PATH,
  upgradeDestination,
  UPGRADE_LOGIN_PATH,
} from "@/lib/upgrade";
import { BusinessStep } from "./BusinessStep";
import { LocationStep } from "./LocationStep";
import { ServiceStep } from "./ServiceStep";
import { HoursStep, DAYS, type OpeningHour } from "./HoursStep";
import { ReviewStep } from "./ReviewStep";

function createDraft(state: ActivationState | null | undefined) {
  return {
    name: state?.org.name ?? "",
    category: state?.org.beautyCategory ?? ("beauty_salon" as BeautyCategory),
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
  const requestedStep = onboardingStep(params.get("step"));
  const upgrading = params.get("plan") === "pro";
  return (
    <OnboardingFlow
      key={`${upgrading}:${requestedStep}`}
      requestedStep={requestedStep}
      upgrading={upgrading}
    />
  );
}

function OnboardingFlow({
  requestedStep,
  upgrading,
}: {
  requestedStep: WizardStep | null;
  upgrading: boolean;
}) {
  const { t, language, setLanguage } = useDashboardI18n();
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
  const saveLocation = useMutation(api.activation.saveLocation);
  const saveFirstService = useMutation(api.activation.saveFirstService);
  const saveHours = useMutation(api.activation.saveHours);

  useEffect(() => {
    if (!isLoading && !isAuthenticated)
      router.replace(upgrading ? UPGRADE_LOGIN_PATH : "/login");
  }, [isAuthenticated, isLoading, router, upgrading]);
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
    if (shouldLeave) router.replace(upgrading ? BILLING_PATH : "/beauty");
  }, [shouldLeave, upgrading, router]);

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
  const selected = !profile.orgId ? "business" : (manualStep ?? derived);
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

  async function saveBusiness(name: string, category: BeautyCategory) {
    const result = await startBusiness({ name, category });
    if (result.created)
      trackStudioRegistration(
        process.env.NEXT_PUBLIC_META_PIXEL_ID,
        result.orgId,
      );
    posthog.capture("onboarding_business_configured", { category });
    update({ name, category });
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
      <header className="px-4 py-4 sm:px-8 sm:py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo className="text-2xl" />
          <div className="flex items-center gap-1">
            <Button
              data-replay-public
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => setLanguage(language === "mk" ? "en" : "mk")}
              aria-label={t("Switch to Macedonian", "Промени на англиски")}
            >
              {language === "mk" ? "EN" : "МК"}
            </Button>
            {state?.operationalSetupComplete && (
              <Button asChild variant="ghost" className="min-h-11">
                <Link href="/beauty">
                  <Store />
                  <span data-replay-public className="sr-only sm:not-sr-only">
                    {t("Dashboard", "Контролна табла")}
                  </span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-8 pt-4 sm:px-8 sm:pb-16 sm:pt-8">
        {upgrading && (
          <Alert className="mb-6 max-w-xl">
            <AlertTitle data-replay-public>OPUS Pro</AlertTitle>
            <AlertDescription data-replay-public>
              {t(
                "Set up your studio, then review your subscription and confirm payment.",
                "Поставете го студиото, па прегледајте ја претплатата и потврдете го плаќањето.",
              )}
            </AlertDescription>
          </Alert>
        )}
        <div
          className="mb-8 w-full max-w-xl sm:mb-12"
          role="progressbar"
          aria-label={t("Studio setup", "Поставување на студиото")}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={index + 1}
        >
          <div className="mb-3 flex justify-between text-xs font-medium text-muted-foreground">
            <span data-replay-public>
              {t("Your booking website", "Вашата страница за закажување")}
            </span>
            <span data-replay-public>
              {t(
                `Step ${index + 1} of ${steps.length}`,
                `Чекор ${index + 1} од ${steps.length}`,
              )}
            </span>
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            {steps.map((item, i) => (
              <span
                key={item}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i <= index ? "bg-primary" : "bg-secondary",
                )}
              />
            ))}
          </div>
        </div>
        <div
          key={step}
          className="flex w-full min-w-0 items-start justify-center"
        >
          {step === "business" && (
            <BusinessStep
              name={current.name}
              category={current.category}
              onSaved={saveBusiness}
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
              category={current.category}
              slotDurationMins={state?.settings?.slotDurationMins ?? 15}
              onBack={back}
              onSaved={confirmService}
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
