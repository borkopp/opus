"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
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
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { onboardingError } from "@/lib/i18n/onboarding";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { ActivationState } from "@/lib/onboarding";
const LocationMapPicker = dynamic(
  () => import("@/components/dashboard/LocationMapPicker"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-60 rounded-2xl sm:h-80" />,
  },
);

export function LocationStep({
  state,
  value,
  canGoBack,
  onBack,
  onSaved,
}: {
  state: ActivationState;
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
  const [showMap, setShowMap] = useState(false);
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
        replayPublicDescription
        replayPublicTitle
        title={t("Where is your studio?", "Каде се наоѓа вашето студио?")}
        description={t(
          "Choose your address. We’ll place it on the map for you.",
          "Изберете ја адресата. Ние ќе ја означиме на мапата.",
        )}
      >
        <Field data-invalid={Boolean(selectionError || searchError)}>
          <FieldLabel
            data-replay-public
            className="sr-only"
            htmlFor="location-search"
          >
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
                  setShowMap(false);
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
              <FieldDescription data-replay-public className="text-success">
                {t(
                  "Address selected. You can continue.",
                  "Адресата е избрана. Можете да продолжите.",
                )}
              </FieldDescription>
            ) : null}
          </div>
        </Field>
        {selectedLocation && (
          <details
            className="mt-2"
            open={showMap}
            onToggle={(event) => setShowMap(event.currentTarget.open)}
          >
            <summary
              data-replay-public
              className="min-h-11 cursor-pointer py-3 text-sm text-muted-foreground"
            >
              {t(
                "Adjust map location (optional)",
                "Променете ја локацијата на мапата (незадолжително)",
              )}
            </summary>
            <Field data-invalid={Boolean(pinError)}>
              <FieldLabel data-replay-public>
                {t("Exact map pin", "Точна локација на мапата")}
              </FieldLabel>
              {showMap && (
                <LocationMapPicker
                  className="h-60 sm:h-80"
                  coords={selectedLocation.coordinates}
                  onChange={updatePin}
                />
              )}
              <div className="min-h-5">
                {pinError ? (
                  <FieldError aria-live="polite">
                    {onboardingError(pinError, language)}
                  </FieldError>
                ) : (
                  <FieldDescription data-replay-public aria-live="polite">
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
          </details>
        )}
        {pinError && !showMap && (
          <FieldError role="alert">
            {onboardingError(pinError, language)}
          </FieldError>
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
        <p
          data-replay-public
          className="mt-5 text-center text-xs text-muted-foreground"
        >
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
