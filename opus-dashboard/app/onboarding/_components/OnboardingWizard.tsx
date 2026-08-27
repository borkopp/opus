"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { InputHTMLAttributes } from "react";
import type { FunctionReturnType } from "convex/server";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  ImagePlus,
  Search,
  Store,
  Upload,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { parseMapboxFeature, type BusinessLocation } from "@/lib/mapbox";
import { useMapboxSearch } from "@/hooks/use-mapbox-search";
import { validateImageFile } from "@/lib/file-validation";
import { ActivationPreview } from "./ActivationPreview";

type ActivationState = FunctionReturnType<typeof api.activation.getState>;
type BeautyCategory = (typeof beautyCategories)[number][0];
type HoursStep =
  | "hours-0"
  | "hours-1"
  | "hours-2"
  | "hours-3"
  | "hours-4"
  | "hours-5"
  | "hours-6";
type WizardStep =
  | "business-name"
  | "business-category"
  | "location"
  | "service-name"
  | "service-description"
  | "service-duration"
  | "service-price"
  | HoursStep
  | "storefront-logo"
  | "storefront-cover"
  | "storefront-tagline"
  | "storefront-bio"
  | "storefront-phone"
  | "storefront-gallery"
  | "review";

const STEP_ORDER: WizardStep[] = [
  "business-name",
  "business-category",
  "location",
  "service-name",
  "service-description",
  "service-duration",
  "service-price",
  "hours-0",
  "hours-1",
  "hours-2",
  "hours-3",
  "hours-4",
  "hours-5",
  "hours-6",
  "storefront-logo",
  "storefront-cover",
  "storefront-tagline",
  "storefront-bio",
  "storefront-phone",
  "storefront-gallery",
  "review",
];

const STEP_ALIASES: Record<string, WizardStep> = {
  business: "business-name",
  "business-name": "business-name",
  location: "location",
  service: "service-name",
  "service-name": "service-name",
  hours: "hours-0",
  storefront: "storefront-logo",
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
  description: string;
  durationMins: number;
  price: string;
}

interface StorefrontDraft {
  tagline: string;
  bio: string;
  phone: string;
  logo: File | null;
  cover: File | null;
  gallery: File[];
}

interface OnboardingDraft {
  name: string;
  category: BeautyCategory;
  location: BusinessLocation | null;
  service: ServiceDraft;
  hours: OpeningHour[];
  storefront: StorefrontDraft;
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
      description: service?.consumerDescription ?? service?.description ?? "",
      durationMins: service?.durationMins ?? 30,
      price: service ? (service.priceMinorUnits / 100).toFixed(2) : "",
    },
    hours: state?.org.openingHours ?? DEFAULT_HOURS,
    storefront: {
      tagline: state?.org.tagline ?? "",
      bio: state?.org.bio ?? "",
      phone: state?.org.phone ?? "",
      logo: null,
      cover: null,
      gallery: [],
    },
  };
}

function sectionLabel(step: WizardStep): string {
  if (step.startsWith("business")) return "Your studio";
  if (step === "location") return "Location";
  if (step.startsWith("service")) return "Your first service";
  if (step.startsWith("hours")) return "Opening hours";
  if (step.startsWith("storefront")) return "Public profile";
  return "Ready to go";
}

function firstStepForSection(section: string): WizardStep {
  if (section === "location") return "location";
  if (section === "service") return "service-name";
  if (section === "hours") return "hours-0";
  if (section === "storefront") return "storefront-logo";
  if (section === "review") return "review";
  return "business-name";
}

function minimalInputClass(hasError = false): string {
  return cn(
    "h-16 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-center !text-2xl shadow-none placeholder:text-muted-foreground/50 focus-visible:border-accent focus-visible:ring-0 sm:!text-3xl",
    hasError && "border-destructive focus-visible:border-destructive",
  );
}

function StepHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
        {eyebrow}
      </p>
      <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-[1.04] tracking-tight sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
        {description}
      </p>
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
    <div className="relative mt-14 flex w-full items-center justify-center gap-4">
      {canGoBack ? (
        <Button
          type="button"
          variant="ghost"
          className="absolute left-0 border-0 bg-transparent px-0 shadow-none hover:bg-transparent hover:text-accent"
          onClick={onBack}
        >
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
      ) : null}
      <Button
        type="submit"
        variant="terracotta"
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
  eyebrow,
  title,
  description,
  value,
  placeholder,
  canGoBack,
  onBack,
  onSaved,
  validate,
  optional = false,
  multiline = false,
  maxLength,
  type = "text",
  inputMode,
  min,
  step,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  value: string;
  placeholder: string;
  canGoBack: boolean;
  onBack: () => void;
  onSaved: (value: string) => Promise<void> | void;
  validate?: (value: string) => string | null;
  optional?: boolean;
  multiline?: boolean;
  maxLength?: number;
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
      <StepHeading eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-12 w-full">
        <label className="sr-only" htmlFor={id}>
          {title}
        </label>
        {multiline ? (
          <Textarea
            id={id}
            autoFocus
            value={inputValue}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            className={cn(
              "min-h-32 resize-none rounded-none border-x-0 border-t-0 border-b bg-transparent px-0 py-3 text-center text-xl shadow-none placeholder:text-muted-foreground/50 focus-visible:border-accent focus-visible:ring-0 sm:text-2xl",
              error && "border-destructive focus-visible:border-destructive",
            )}
            onChange={(event) => setInputValue(event.target.value)}
          />
        ) : (
          <Input
            id={id}
            autoFocus
            type={type}
            inputMode={inputMode}
            min={min}
            step={step}
            value={inputValue}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            className={minimalInputClass(Boolean(error))}
            onChange={(event) => setInputValue(event.target.value)}
          />
        )}
        <div
          className={cn(
            "mt-3 min-h-5 text-center text-sm",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error ?? (optional ? "Optional" : "")}
        </div>
      </div>
      <WizardActions
        canGoBack={canGoBack}
        onBack={onBack}
        isSubmitting={isSubmitting}
      />
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
      <StepHeading
        eyebrow="Your studio"
        title="What kind of studio is this?"
        description="This helps customers find you in the right place on opus.mk."
      />
      <div className="mt-12">
        <label className="sr-only" htmlFor="business-category">
          Beauty category
        </label>
        <Select
          value={category}
          onValueChange={(next) => setCategory(next as BeautyCategory)}
        >
          <SelectTrigger
            id="business-category"
            className="h-16 w-full justify-center rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-center text-2xl shadow-none focus:ring-0 sm:text-3xl"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {beautyCategories.map(([itemValue, label]) => (
                <SelectItem key={itemValue} value={itemValue}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <WizardActions
        canGoBack={canGoBack}
        onBack={onBack}
        isSubmitting={isSubmitting}
      />
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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    results,
    isSearching,
    error: searchError,
    clearResults,
  } = useMapboxSearch(searchQuery, !selectedLocation);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLocation) {
      setError("Choose an address from the suggestions.");
      return;
    }

    setError(null);
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
      <StepHeading
        eyebrow="Location"
        title="Where is your studio?"
        description="Search for the address customers should use, then choose the matching place."
      />
      <div className="relative mt-12">
        <label className="sr-only" htmlFor="location-search">
          Studio address
        </label>
        <Search className="pointer-events-none absolute left-0 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="location-search"
          autoFocus
          value={searchQuery}
          autoComplete="off"
          placeholder="Start typing your address"
          aria-invalid={Boolean(error || searchError)}
          className={cn(
            minimalInputClass(Boolean(error || searchError)),
            "pl-8",
          )}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setSelectedLocation(null);
            setError(null);
          }}
        />
        {results.length > 0 && (
          <div className="absolute inset-x-0 top-full z-10 border-b border-border bg-background">
            {results.map((feature) => (
              <button
                key={feature.id}
                type="button"
                className="flex w-full flex-col gap-1 border-b border-border px-8 py-4 text-left last:border-b-0 hover:text-accent"
                onClick={() => {
                  const location = parseMapboxFeature(feature);
                  setSelectedLocation(location);
                  setSearchQuery(location.displayName);
                  clearResults();
                  setError(null);
                }}
              >
                <span className="text-sm font-medium">{feature.text}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {feature.place_name}
                </span>
              </button>
            ))}
          </div>
        )}
        <div
          className={cn(
            "mt-3 min-h-5 text-center text-sm",
            error || searchError
              ? "text-destructive"
              : selectedLocation
                ? "text-accent"
                : "text-muted-foreground",
          )}
        >
          {error ?? searchError ?? (selectedLocation ? "Address selected" : "")}
        </div>
      </div>
      <WizardActions
        canGoBack={canGoBack}
        onBack={onBack}
        isSubmitting={isSubmitting}
        disabled={isSearching}
      />
      <p className="mt-5 text-center text-xs text-muted-foreground">
        {state.org.address
          ? "You can search again to update this location."
          : "You can adjust details later in Settings."}
      </p>
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

function HoursDayStep({
  day,
  canGoBack,
  onBack,
  onSaved,
}: {
  day: OpeningHour;
  canGoBack: boolean;
  onBack: () => void;
  onSaved: (day: OpeningHour) => Promise<void>;
}) {
  const [isClosed, setIsClosed] = useState(day.isClosed);
  const [hoursValue, setHoursValue] = useState(
    day.isClosed ? "" : formatHoursRange(day),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = isClosed ? null : parseHoursRange(hoursValue);
    if (!isClosed && !parsed) {
      setError("Use a range like 09:00 – 18:00.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSaved({
        ...day,
        open: parsed?.open ?? day.open,
        close: parsed?.close ?? day.close,
        isClosed,
      });
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="w-full" onSubmit={submit}>
      <StepHeading
        eyebrow="Opening hours"
        title={`When are you open on ${DAYS[day.dayOfWeek]}?`}
        description="Set one range for this day. You can always fine-tune your schedule later."
      />
      <div className="mt-12">
        {isClosed ? (
          <p className="py-5 text-center text-2xl text-muted-foreground sm:text-3xl">
            Closed
          </p>
        ) : (
          <>
            <label className="sr-only" htmlFor={`hours-${day.dayOfWeek}`}>
              {DAYS[day.dayOfWeek]} opening hours
            </label>
            <Input
              id={`hours-${day.dayOfWeek}`}
              autoFocus
              value={hoursValue}
              placeholder="09:00 – 18:00"
              aria-invalid={Boolean(error)}
              className={minimalInputClass(Boolean(error))}
              onChange={(event) => setHoursValue(event.target.value)}
            />
          </>
        )}
        <div className="mt-3 min-h-5 text-center text-sm text-destructive">
          {error}
        </div>
        <button
          type="button"
          className="mx-auto mt-3 block text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent"
          onClick={() => {
            setIsClosed((current) => !current);
            setError(null);
          }}
        >
          {isClosed ? "Set opening hours" : "Mark this day closed"}
        </button>
      </div>
      <WizardActions
        canGoBack={canGoBack}
        onBack={onBack}
        isSubmitting={isSubmitting}
      />
    </form>
  );
}

function ImageStep({
  kind,
  value,
  existingLabel,
  hasExistingImage,
  canGoBack,
  onBack,
  onSaved,
  multiple = false,
  optional = false,
}: {
  kind: "logo" | "cover" | "gallery";
  value: File | File[] | null;
  existingLabel?: string;
  hasExistingImage?: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onSaved: (value: File | File[] | null) => Promise<void> | void;
  multiple?: boolean;
  optional?: boolean;
}) {
  const [selected, setSelected] = useState<File | File[] | null>(value);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCover = kind === "cover";
  const title =
    kind === "logo"
      ? "Add your studio logo"
      : kind === "cover"
        ? "Choose a cover photo"
        : "Show a little more of your work";
  const description =
    kind === "logo"
      ? "A clear mark helps customers recognize your studio."
      : kind === "cover"
        ? "This is the first image customers see on your public profile."
        : "Add a few photos of your space or your work if you have them ready.";
  const selectedFiles = Array.isArray(selected)
    ? selected
    : selected
      ? [selected]
      : [];

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCover && !selected && !hasExistingImage) {
      setError("Choose a cover photo to continue.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSaved(selected);
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="w-full" onSubmit={submit}>
      <StepHeading
        eyebrow="Public profile"
        title={title}
        description={description}
      />
      <div className="mt-12 text-center">
        <label
          htmlFor={`storefront-${kind}`}
          className="inline-flex cursor-pointer items-center gap-3 border-b border-border pb-3 text-lg transition-colors hover:border-accent hover:text-accent"
        >
          {kind === "gallery" ? (
            <ImagePlus className="size-5" />
          ) : (
            <Upload className="size-5" />
          )}
          <span>
            {selectedFiles.length
              ? `${selectedFiles.length} photo${selectedFiles.length === 1 ? "" : "s"} selected`
              : (existingLabel ??
                (kind === "logo"
                  ? "Choose a logo"
                  : kind === "cover"
                    ? "Choose a cover photo"
                    : "Choose photos"))}
          </span>
        </label>
        <Input
          id={`storefront-${kind}`}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            const validationError = files.map(validateImageFile).find(Boolean);
            if (validationError) {
              setError(validationError);
              return;
            }
            setError(null);
            setSelected(multiple ? files : (files[0] ?? null));
          }}
        />
        <p
          className={cn(
            "mt-4 min-h-5 text-sm",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error ?? (optional ? "Optional" : "")}
        </p>
      </div>
      <WizardActions
        canGoBack={canGoBack}
        onBack={onBack}
        isSubmitting={isSubmitting}
      />
    </form>
  );
}

async function uploadFile(
  file: File,
  generateUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">> {
  const validation = validateImageFile(file);
  if (validation) throw new Error(validation);
  const url = await generateUploadUrl();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) throw new Error("Image upload failed.");
  const result = (await response.json()) as { storageId: Id<"_storage"> };
  return result.storageId;
}

function ReviewStep({
  state,
  preview,
  canGoBack,
  onBack,
  onPublished,
}: {
  state: NonNullable<ActivationState>;
  preview: FunctionReturnType<typeof api.activation.getPreview> | undefined;
  canGoBack: boolean;
  onBack: () => void;
  onPublished: () => void;
}) {
  const publish = useMutation(api.listing.publishOrg);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPublishing(true);
    try {
      await publish({});
      toast.success("Published on opus.mk");
      onPublished();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="w-full">
      <StepHeading
        eyebrow="Ready to go"
        title={
          state.org.listingStatus === "published"
            ? "Your studio is live"
            : "A quick final check"
        }
        description="Everything below is what customers will use to find and book your studio."
      />
      <div className="mt-12 text-left">
        <ul className="divide-y divide-border border-y border-border">
          {state.requirements.map((requirement) => (
            <li key={requirement.code} className="flex items-start gap-4 py-4">
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
      </div>

      <form onSubmit={handlePublish}>
        <WizardActions
          canGoBack={canGoBack}
          onBack={onBack}
          isSubmitting={isPublishing}
          disabled={
            !state.allRequiredComplete ||
            state.org.listingStatus === "published"
          }
          label={
            state.org.listingStatus === "published" ? "Published" : "Publish"
          }
        />
      </form>

      <div className="mt-20 border-t border-border pt-12 text-left">
        <div className="mb-7 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Your public listing
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            This is the profile customers will see on opus.mk.
          </p>
        </div>
        <ActivationPreview preview={preview} />
      </div>

      <div className="mt-8 text-center">
        <Button asChild variant="link" className="shadow-none">
          <Link href="/beauty">
            <Store data-icon="inline-start" />
            Open dashboard
          </Link>
        </Button>
      </div>
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
  const preview = useQuery(
    api.activation.getPreview,
    profile?.orgId ? {} : "skip",
  );
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const requestedStep = searchParams.get("step");
  const [manualStep, setManualStep] = useState<WizardStep | null>(
    requestedStep ? (STEP_ALIASES[requestedStep] ?? null) : null,
  );

  const startBusiness = useMutation(api.activation.startBeautyBusiness);
  const saveLocation = useMutation(api.activation.saveLocation);
  const saveFirstService = useMutation(api.activation.saveFirstService);
  const saveHours = useMutation(api.activation.saveHours);
  const generateUploadUrl = useMutation(api.activation.generateUploadUrl);
  const saveStorefront = useMutation(api.activation.saveStorefront);

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
  const progress = ((stepIndex + 1) / STEP_ORDER.length) * 100;
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

    if (field === "price") {
      await saveFirstService({
        serviceId: state?.firstService?._id,
        name: service.name,
        description: service.description || undefined,
        durationMins: service.durationMins,
        priceMinorUnits: Math.round(
          Number(service.price.replace(",", ".")) * 100,
        ),
      });
      toast.success("First service saved");
    }
    goNext();
  };

  const handleHoursSaved = async (day: OpeningHour) => {
    const nextHours = currentDraft.hours.map((current) =>
      current.dayOfWeek === day.dayOfWeek ? day : current,
    );
    updateDraft({ hours: nextHours });
    if (day.dayOfWeek === DAYS.length - 1) {
      await saveHours({ openingHours: nextHours });
      toast.success("Opening hours saved");
    }
    goNext();
  };

  const handleImageSaved = async (
    kind: "logo" | "cover" | "gallery",
    value: File | File[] | null,
  ) => {
    const storefront = {
      ...currentDraft.storefront,
      [kind]:
        kind === "gallery"
          ? Array.isArray(value)
            ? value
            : []
          : Array.isArray(value)
            ? (value[0] ?? null)
            : value,
    } as StorefrontDraft;
    updateDraft({ storefront });

    if (kind === "gallery") {
      const [logoStorageId, coverStorageId, galleryStorageIds] =
        await Promise.all([
          storefront.logo
            ? uploadFile(storefront.logo, generateUploadUrl)
            : undefined,
          storefront.cover
            ? uploadFile(storefront.cover, generateUploadUrl)
            : undefined,
          Promise.all(
            storefront.gallery.map((file) =>
              uploadFile(file, generateUploadUrl),
            ),
          ),
        ]);
      await saveStorefront({
        tagline: storefront.tagline || undefined,
        bio: storefront.bio || undefined,
        phone: storefront.phone || undefined,
        logoStorageId,
        coverStorageId,
        galleryStorageIds,
      });
      toast.success("Public profile saved");
    }
    goNext();
  };

  const imageExists = Boolean(
    currentDraft.storefront.logo ||
    currentDraft.storefront.cover ||
    state?.org.logoUrl ||
    state?.media.some((item) => item.type === "cover"),
  );
  const hourIndex = step.startsWith("hours-")
    ? Number(step.slice("hours-".length))
    : -1;

  return (
    <main className="min-h-screen bg-background">
      <div className="fixed inset-x-0 top-0 z-20 h-0.5 bg-border">
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
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

      <div className="mx-auto flex min-h-[calc(100vh-92px)] max-w-3xl flex-col items-center px-6 pb-16 pt-8 sm:px-10 sm:pt-16">
        <div className="mb-12 flex w-full max-w-xl items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span>{sectionLabel(step)}</span>
          <span className="font-outfit tracking-normal">
            {stepIndex + 1} / {STEP_ORDER.length}
          </span>
        </div>

        <div className="flex w-full max-w-xl flex-1 items-start justify-center">
          {step === "business-name" && (
            <TextInputStep
              id="business-name"
              eyebrow="Your studio"
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
              eyebrow="Your first service"
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

          {step === "service-description" && (
            <TextInputStep
              id="service-description"
              eyebrow="Your first service"
              title="How would you describe it?"
              description="A short description helps customers choose with confidence."
              value={currentDraft.service.description}
              placeholder="What is included, and what should customers expect?"
              canGoBack={canGoBack}
              onBack={goBack}
              maxLength={500}
              multiline
              optional
              onSaved={(value) => handleServiceSaved("description", value)}
            />
          )}

          {step === "service-duration" && (
            <TextInputStep
              id="service-duration"
              eyebrow="Your first service"
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
                return !Number.isInteger(duration) || duration <= 0
                  ? "Enter a whole number of minutes."
                  : null;
              }}
              onSaved={(value) => handleServiceSaved("durationMins", value)}
            />
          )}

          {step === "service-price" && (
            <TextInputStep
              id="service-price"
              eyebrow="Your first service"
              title="What does it cost?"
              description="Enter the price customers will see."
              value={currentDraft.service.price}
              placeholder="25.00 MKD"
              inputMode="decimal"
              canGoBack={canGoBack}
              onBack={goBack}
              validate={(value) =>
                /^\d+([.,]\d{1,2})?$/.test(value)
                  ? null
                  : "Enter a valid price."
              }
              onSaved={(value) => handleServiceSaved("price", value)}
            />
          )}

          {hourIndex >= 0 && (
            <HoursDayStep
              day={currentDraft.hours[hourIndex] ?? DEFAULT_HOURS[hourIndex]}
              canGoBack={canGoBack}
              onBack={goBack}
              onSaved={handleHoursSaved}
            />
          )}

          {step === "storefront-logo" && (
            <ImageStep
              kind="logo"
              value={currentDraft.storefront.logo}
              existingLabel={
                state?.org.logoUrl ? "Keep current logo" : undefined
              }
              canGoBack={canGoBack}
              onBack={goBack}
              onSaved={(value) => handleImageSaved("logo", value)}
              optional
            />
          )}

          {step === "storefront-cover" && (
            <ImageStep
              kind="cover"
              value={currentDraft.storefront.cover}
              existingLabel={
                imageExists ? "Keep current profile image" : undefined
              }
              hasExistingImage={imageExists}
              canGoBack={canGoBack}
              onBack={goBack}
              onSaved={(value) => handleImageSaved("cover", value)}
            />
          )}

          {step === "storefront-tagline" && (
            <TextInputStep
              id="storefront-tagline"
              eyebrow="Public profile"
              title="What should your tagline say?"
              description="Keep it short. This line appears next to your studio name."
              value={currentDraft.storefront.tagline}
              placeholder="Sharp cuts. Easy booking."
              canGoBack={canGoBack}
              onBack={goBack}
              maxLength={100}
              optional
              onSaved={(tagline) => {
                updateDraft({
                  storefront: { ...currentDraft.storefront, tagline },
                });
                goNext();
              }}
            />
          )}

          {step === "storefront-bio" && (
            <TextInputStep
              id="storefront-bio"
              eyebrow="Public profile"
              title="Tell customers about your studio"
              description="Share what you care about and what the experience feels like."
              value={currentDraft.storefront.bio}
              placeholder="A calm space for considered beauty appointments."
              canGoBack={canGoBack}
              onBack={goBack}
              maxLength={800}
              multiline
              optional
              onSaved={(bio) => {
                updateDraft({
                  storefront: { ...currentDraft.storefront, bio },
                });
                goNext();
              }}
            />
          )}

          {step === "storefront-phone" && (
            <TextInputStep
              id="storefront-phone"
              eyebrow="Public profile"
              title="What number should customers use?"
              description="Add a phone number for questions or appointment changes."
              value={currentDraft.storefront.phone}
              placeholder="+389 70 000 000"
              type="tel"
              inputMode="tel"
              canGoBack={canGoBack}
              onBack={goBack}
              maxLength={30}
              optional
              onSaved={(phone) => {
                updateDraft({
                  storefront: { ...currentDraft.storefront, phone },
                });
                goNext();
              }}
            />
          )}

          {step === "storefront-gallery" && (
            <ImageStep
              kind="gallery"
              value={currentDraft.storefront.gallery}
              canGoBack={canGoBack}
              onBack={goBack}
              onSaved={(value) => handleImageSaved("gallery", value)}
              multiple
              optional
            />
          )}

          {step === "review" && state && (
            <ReviewStep
              state={state}
              preview={preview}
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
