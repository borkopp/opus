"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { MapPin, Save, Search, X } from "lucide-react";
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
import { TabsContent } from "@/components/ui/tabs";
import { useMapboxSearch } from "@/hooks/use-mapbox-search";
import {
  parseMapboxFeature,
  reverseGeocodeMapbox,
  type BusinessLocation,
} from "@/lib/mapbox";
import { SettingsCard } from "../SettingsCard";

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

function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Location could not be saved.";
}

export function LocationTab({ initialData }: LocationTabProps) {
  const [location, setLocation] = useState(initialData);
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
      toast.error(message(caught));
    }
  };

  const handleSave = async () => {
    if (!location.coordinates) {
      toast.error("Confirm the map pin before saving.");
      return;
    }
    setIsSaving(true);
    try {
      await save({
        address: location.address,
        city: location.city,
        neighborhood: location.neighborhood || undefined,
        postalCode: location.postalCode || undefined,
        country: location.country,
        coordinates: location.coordinates,
      });
      toast.success("Location saved");
    } catch (caught) {
      toast.error(message(caught));
    } finally {
      setIsSaving(false);
    }
  };

  const update = (
    field: keyof Omit<typeof location, "coordinates">,
    value: string,
  ) => setLocation((current) => ({ ...current, [field]: value }));

  return (
    <TabsContent value="location" className="m-0">
      <SettingsCard
        title="Business location"
        description="This confirmed address and map pin appear on your studio website and keep booking setup complete."
        footer={
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Spinner /> : <Save />}
            Save location
          </Button>
        }
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="settings-address-search">
              Find an address
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
                  placeholder="Search by street or venue"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-controls="settings-address-results"
                  aria-expanded={isSearchOpen && results.length > 0}
                />
                {query && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label="Clear address search"
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
                      <span className="text-sm font-medium">
                        {feature.text}
                      </span>
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
            <FieldLabel>Exact map pin</FieldLabel>
            <LocationMapPicker
              coords={location.coordinates}
              onChange={handleMapChange}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="settings-address">Street address</FieldLabel>
              <Input
                id="settings-address"
                value={location.address}
                onChange={(event) => update("address", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-city">City</FieldLabel>
              <Input
                id="settings-city"
                value={location.city}
                onChange={(event) => update("city", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-neighborhood">
                Neighborhood
              </FieldLabel>
              <Input
                id="settings-neighborhood"
                value={location.neighborhood}
                onChange={(event) => update("neighborhood", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-postal">Postal code</FieldLabel>
              <Input
                id="settings-postal"
                value={location.postalCode}
                onChange={(event) => update("postalCode", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-country">Country code</FieldLabel>
              <Input
                id="settings-country"
                maxLength={2}
                className="uppercase"
                value={location.country}
                onChange={(event) => update("country", event.target.value)}
              />
            </Field>
          </div>

          {location.coordinates && (
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin />
              {location.coordinates.lat.toFixed(5)},{" "}
              {location.coordinates.lng.toFixed(5)}
            </div>
          )}
        </FieldGroup>
      </SettingsCard>
    </TabsContent>
  );
}
