"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import type { FunctionReturnType } from "convex/server";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Search,
  Store,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  getBusinessLocationError,
  parseMapboxFeature,
  reverseGeocodeMapbox,
  type BusinessLocation,
  type MapboxFeature,
} from "@/lib/mapbox";
import { useMapboxSearch } from "@/hooks/use-mapbox-search";

const LocationMapPicker = dynamic(
  () => import("@/components/dashboard/LocationMapPicker"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-80 rounded-2xl" />,
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

interface OpeningHour {
  dayOfWeek: number;
  open: string;
  close: string;
  isClosed: boolean;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

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

function StepHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="max-w-4xl text-balance font-display text-4xl font-semibold leading-[1.04] tracking-tight sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function StepFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-center">
      <StepHeading title={title} description={description} />
      <div className="mt-12 w-full max-w-xl">{children}</div>
    </div>
  );
}

function WizardActions({
  canGoBack,
  onBack,
  isSubmitting = false,
  disabled = false,
  label = "Next",
}: {
  canGoBack: boolean;
  onBack: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="relative mt-8 flex w-full items-center justify-center gap-4 sm:mt-10">
      {canGoBack ? (
        <Button
          type="button"
          variant="ghost"
          className="absolute left-0 border-0 bg-transparent px-0 shadow-none hover:bg-transparent hover:text-foreground"
          onClick={onBack}
        >
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
      ) : null}
      <Button
        type="submit"
        variant="default"
        size="lg"
        className="min-w-28 shadow-none"
        disabled={disabled || isSubmitting}
      >
        {isSubmitting && <Spinner />}
        {label}
        <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  );
}

function TextInputStep({
  id,
  title,
  description,
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
  description: string;
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
      toast.error(errorMessage(caught));
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
          <Input
            id={id}
            autoFocus
            type={type}
            inputMode={inputMode}
            min={min}
            step={step}
            value={inputValue}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            variant="prominent"
            onChange={(event) => {
              setInputValue(event.target.value);
              setError(null);
            }}
          />
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
      <StepFrame
        title="What kind of studio is this?"
        description="This helps customers understand what your studio offers."
      >
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
      <StepFrame
        title="Where is your studio?"
        description="Choose the matching address, then confirm the exact entrance on the map."
      >
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
                autoFocus
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
                className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border border-input bg-popover p-1.5 text-popover-foreground shadow-lg"
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
                    <span className="truncate text-xs text-muted-foreground">
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
          disabled={isSearching || isResolvingPin}
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

function parseHoursRange(
  value: string,
): { open: string; close: string } | null {
  const match = value
    .trim()
    .match(/^([01]\d|2[0-3]):([0-5]\d)\s*[-–—]\s*([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  const open = `${match[1]}:${match[2]}`;
  const close = `${match[3]}:${match[4]}`;
  return open < close ? { open, close } : null;
}

function formatHoursRange(day: OpeningHour): string {
  return `${day.open} – ${day.close}`;
}

function HoursStep({
  hours,
  canGoBack,
  onBack,
  onSaved,
}: {
  hours: OpeningHour[];
  canGoBack: boolean;
  onBack: () => void;
  onSaved: (hours: OpeningHour[]) => Promise<void>;
}) {
  const [draftHours, setDraftHours] = useState(hours);
  const [rangeValues, setRangeValues] = useState(
    hours.map((day) => (day.isClosed ? "" : formatHoursRange(day))),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedHours = draftHours.map((day, index) => {
      const parsed = day.isClosed
        ? null
        : parseHoursRange(rangeValues[index] ?? "");
      return {
        ...day,
        open: parsed?.open ?? day.open,
        close: parsed?.close ?? day.close,
      };
    });
    const invalidDay = draftHours.find(
      (day, index) =>
        !day.isClosed && !parseHoursRange(rangeValues[index] ?? ""),
    );
    if (invalidDay) {
      setError(
        `Use a range like 09:00 – 18:00 for ${DAYS[invalidDay.dayOfWeek]}.`,
      );
      return;
    }
    if (draftHours.every((day) => day.isClosed)) {
      setError("Choose at least one day when your studio is open.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSaved(parsedHours);
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="w-full" onSubmit={submit}>
      <StepFrame
        title="When can customers book?"
        description="Set your weekly hours once. You can fine-tune individual days later."
      >
        <FieldGroup className="gap-2">
          {draftHours.map((day, index) => (
            <Field
              key={day.dayOfWeek}
              orientation="horizontal"
              variant="surface"
              data-disabled={day.isClosed}
              data-invalid={Boolean(error) && !day.isClosed}
              className="grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[6rem_minmax(0,1fr)_auto]"
            >
              <FieldLabel htmlFor={`hours-${day.dayOfWeek}`}>
                {DAYS[day.dayOfWeek]}
              </FieldLabel>
              <Input
                id={`hours-${day.dayOfWeek}`}
                value={day.isClosed ? "" : (rangeValues[index] ?? "")}
                placeholder="09:00 – 18:00"
                disabled={day.isClosed}
                aria-label={`${DAYS[day.dayOfWeek]} opening hours`}
                aria-invalid={Boolean(error) && !day.isClosed}
                variant="surface"
                className="text-center tabular"
                onChange={(event) => {
                  setRangeValues((current) =>
                    current.map((value, valueIndex) =>
                      valueIndex === index ? event.target.value : value,
                    ),
                  );
                  setError(null);
                }}
              />
              <div className="flex items-center justify-end gap-2">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {day.isClosed ? "Closed" : "Open"}
                </span>
                <Switch
                  checked={!day.isClosed}
                  aria-label={`${day.isClosed ? "Open" : "Close"} ${DAYS[day.dayOfWeek]}`}
                  onCheckedChange={() => {
                    setDraftHours((current) =>
                      current.map((currentDay) =>
                        currentDay.dayOfWeek === day.dayOfWeek
                          ? { ...currentDay, isClosed: !currentDay.isClosed }
                          : currentDay,
                      ),
                    );
                    setRangeValues((current) =>
                      current.map((value, valueIndex) =>
                        valueIndex === index
                          ? day.isClosed
                            ? formatHoursRange(day)
                            : ""
                          : value,
                      ),
                    );
                    setError(null);
                  }}
                />
              </div>
            </Field>
          ))}
        </FieldGroup>
        <div className="mt-3 min-h-5 text-center">
          <FieldError aria-live="polite">{error}</FieldError>
        </div>
        <WizardActions
          canGoBack={canGoBack}
          onBack={onBack}
          isSubmitting={isSubmitting}
        />
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
        description={
          state.operationalSetupComplete
            ? "Your dashboard is ready. Complete every item below before you can publish your studio website."
            : "Complete every item below before you can publish your studio website."
        }
      >
        <div>
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
                  {requirement.complete ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Clock3 className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{requirement.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {requirement.description}
                  </p>
                </div>
                {!requirement.complete && (
                  <Button
                    asChild
                    variant="link"
                    size="sm"
                    className="h-auto shrink-0 px-0 shadow-none"
                  >
                    <Link href={requirement.actionHref}>Fix</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={handlePublish}>
            <WizardActions
              canGoBack={canGoBack}
              onBack={onBack}
              isSubmitting={isPublishing}
              disabled={
                !state.allWebsiteRequirementsComplete ||
                state.org.websiteStatus === "published"
              }
              label={
                state.org.websiteStatus === "published"
                  ? "Website published"
                  : "Publish website"
              }
            />
          </form>
        </div>
      </StepFrame>

      {state.operationalSetupComplete && (
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );
  const state = useQuery(api.activation.getState, profile?.orgId ? {} : "skip");
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const requestedStep = searchParams.get("step");
  const [manualStep, setManualStep] = useState<WizardStep | null>(
    requestedStep ? (STEP_ALIASES[requestedStep] ?? null) : null,
  );

  const startBusiness = useMutation(api.activation.startBeautyBusiness);
  const saveLocation = useMutation(api.activation.saveLocation);
  const saveFirstService = useMutation(api.activation.saveFirstService);
  const saveHours = useMutation(api.activation.saveHours);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || !profile || (profile?.orgId && !state)) {
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
  const step = manualStep ?? derivedStep;
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
    await startBusiness({ name: currentDraft.name, category });
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
      toast.success("First service saved");
    }
    goNext();
  };

  const handleHoursSaved = async (hours: OpeningHour[]) => {
    await saveHours({ openingHours: hours });
    updateDraft({ hours });
    toast.success("Opening hours saved");
    goNext();
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="px-6 py-6 sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo className="text-2xl" />
          {state?.operationalSetupComplete && (
            <Button asChild variant="link" className="shadow-none">
              <Link href="/beauty">Dashboard</Link>
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-92px)] max-w-6xl flex-col items-center px-6 pb-16 pt-8 sm:px-10 sm:pt-16">
        <div className="flex w-full flex-1 items-start justify-center">
          {step === "business-name" && (
            <TextInputStep
              id="business-name"
              title="Enter your business name"
              description="Use the name your customers already know you by."
              value={currentDraft.name}
              placeholder="King Cuts"
              canGoBack={canGoBack}
              onBack={goBack}
              onSaved={(name) => {
                if (name.length < 2)
                  throw new Error("Enter at least 2 characters.");
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
              description="Start with the service you want to fill first."
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
              description="Enter the price customers will see."
              value={currentDraft.service.price}
              placeholder="25.00 MKD"
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
              description="Most appointment slots work best in 15-minute increments."
              value={String(currentDraft.service.durationMins)}
              placeholder="30"
              type="number"
              inputMode="numeric"
              min={15}
              step={15}
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
              onPublished={() => router.push("/beauty")}
            />
          )}
        </div>
      </div>
    </main>
  );
}
