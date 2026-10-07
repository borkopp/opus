"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Save, Search, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Disclosure } from "@/components/ui/disclosure";
import { useSettingsDraft } from "@/hooks/use-settings-draft";
import { trimSettingsText } from "@/lib/settings-form";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useMapboxSearch } from "@/hooks/use-mapbox-search";
import {
  parseMapboxFeature,
  reverseGeocodeMapbox,
  type BusinessLocation,
} from "@/lib/mapbox";
import { SettingsCard } from "@/components/settings/SettingsCard";

const LocationMapPicker = dynamic(
  () => import("@/components/dashboard/LocationMapPicker"),
  {
    ssr: false,
    loading: () => <div className="h-80 rounded-2xl border bg-muted" />,
  },
);

interface LocationTabProps {
  orgId: Id<"orgs">;
  initialData: {
    address: string;
    city: string;
    neighborhood: string;
    postalCode: string;
    country: string;
    coordinates: { lat: number; lng: number } | null;
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function LocationTab({ initialData }: LocationTabProps) {
  const { t } = useDashboardI18n();
  const {
    draft: location,
    setDraft: setLocation,
    isDirty,
  } = useSettingsDraft(initialData);
  const [query, setQuery] = useState(initialData.address);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { results, isSearching, error, clearResults } = useMapboxSearch(
    query,
    isSearchOpen,
  );
  const save = useMutation(api.activation.saveLocation);

  useEffect(() => {
    if (!isSearchOpen) return;

    const dismissSearch = (event: PointerEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("pointerdown", dismissSearch);
    return () => document.removeEventListener("pointerdown", dismissSearch);
  }, [isSearchOpen]);

  const applyLocation = (next: BusinessLocation) => {
    setLocation({
      address: next.address,
      city: next.city,
      neighborhood: next.neighborhood,
      postalCode: next.postalCode,
      country: next.country,
      coordinates: next.coordinates,
    });
    setQuery(next.displayName);
    setIsSearchOpen(false);
    clearResults();
  };

  const clearSearch = () => {
    setQuery("");
    setIsSearchOpen(false);
    clearResults();
  };

  const handleMapChange = async (coordinates: { lat: number; lng: number }) => {
    setLocation((current) => ({ ...current, coordinates }));
    try {
      const resolved = await reverseGeocodeMapbox(coordinates);
      if (resolved) applyLocation(resolved);
    } catch (caught) {
      toast.error(
        getErrorMessage(
          caught,
          t(
            "Location could not be saved.",
            "Локацијата не може да се зачува.",
            "Vendndodhja nuk mund të ruhej.",
          ),
        ),
      );
    }
  };

  const handleSave = async () => {
    if (!location.coordinates) {
      toast.error(
        t(
          "Confirm the map pin before saving.",
          "Потврдете ја точната локација на мапата пред да зачувате.",
          "Konfirmoni gjilpërën në hartë para se të ruani.",
        ),
      );
      return;
    }
    setIsSaving(true);
    try {
      const normalized = trimSettingsText(location);
      setLocation(normalized);
      await save({
        address: normalized.address,
        city: normalized.city,
        neighborhood: normalized.neighborhood || undefined,
        postalCode: normalized.postalCode || undefined,
        country: normalized.country,
        coordinates: location.coordinates,
      });
      toast.success(
        t("Location saved", "Локацијата е зачувана", "Vendndodhja u ruajt"),
      );
    } catch (caught) {
      toast.error(
        getErrorMessage(
          caught,
          t(
            "Location could not be saved.",
            "Локацијата не може да се зачува.",
            "Vendndodhja nuk mund të ruhej.",
          ),
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const update = (
    field: keyof Omit<typeof location, "coordinates">,
    value: string,
  ) => setLocation((current) => ({ ...current, [field]: value }));

  return (
    <SettingsCard
      title={t(
        "Business location",
        "Локација на бизнисот",
        "Vendndodhja e biznesit",
      )}
      description={t(
        "This confirmed address and map pin appear on your studio website and keep booking setup complete.",
        "Оваа потврдена адреса и точна локација на мапата се прикажуваат на веб-страницата на студиото и овозможуваат комплетно поставување на закажувањето.",
        "Kjo adresë e konfirmuar dhe gjilpëra në hartë shfaqen në uebsajtin e studios suaj dhe e mbajnë konfigurimin e rezervimeve të plotë.",
      )}
      footer={
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          {isSaving
            ? t("Saving…", "Се зачувува…", "Duke ruajtur…")
            : t("Save location", "Зачувај локација", "Ruaj vendndodhjen")}
        </Button>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel data-replay-public htmlFor="settings-address-search">
            {t("Find an address", "Најди адреса", "Gjeni një adresë")}
          </FieldLabel>
          <div ref={searchContainerRef} className="relative">
            <InputGroup>
              <InputGroupAddon>
                {isSearching ? <Spinner /> : <Search />}
              </InputGroupAddon>
              <InputGroupInput
                id="settings-address-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsSearchOpen(false);
                    event.currentTarget.blur();
                  }
                }}
                placeholder={t(
                  "Search by street or venue",
                  "Пребарај по улица или објект",
                  "Kërkoni sipas rrugës ose objektit",
                )}
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="settings-address-results"
                aria-expanded={isSearchOpen && results.length > 0}
              />
              {query && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={t(
                      "Clear address search",
                      "Исчисти пребарување на адреса",
                      "Pastro kërkimin e adresës",
                    )}
                    onClick={clearSearch}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            {isSearchOpen && results.length > 0 && (
              <div
                id="settings-address-results"
                role="listbox"
                className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border bg-popover shadow-lg"
              >
                {results.map((feature) => (
                  <button
                    key={feature.id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-secondary"
                    onClick={() => applyLocation(parseMapboxFeature(feature))}
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
          {error && <p className="text-sm text-destructive">{error}</p>}
        </Field>

        <Field>
          <FieldLabel data-replay-public>
            {t(
              "Exact map pin",
              "Точна позиција на мапата",
              "Pozicioni i saktë në hartë",
            )}
          </FieldLabel>
          <LocationMapPicker
            coords={location.coordinates}
            onChange={handleMapChange}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel data-replay-public htmlFor="settings-address">
              {t("Street address", "Улица и број", "Adresa e rrugës")}
            </FieldLabel>
            <Input
              id="settings-address"
              value={location.address}
              onChange={(event) => update("address", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel data-replay-public htmlFor="settings-city">
              {t("City", "Град", "Qyteti")}
            </FieldLabel>
            <Input
              id="settings-city"
              value={location.city}
              onChange={(event) => update("city", event.target.value)}
            />
          </Field>
          <Disclosure
            className="sm:col-span-2"
            title={t(
              "Additional address details",
              "Дополнителни податоци за адресата",
              "Detaje shtesë të adresës",
            )}
          >
            <FieldGroup>
              {" "}
              <Field>
                <FieldLabel data-replay-public htmlFor="settings-neighborhood">
                  {t("Neighborhood", "Населба", "Lagjja")}
                </FieldLabel>
                <Input
                  id="settings-neighborhood"
                  value={location.neighborhood}
                  onChange={(event) =>
                    update("neighborhood", event.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel data-replay-public htmlFor="settings-postal">
                  {t("Postal code", "Поштенски број", "Kodi postar")}
                </FieldLabel>
                <Input
                  id="settings-postal"
                  value={location.postalCode}
                  onChange={(event) => update("postalCode", event.target.value)}
                />
              </Field>
            </FieldGroup>
          </Disclosure>
        </div>
      </FieldGroup>
    </SettingsCard>
  );
}
