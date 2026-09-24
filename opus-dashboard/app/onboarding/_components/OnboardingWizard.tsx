"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import type { FunctionReturnType } from "convex/server";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Check, Clock3, Search, Store } from "lucide-react";
import { api } from "@/convex/_generated/api";
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
import { inputVariants } from "@/components/ui/input";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  beautyCategories,
  onboardingError,
  requirementCopy,
} from "@/lib/i18n/onboarding";
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
import { ThemeStep } from "./ThemeStep";
import { resolveDashboardTheme } from "@/lib/dashboard-theme";

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
  | "theme"
  | "review";

const STEP_ORDER: WizardStep[] = [
  "business-name",
  "business-category",
  "location",
  "service-name",
  "service-price",
  "service-duration",
  "hours",
  "theme",
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
  theme: "theme",
  storefront: "review",
  review: "review",
};

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
    category: state?.org.beautyCategory ?? "beauty_salon",
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
  const { language } = useDashboardI18n();
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
      setError(onboardingError(caught, language));
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
  const { t, language } = useDashboardI18n();
  const [category, setCategory] = useState<BeautyCategory>(value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSaved(category);
    } catch (caught) {
      toast.error(onboardingError(caught, language));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="w-full" onSubmit={submit}>
      <StepFrame
        title={t("What kind of studio is this?", "Каков тип студио имате?")}
      >
        <Field>
          <FieldLabel className="sr-only" htmlFor="business-category">
            {t("Beauty category", "Категорија на студиото")}
          </FieldLabel>
          <select
            id="business-category"
            className={inputVariants({ variant: "prominent" })}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as BeautyCategory)
            }
          >
            {beautyCategories.map(([itemValue, english, macedonian]) => (
              <option key={itemValue} value={itemValue}>
                {t(english, macedonian)}
              </option>
            ))}
          </select>
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
  const { t, language } = useDashboardI18n();
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (activeResultIndex >= 0)
      document
        .getElementById(`onboarding-address-result-${activeResultIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [activeResultIndex]);

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
      searchInputRef.current?.blur();
      setSelectedLocation(location);
      setSearchQuery(location.displayName);
      clearResults();
      setActiveResultIndex(-1);
      setSelectionError(null);
      setPinError(null);
    } catch (caught) {
      setSelectionError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
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
      setPinError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
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
      toast.error(onboardingError(caught, language));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="w-full" onSubmit={submit}>
      <StepFrame
        title={t("Where is your studio?", "Каде се наоѓа вашето студио?")}
        description={t(
          "Choose an address from the suggestions to show the map, then adjust the pin to your entrance.",
          "Изберете адреса од предлозите за да се прикаже мапата, па означете го влезот на студиото.",
        )}
      >
        <Field data-invalid={Boolean(selectionError || searchError)}>
          <FieldLabel className="sr-only" htmlFor="location-search">
            {t("Studio address", "Адреса на студиото")}
          </FieldLabel>
          <div className="relative">
            <InputGroup variant="prominent">
              <InputGroupAddon>
                {isSearching ? <Spinner /> : <Search />}
              </InputGroupAddon>
              <InputGroupInput
                id="location-search"
                ref={searchInputRef}
                enterKeyHint="search"
                onFocus={() =>
                  searchInputRef.current?.scrollIntoView({
                    block: "start",
                    behavior: "smooth",
                  })
                }
                value={searchQuery}
                autoComplete="off"
                placeholder={t(
                  "Enter street, number and city",
                  "Внесете улица, број и град",
                )}
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
                className="mt-2 max-h-56 overflow-y-auto overscroll-contain touch-pan-y rounded-2xl border border-input bg-popover p-1.5 text-popover-foreground shadow-lg"
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
                {onboardingError(selectionError ?? searchError, language)}
              </FieldError>
            ) : selectedLocation ? (
              <FieldDescription className="text-success">
                {t(
                  "Address selected. Confirm the pin below.",
                  "Адресата е избрана. Проверете ја ознаката на мапата.",
                )}
              </FieldDescription>
            ) : null}
          </div>
        </Field>
        {selectedLocation && (
          <Field className="mt-2" data-invalid={Boolean(pinError)}>
            <FieldLabel>
              {t("Exact map pin", "Точна локација на мапата")}
            </FieldLabel>
            <LocationMapPicker
              className="h-60 sm:h-80"
              coords={selectedLocation.coordinates}
              onChange={updatePin}
            />
            <div className="min-h-5">
              {pinError ? (
                <FieldError aria-live="polite">
                  {onboardingError(pinError, language)}
                </FieldError>
              ) : (
                <FieldDescription aria-live="polite">
                  {isResolvingPin
                    ? t(
                        "Checking the updated pin…",
                        "Ја проверуваме локацијата…",
                      )
                    : t(
                        "Drag the pin or click the map if the entrance is not exact.",
                        "Повлечете ја ознаката или допрете на мапата за да го означите влезот.",
                      )}
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
            ? t(
                "You can search again or adjust the pin to update this location.",
                "Пребарајте повторно или поместете ја ознаката за да ја смените локацијата.",
              )
            : t(
                "You can adjust this address and pin later in Settings.",
                "Адресата и ознаката можете да ги смените подоцна во Поставки.",
              )}
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
  const { t, language } = useDashboardI18n();
  const publish = useMutation(api.website.publish);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPublishing(true);
    try {
      await publish({});
      posthog.capture("website_published");
      toast.success(t("Website published", "Веб-страницата е објавена"));
      onPublished();
    } catch (caught) {
      toast.error(onboardingError(caught, language));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="w-full">
      <StepFrame
        title={
          state.org.websiteStatus === "published"
            ? t("Your studio is live", "Вашето студио е објавено")
            : t("A quick final check", "Уште една кратка проверка")
        }
      >
        <div>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            {t(
              `${state.websiteRequirements.filter((item) => item.complete).length} of ${state.websiteRequirements.length} ready`,
              `${state.websiteRequirements.filter((item) => item.complete).length} од ${state.websiteRequirements.length} завршени`,
            )}
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
                    {requirement.complete
                      ? t("Complete", "Завршено")
                      : t("Required", "Задолжително")}
                  </span>
                  {requirement.complete ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Clock3 className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {t(
                      requirement.label,
                      requirementCopy[requirement.code]?.[0] ??
                        requirement.label,
                    )}
                  </p>
                  {!requirement.complete && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t(
                        requirement.description,
                        requirementCopy[requirement.code]?.[1] ??
                          requirement.description,
                      )}
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
                      aria-label={`Fix ${t(requirement.label, requirementCopy[requirement.code]?.[0] ?? requirement.label)}`}
                    >
                      {t("Fix", "Дополни")}
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
                {t("Open dashboard", "Отвори контролна табла")}
              </Link>
            </Button>
          ) : (
            <form onSubmit={handlePublish}>
              <WizardActions
                canGoBack={canGoBack}
                onBack={onBack}
                isSubmitting={isPublishing}
                disabled={!state.allWebsiteRequirementsComplete}
                label={t("Publish website", "Објави веб-страница")}
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
                {t("Open dashboard", "Отвори контролна табла")}
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
  const { t, language, setLanguage } = useDashboardI18n();
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
  const serviceExample =
    beautyCategories.find(([category]) => category === currentDraft.category) ??
    beautyCategories[0];
  const derivedStep = profile?.orgId
    ? state?.nextStep === "review" && !profile.dashboardTheme
      ? "theme"
      : firstStepForSection(state?.nextStep ?? "business")
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
      toast.success(t("First service saved", "Првата услуга е зачувана"));
    }
    goNext();
  };

  const handleHoursSaved = async (hours: OpeningHour[]) => {
    await saveHours({ openingHours: hours });
    posthog.capture("onboarding_hours_configured", {
      open_day_count: hours.filter((day) => !day.isClosed).length,
    });
    updateDraft({ hours });
    toast.success(t("Opening hours saved", "Работното време е зачувано"));
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
              className="min-h-11"
              onClick={() => setLanguage(language === "mk" ? "en" : "mk")}
              aria-label={t("Switch to Macedonian", "Промени на англиски")}
            >
              {language === "mk" ? "EN" : "МК"}
            </Button>
            {state?.operationalSetupComplete && (
              <Button asChild variant="ghost" className="min-h-11 shadow-none">
                <Link href="/beauty">
                  <Store aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">
                    {t("Dashboard", "Контролна табла")}
                  </span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-8 pt-4 sm:px-8 sm:pb-16 sm:pt-8">
        <div
          className="mb-8 w-full max-w-xl sm:mb-12"
          role="progressbar"
          aria-label={t("Studio setup", "Поставување на студиото")}
          aria-valuemin={1}
          aria-valuemax={STEP_ORDER.length}
          aria-valuenow={stepIndex + 1}
        >
          <div className="mb-3 flex justify-between text-xs font-medium text-muted-foreground">
            <span>{t("Studio setup", "Поставување на студиото")}</span>
            <span>
              {t(
                `Step ${stepIndex + 1} of ${STEP_ORDER.length}`,
                `Чекор ${stepIndex + 1} од ${STEP_ORDER.length}`,
              )}
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
              title={t(
                "Enter your business name",
                "Како се вика вашето студио?",
              )}
              value={currentDraft.name}
              placeholder={t("e.g. Studio Luna", "На пр. Студио Луна")}
              canGoBack={canGoBack}
              onBack={goBack}
              validate={(name) =>
                name.length < 2
                  ? t(
                      "Enter at least 2 characters.",
                      "Внесете најмалку 2 знаци.",
                    )
                  : null
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
              title={t(
                "Enter your first service",
                "Внесете ја вашата прва услуга",
              )}
              description={t(
                "Start with one service. You can add more later.",
                "Започнете со една услуга. Подоцна можете да додадете повеќе.",
              )}
              value={currentDraft.service.name}
              placeholder={t(
                `e.g. ${serviceExample[3]}`,
                `На пр. ${serviceExample[4]}`,
              )}
              canGoBack={canGoBack}
              onBack={goBack}
              validate={(value) =>
                value.length < 2
                  ? t("Enter a service name.", "Внесете име на услугата.")
                  : null
              }
              onSaved={(value) => handleServiceSaved("name", value)}
            />
          )}

          {step === "service-price" && (
            <TextInputStep
              id="service-price"
              title={t(
                `What does ${currentDraft.service.name} cost?`,
                `Колку чини ${currentDraft.service.name}?`,
              )}
              value={currentDraft.service.price}
              placeholder={t("e.g. 500", "На пр. 500")}
              unit={t("MKD", "ден.")}
              inputMode="decimal"
              canGoBack={canGoBack}
              onBack={goBack}
              validate={(value) => {
                return /^\d+([.,]\d{1,2})?$/.test(value)
                  ? null
                  : t("Enter a valid price.", "Внесете валидна цена.");
              }}
              onSaved={(value) => handleServiceSaved("price", value)}
            />
          )}

          {step === "service-duration" && (
            <TextInputStep
              id="service-duration"
              title={t(
                `How long does ${currentDraft.service.name} take?`,
                `Колку трае ${currentDraft.service.name}?`,
              )}
              unit={t("minutes", "минути")}
              value={String(currentDraft.service.durationMins)}
              placeholder={t("e.g. 30", "На пр. 30")}
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
                  ? t(
                      "Enter a whole number of minutes.",
                      "Внесете цел број минути.",
                    )
                  : duration % slotDuration !== 0
                    ? t(
                        `Use a multiple of ${slotDuration} minutes.`,
                        `Внесете времетраење во интервали од ${slotDuration} минути.`,
                      )
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

          {step === "theme" && (
            <ThemeStep
              value={resolveDashboardTheme(profile.dashboardTheme)}
              onBack={goBack}
              onSaved={goNext}
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
