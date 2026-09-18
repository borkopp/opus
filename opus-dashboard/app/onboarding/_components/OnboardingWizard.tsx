"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import type { FunctionReturnType } from "convex/server";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Check, Clock3, Cookie, Search, Store } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { openCookiePreferences } from "../../../../shared/analytics/consent";
import { trackStudioRegistration } from "../../../../shared/analytics/meta-pixel";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { HoursStep, DAYS, type OpeningHour } from "./HoursStep";
import { StepFrame, WizardActions } from "./OnboardingStep";
import { cn } from "@/lib/utils";
import {
  getBusinessLocationError,
  parseMapboxFeature,
  reverseGeocodeMapbox,
  type BusinessLocation,
  type MapboxFeature,
} from "@/lib/mapbox";
import { useMapboxSearch } from "@/hooks/use-mapbox-search";
import posthog from "posthog-js";

const LocationMapPicker = dynamic(
  () => import("@/components/dashboard/LocationMapPicker"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-60 rounded-2xl sm:h-80" />,
  },
);

type ActivationState = FunctionReturnType<typeof api.activation.getState>;
type BeautyCategory = (typeof beautyCategories)[number][0];
type WizardStep =
  | "business-name"
  | "business-category"
  | "location"
  | "service-name"
  | "service-price"
  | "service-duration"
  | "hours"
  | "review";

const STEP_ORDER: WizardStep[] = [
  "business-name",
  "business-category",
  "location",
  "service-name",
  "service-price",
  "service-duration",
  "hours",
  "review",
];

const STEP_ALIASES: Record<string, WizardStep> = {
  business: "business-name",
  "business-name": "business-name",
  location: "location",
  service: "service-name",
  "service-name": "service-name",
  hours: "hours",
  "hours-0": "hours",
  storefront: "review",
  review: "review",
};

const beautyCategories = [
  ["barbershop", "Barbershop"],
  ["hair_salon", "Hair salon"],
  ["nail_salon", "Nail salon"],
  ["spa", "Spa"],
  ["beauty_salon", "Beauty salon"],
  ["lash_studio", "Lash studio"],
  ["brow_bar", "Brow bar"],
  ["tattoo_studio", "Tattoo studio"],
  ["massage_therapy", "Massage therapy"],
  ["wellness_center", "Wellness center"],
  ["personal_trainer", "Personal trainer"],
] as const;

const DEFAULT_HOURS: OpeningHour[] = DAYS.map((_, dayOfWeek) => ({
  dayOfWeek,
  open: "09:00",
  close: "18:00",
  isClosed: dayOfWeek === 6,
}));

interface ServiceDraft {
  name: string;
  durationMins: number;
  price: string;
}

interface OnboardingDraft {
  name: string;
  category: BeautyCategory;
  location: BusinessLocation | null;
  service: ServiceDraft;
  hours: OpeningHour[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function createLocationFromState(
  state: NonNullable<ActivationState>,
): BusinessLocation | null {
  if (!state.org.address || !state.org.city || !state.org.coordinates)
    return null;

  return {
    address: state.org.address,
    city: state.org.city,
    neighborhood: state.org.neighborhood ?? "",
    postalCode: state.org.postalCode ?? "",
    country: state.org.country ?? "MK",
    coordinates: state.org.coordinates,
    displayName: [state.org.address, state.org.city].filter(Boolean).join(", "),
  };
}

function createDraft(state: ActivationState | undefined): OnboardingDraft {
  const service = state?.firstService;

  return {
    name: state?.org.name ?? "",
    category: state?.org.beautyCategory ?? "barbershop",
    location: state ? createLocationFromState(state) : null,
    service: {
      name: service?.name ?? "",
      durationMins: service?.durationMins ?? 30,
      price: service ? (service.priceMinorUnits / 100).toFixed(2) : "",
    },
    hours: state?.org.openingHours ?? DEFAULT_HOURS,
  };
}

function firstStepForSection(section: string): WizardStep {
  if (section === "location") return "location";
  if (section === "service") return "service-name";
  if (section === "hours") return "hours";
  if (section === "review") return "review";
  return "business-name";
}

function TextInputStep({
  id,
  title,
  description,
  unit,
  value,
  placeholder,
  canGoBack,
  onBack,
  onSaved,
  validate,
  type = "text",
  inputMode,
  min,
  step,
}: {
  id: string;
  title: string;
  description?: string;
  unit?: string;
  value: string;
  placeholder: string;
  canGoBack: boolean;
  onBack: () => void;
  onSaved: (value: string) => Promise<void> | void;
  validate?: (value: string) => string | null;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number;
  step?: number;
}) {
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedValue = inputValue.trim();
    const validationError = validate?.(normalizedValue) ?? null;
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSaved(normalizedValue);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="w-full" onSubmit={submit}>
      <StepFrame title={title} description={description}>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel className="sr-only" htmlFor={id}>
            {title}
          </FieldLabel>
          <InputGroup variant="prominent" className="px-4 sm:px-5">
            <InputGroupInput
              id={id}
              type={type}
              inputMode={inputMode}
              min={min}
              step={step}
              value={inputValue}
              placeholder={placeholder}
              aria-invalid={Boolean(error)}
              aria-describedby={unit ? `${id}-unit` : undefined}
              onChange={(event) => {
                setInputValue(event.target.value);
                setError(null);
              }}
            />
            {unit && (
              <InputGroupAddon align="inline-end" id={`${id}-unit`}>
                {unit}
              </InputGroupAddon>
            )}
          </InputGroup>
          <div className="min-h-5">
            <FieldError className="text-center" aria-live="polite">
              {error}
            </FieldError>
          </div>
        </Field>
        <WizardActions
          canGoBack={canGoBack}
          onBack={onBack}
          isSubmitting={isSubmitting}
          disabled={!inputValue.trim()}
        />
      </StepFrame>
    </form>
  );
}

function BusinessCategoryStep({
  value,
  canGoBack,
  onBack,
  onSaved,
}: {
  value: BeautyCategory;
  canGoBack: boolean;
  onBack: () => void;
  onSaved: (value: BeautyCategory) => Promise<void>;
}) {
  const [category, setCategory] = useState<BeautyCategory>(value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSaved(category);
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="w-full" onSubmit={submit}>
      <StepFrame title="What kind of studio is this?">
        <Field>
          <FieldLabel className="sr-only" htmlFor="business-category">
            Beauty category
          </FieldLabel>
          <Select
            value={category}
            onValueChange={(next) => setCategory(next as BeautyCategory)}
          >
            <SelectTrigger
              id="business-category"
              variant="prominent"
              aria-label="Beauty category"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              variant="prominent"
              position="popper"
              align="start"
              sideOffset={8}
            >
              <SelectGroup>
                {beautyCategories.map(([itemValue, label]) => (
                  <SelectItem
                    key={itemValue}
                    value={itemValue}
                    variant="prominent"
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <WizardActions
          canGoBack={canGoBack}
          onBack={onBack}
          isSubmitting={isSubmitting}
        />
      </StepFrame>
    </form>
  );
}

function LocationStep({
  state,
  value,
  canGoBack,
  onBack,
  onSaved,
}: {
  state: NonNullable<ActivationState>;
  value: BusinessLocation | null;
  canGoBack: boolean;
  onBack: () => void;
  onSaved: (value: BusinessLocation) => Promise<void>;
}) {
  const initialQuery = value?.displayName ?? "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedLocation, setSelectedLocation] =
    useState<BusinessLocation | null>(value);
  const confirmedLocationRef = useRef<BusinessLocation | null>(value);
  const reverseGeocodeControllerRef = useRef<AbortController | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isResolvingPin, setIsResolvingPin] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    results,
    isSearching,
    error: searchError,
    clearResults,
  } = useMapboxSearch(searchQuery, !selectedLocation);

  useEffect(() => {
    return () => reverseGeocodeControllerRef.current?.abort();
  }, []);

  const selectFeature = (feature: MapboxFeature) => {
    try {
      const location = parseMapboxFeature(feature);
      const validationError = getBusinessLocationError(location);
      if (validationError) {
        setSelectionError(validationError);
        return;
      }

      reverseGeocodeControllerRef.current?.abort();
      confirmedLocationRef.current = location;
      setSelectedLocation(location);
      setSearchQuery(location.displayName);
      clearResults();
      setActiveResultIndex(-1);
      setSelectionError(null);
      setPinError(null);
    } catch (caught) {
      setSelectionError(errorMessage(caught));
    }
  };

  const updatePin = async (coordinates: { lat: number; lng: number }) => {
    const previousLocation = confirmedLocationRef.current;
    if (!previousLocation) return;

    reverseGeocodeControllerRef.current?.abort();
    const controller = new AbortController();
    reverseGeocodeControllerRef.current = controller;
    setSelectedLocation({ ...previousLocation, coordinates });
    setIsResolvingPin(true);
    setPinError(null);

    try {
      const resolved = await reverseGeocodeMapbox(
        coordinates,
        controller.signal,
      );
      if (!resolved) {
        throw new Error(
          "No usable address was found at this pin. Choose another point.",
        );
      }

      const validationError = getBusinessLocationError(resolved);
      if (validationError) throw new Error(validationError);

      confirmedLocationRef.current = resolved;
      setSelectedLocation(resolved);
      setSearchQuery(resolved.displayName);
      setPinError(null);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError")
        return;
      setSelectedLocation(previousLocation);
      setPinError(errorMessage(caught));
    } finally {
      if (reverseGeocodeControllerRef.current === controller) {
        reverseGeocodeControllerRef.current = null;
        setIsResolvingPin(false);
      }
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isResolvingPin) {
      setPinError("Wait for the map pin to finish updating.");
      return;
    }
    if (pinError) return;

    const validationError = getBusinessLocationError(selectedLocation);
    if (!selectedLocation || validationError) {
      setSelectionError(
        validationError ?? "Choose an address from the suggestions.",
      );
      return;
    }

    setSelectionError(null);
    setIsSubmitting(true);
    try {
      await onSaved(selectedLocation);
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="w-full" onSubmit={submit}>
      <StepFrame title="Where is your studio?">
        <Field data-invalid={Boolean(selectionError || searchError)}>
          <FieldLabel className="sr-only" htmlFor="location-search">
            Studio address
          </FieldLabel>
          <div className="relative">
            <InputGroup variant="prominent">
              <InputGroupAddon>
                {isSearching ? <Spinner /> : <Search />}
              </InputGroupAddon>
              <InputGroupInput
                id="location-search"
                value={searchQuery}
                autoComplete="off"
                placeholder="Start typing your address"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="onboarding-address-results"
                aria-expanded={results.length > 0}
                aria-activedescendant={
                  activeResultIndex >= 0
                    ? `onboarding-address-result-${activeResultIndex}`
                    : undefined
                }
                aria-invalid={Boolean(selectionError || searchError)}
                onChange={(event) => {
                  reverseGeocodeControllerRef.current?.abort();
                  confirmedLocationRef.current = null;
                  setSearchQuery(event.target.value);
                  setSelectedLocation(null);
                  setSelectionError(null);
                  setPinError(null);
                  setIsResolvingPin(false);
                  setActiveResultIndex(-1);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && results.length > 0) {
                    event.preventDefault();
                    setActiveResultIndex((current) =>
                      Math.min(current + 1, results.length - 1),
                    );
                  } else if (event.key === "ArrowUp" && results.length > 0) {
                    event.preventDefault();
                    setActiveResultIndex((current) =>
                      current <= 0 ? results.length - 1 : current - 1,
                    );
                  } else if (
                    event.key === "Enter" &&
                    activeResultIndex >= 0 &&
                    results[activeResultIndex]
                  ) {
                    event.preventDefault();
                    selectFeature(results[activeResultIndex]);
                  } else if (event.key === "Escape" && results.length > 0) {
                    event.preventDefault();
                    clearResults();
                    setActiveResultIndex(-1);
                  }
                }}
              />
            </InputGroup>
            {results.length > 0 && (
              <div
                id="onboarding-address-results"
                role="listbox"
                className="absolute inset-x-0 top-full z-10 mt-2 max-h-[40dvh] overflow-y-auto overscroll-contain rounded-2xl border border-input bg-popover p-1.5 text-popover-foreground shadow-lg"
              >
                {results.map((feature, index) => (
                  <button
                    key={feature.id}
                    id={`onboarding-address-result-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeResultIndex}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-xl px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none",
                      index === activeResultIndex && "bg-secondary",
                    )}
                    onMouseEnter={() => setActiveResultIndex(index)}
                    onClick={() => selectFeature(feature)}
                  >
                    <span className="text-sm font-medium">{feature.text}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {feature.place_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="min-h-5 text-center">
            {selectionError || searchError ? (
              <FieldError aria-live="polite">
                {selectionError ?? searchError}
              </FieldError>
            ) : selectedLocation ? (
              <FieldDescription className="text-success">
                Address selected. Confirm the pin below.
              </FieldDescription>
            ) : null}
          </div>
        </Field>
        {selectedLocation && (
          <Field className="mt-2" data-invalid={Boolean(pinError)}>
            <FieldLabel>Exact map pin</FieldLabel>
            <LocationMapPicker
              className="h-60 sm:h-80"
              coords={selectedLocation.coordinates}
              onChange={updatePin}
            />
            <div className="min-h-5">
              {pinError ? (
                <FieldError aria-live="polite">{pinError}</FieldError>
              ) : (
                <FieldDescription aria-live="polite">
                  {isResolvingPin
                    ? "Checking the updated pin…"
                    : "Drag the pin or click the map if the entrance is not exact."}
                </FieldDescription>
              )}
            </div>
          </Field>
        )}
        <WizardActions
          canGoBack={canGoBack}
          onBack={onBack}
          isSubmitting={isSubmitting}
          disabled={
            !selectedLocation ||
            isSearching ||
            isResolvingPin ||
            Boolean(pinError)
          }
        />
        <p className="mt-5 text-center text-xs text-muted-foreground">
          {state.org.address
            ? "You can search again or adjust the pin to update this location."
            : "You can adjust this address and pin later in Settings."}
        </p>
      </StepFrame>
    </form>
  );
}

function ReviewStep({
  state,
  canGoBack,
  onBack,
  onPublished,
}: {
  state: NonNullable<ActivationState>;
  canGoBack: boolean;
  onBack: () => void;
  onPublished: () => void;
}) {
  const publish = useMutation(api.website.publish);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPublishing(true);
    try {
      await publish({});
      posthog.capture("website_published");
      toast.success("Website published");
      onPublished();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="w-full">
      <StepFrame
        title={
          state.org.websiteStatus === "published"
            ? "Your studio is live"
            : "A quick final check"
        }
      >
        <div>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            {state.websiteRequirements.filter((item) => item.complete).length}{" "}
            of {state.websiteRequirements.length} ready
          </p>
          <ul className="flex flex-col gap-2">
            {state.websiteRequirements.map((requirement) => (
              <li
                key={requirement.code}
                className="flex items-start gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-s"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                    requirement.complete
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  <span className="sr-only">
                    {requirement.complete ? "Complete" : "Required"}
                  </span>
                  {requirement.complete ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Clock3 className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{requirement.label}</p>
                  {!requirement.complete && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {requirement.description}
                    </p>
                  )}
                </div>
                {!requirement.complete && (
                  <Button
                    asChild
                    variant="link"
                    size="sm"
                    className="min-h-11 min-w-11 shrink-0 px-2 shadow-none"
                  >
                    <Link
                      href={requirement.actionHref}
                      aria-label={`Fix ${requirement.label}`}
                    >
                      Fix
                    </Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {state.org.websiteStatus === "published" ? (
            <Button asChild className="mt-6 h-12 w-full">
              <Link href="/beauty">
                <Store />
                Open dashboard
              </Link>
            </Button>
          ) : (
            <form onSubmit={handlePublish}>
              <WizardActions
                canGoBack={canGoBack}
                onBack={onBack}
                isSubmitting={isPublishing}
                disabled={!state.allWebsiteRequirementsComplete}
                label="Publish website"
              />
            </form>
          )}
        </div>
      </StepFrame>

      {state.operationalSetupComplete &&
        state.org.websiteStatus !== "published" && (
          <div className="mt-8 text-center">
            <Button asChild variant="link" className="shadow-none">
              <Link href="/beauty">
                <Store data-icon="inline-start" />
                Open dashboard
              </Link>
            </Button>
          </div>
        )}
    </div>
  );
}

export function OnboardingWizard() {
  const searchParams = useSearchParams();
  const requestedStep = STEP_ALIASES[searchParams.get("step") ?? ""] ?? null;
  return (
    <OnboardingFlow
      key={requestedStep ?? "default"}
      requestedStep={requestedStep}
    />
  );
}

function OnboardingFlow({
  requestedStep,
}: {
  requestedStep: WizardStep | null;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );
  const state = useQuery(api.activation.getState, profile?.orgId ? {} : "skip");
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [manualStep, setManualStep] = useState<WizardStep | null>(
    requestedStep,
  );

  const startBusiness = useMutation(api.activation.startBeautyBusiness);
  const saveLocation = useMutation(api.activation.saveLocation);
  const saveFirstService = useMutation(api.activation.saveFirstService);
  const saveHours = useMutation(api.activation.saveHours);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  const shouldOpenDashboard = state?.onboardingComplete && !requestedStep;
  useEffect(() => {
    if (shouldOpenDashboard) router.replace("/beauty");
  }, [shouldOpenDashboard, router]);

  if (
    isLoading ||
    !isAuthenticated ||
    !profile ||
    (profile?.orgId && !state) ||
    shouldOpenDashboard
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  const currentDraft = draft ?? createDraft(state);
  const derivedStep = profile?.orgId
    ? firstStepForSection(state?.nextStep ?? "business")
    : "business-name";
  const step =
    !profile.orgId && manualStep !== "business-category"
      ? "business-name"
      : (manualStep ?? derivedStep);
  const stepIndex = STEP_ORDER.indexOf(step);
  const canGoBack = stepIndex > 0;

  const goNext = () => {
    setManualStep(
      STEP_ORDER[Math.min(stepIndex + 1, STEP_ORDER.length - 1)] ?? "review",
    );
  };

  const goBack = () => {
    if (canGoBack) setManualStep(STEP_ORDER[stepIndex - 1]);
  };

  const updateDraft = (patch: Partial<OnboardingDraft>) => {
    setDraft((current) => ({ ...currentDraft, ...(current ?? {}), ...patch }));
  };

  const handleCategorySaved = async (category: BeautyCategory) => {
    const registration = await startBusiness({
      name: currentDraft.name,
      category,
    });
    if (registration.created) {
      trackStudioRegistration(
        process.env.NEXT_PUBLIC_META_PIXEL_ID,
        registration.orgId,
      );
    }
    posthog.capture("onboarding_business_configured", { category });
    updateDraft({ category });
    goNext();
  };

  const handleLocationSaved = async (location: BusinessLocation) => {
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
    updateDraft({ location });
    goNext();
  };

  const handleServiceSaved = async (
    field: keyof ServiceDraft,
    value: string,
  ) => {
    const service = {
      ...currentDraft.service,
      [field]: field === "durationMins" ? Number(value) : value,
    } as ServiceDraft;
    updateDraft({ service });

    if (field === "durationMins") {
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
      toast.success("First service saved");
    }
    goNext();
  };

  const handleHoursSaved = async (hours: OpeningHour[]) => {
    await saveHours({ openingHours: hours });
    posthog.capture("onboarding_hours_configured", {
      open_day_count: hours.filter((day) => !day.isClosed).length,
    });
    updateDraft({ hours });
    toast.success("Opening hours saved");
    goNext();
  };

  return (
    <main className="min-h-dvh bg-background">
      <header className="px-4 py-4 sm:px-8 sm:py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo className="text-2xl" />
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Cookie settings"
              onClick={openCookiePreferences}
            >
              <Cookie />
            </Button>
            {state?.operationalSetupComplete && (
              <Button asChild variant="ghost" className="min-h-11 shadow-none">
                <Link href="/beauty">Dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-8 pt-4 sm:px-8 sm:pb-16 sm:pt-8">
        <div
          className="mb-8 w-full max-w-xl sm:mb-12"
          role="progressbar"
          aria-label="Studio setup"
          aria-valuemin={1}
          aria-valuemax={STEP_ORDER.length}
          aria-valuenow={stepIndex + 1}
        >
          <div className="mb-3 flex justify-between text-xs font-medium text-muted-foreground">
            <span>Studio setup</span>
            <span>
              Step {stepIndex + 1} of {STEP_ORDER.length}
            </span>
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            {STEP_ORDER.map((item, index) => (
              <span
                key={item}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  index <= stepIndex ? "bg-primary" : "bg-secondary",
                )}
              />
            ))}
          </div>
        </div>
        <div
          key={step}
          className="flex w-full min-w-0 flex-1 items-start justify-center"
        >
          {step === "business-name" && (
            <TextInputStep
              id="business-name"
              title="Enter your business name"
              value={currentDraft.name}
              placeholder="King Cuts"
              canGoBack={canGoBack}
              onBack={goBack}
              validate={(name) =>
                name.length < 2 ? "Enter at least 2 characters." : null
              }
              onSaved={(name) => {
                updateDraft({ name });
                goNext();
              }}
            />
          )}

          {step === "business-category" && (
            <BusinessCategoryStep
              value={currentDraft.category}
              canGoBack={canGoBack}
              onBack={goBack}
              onSaved={handleCategorySaved}
            />
          )}

          {step === "location" && state && (
            <LocationStep
              state={state}
              value={currentDraft.location}
              canGoBack={canGoBack}
              onBack={goBack}
              onSaved={handleLocationSaved}
            />
          )}

          {step === "service-name" && (
            <TextInputStep
              id="service-name"
              title="What should customers book?"
              value={currentDraft.service.name}
              placeholder="Signature haircut"
              canGoBack={canGoBack}
              onBack={goBack}
              validate={(value) =>
                value.length < 2 ? "Enter a service name." : null
              }
              onSaved={(value) => handleServiceSaved("name", value)}
            />
          )}

          {step === "service-price" && (
            <TextInputStep
              id="service-price"
              title="What does it cost?"
              value={currentDraft.service.price}
              placeholder="500.00"
              unit="MKD"
              inputMode="decimal"
              canGoBack={canGoBack}
              onBack={goBack}
              validate={(value) => {
                return /^\d+([.,]\d{1,2})?$/.test(value)
                  ? null
                  : "Enter a valid price.";
              }}
              onSaved={(value) => handleServiceSaved("price", value)}
            />
          )}

          {step === "service-duration" && (
            <TextInputStep
              id="service-duration"
              title="How long does it take?"
              unit="minutes"
              value={String(currentDraft.service.durationMins)}
              placeholder="30"
              type="number"
              inputMode="numeric"
              min={state?.settings?.slotDurationMins ?? 15}
              step={state?.settings?.slotDurationMins ?? 15}
              canGoBack={canGoBack}
              onBack={goBack}
              validate={(value) => {
                const duration = Number(value);
                const slotDuration = state?.settings?.slotDurationMins ?? 15;
                return !Number.isInteger(duration) || duration <= 0
                  ? "Enter a whole number of minutes."
                  : duration % slotDuration !== 0
                    ? `Use a multiple of ${slotDuration} minutes.`
                    : null;
              }}
              onSaved={(value) => handleServiceSaved("durationMins", value)}
            />
          )}

          {step === "hours" && (
            <HoursStep
              hours={currentDraft.hours}
              canGoBack={canGoBack}
              onBack={goBack}
              onSaved={handleHoursSaved}
            />
          )}

          {step === "review" && state && (
            <ReviewStep
              state={state}
              canGoBack={canGoBack}
              onBack={goBack}
              onPublished={() => router.replace("/beauty")}
            />
          )}
        </div>
      </div>
    </main>
  );
}
