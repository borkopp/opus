"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { IconDeviceFloppy, IconSearch, IconLoader2, IconMapPin } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const LocationMapPicker = dynamic(
  () => import("@/components/dashboard/LocationMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[320px] rounded-xl bg-muted animate-pulse border border-border/60" />
    ),
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

export function LocationTab({ orgId, initialData }: LocationTabProps) {
  const [location, setLocation] = useState({ ...initialData });
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState(initialData.address || "");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setLocation({ ...initialData });
    setQuery(initialData.address || "");
  }, [
    initialData.address,
    initialData.city,
    initialData.neighborhood,
    initialData.postalCode,
    initialData.country,
    initialData.coordinates,
  ]);

  const updateLocation = useMutation(api.orgSettings.updateLocation);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 3) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json?access_token=${token}&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.features || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const selectResult = (feature: any) => {
    const [lng, lat] = feature.center;
    let city = "";
    let neighborhood = "";
    let postalCode = "";
    let country = "";

    feature.context?.forEach((ctx: any) => {
      if (ctx.id.startsWith("place")) city = ctx.text;
      if (ctx.id.startsWith("locality") || ctx.id.startsWith("district")) neighborhood = ctx.text;
      if (ctx.id.startsWith("postcode")) postalCode = ctx.text;
      if (ctx.id.startsWith("country")) country = ctx.short_code?.toUpperCase() || ctx.text;
    });

    const address = feature.text || feature.place_name.split(",")[0];

    setLocation({
      ...location,
      coordinates: { lat, lng },
      address,
      city,
      neighborhood,
      postalCode,
      country: country || "MK",
    });
    setResults([]);
    setQuery(feature.place_name);
  };

  const handleMapChange = async (coords: { lat: number; lng: number }) => {
    setLocation((prev) => ({ ...prev, coordinates: coords }));

    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${token}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      const feature = data.features?.[0];
      if (feature) {
        let city = "";
        let neighborhood = "";
        let postalCode = "";
        let country = "";
        feature.context?.forEach((ctx: any) => {
          if (ctx.id.startsWith("place")) city = ctx.text;
          if (ctx.id.startsWith("locality") || ctx.id.startsWith("district")) neighborhood = ctx.text;
          if (ctx.id.startsWith("postcode")) postalCode = ctx.text;
          if (ctx.id.startsWith("country")) country = ctx.short_code?.toUpperCase() || ctx.text;
        });
        const address = feature.text || feature.place_name.split(",")[0];
        setLocation((prev) => ({
          ...prev,
          address,
          city,
          neighborhood,
          postalCode,
          country: country || "MK",
        }));
        setQuery(feature.place_name);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateLocation({
        orgId,
        address: location.address || undefined,
        city: location.city || undefined,
        neighborhood: location.neighborhood || undefined,
        postalCode: location.postalCode || undefined,
        country: location.country || undefined,
        coordinates: location.coordinates ?? undefined,
      });
      toast.success("Location saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSaving(false);
  };

  return (
    <TabsContent
      value="location"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
        <div className="mb-8">
          <h2 className="text-2xl font-medium font-display tracking-tight mb-1">Business <span className="serif-accent-inline text-2xl">Location</span></h2>
          <p className="text-sm text-muted-foreground">
            Set your address and pin your location on the map so customers can find you.
          </p>
        </div>
        <div className="grid gap-10 p-6 border border-border/60 rounded-xl bg-background shadow-s dark:shadow-l">
          {/* Map & Search Section */}
          <div className="grid gap-6">
            <div className="grid gap-2 max-w-2xl relative">
              <Label>Search Address</Label>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Search for your business address..."
                  className="pl-10 pr-10 bg-white"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {isSearching && (
                  <IconLoader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" size={16} />
                )}
              </div>

              {results.length > 0 && (
                <div className="absolute z-50 w-full top-full mt-1 bg-card border border-border/40 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition flex flex-col gap-0.5"
                      onClick={() => selectResult(r)}
                    >
                      <span className="font-semibold text-foreground">{r.text}</span>
                      <span className="text-xs text-muted-foreground truncate">{r.place_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2 max-w-2xl">
              <Label htmlFor="map-pin">
                Map pin{" "}
                <span className="text-muted-foreground font-normal ml-1">
                  Click the map or drag the pin to set your exact location.
                </span>
              </Label>
              <LocationMapPicker
                coords={location.coordinates}
                onChange={handleMapChange}
              />
            </div>
          </div>

          <div className="h-px bg-border/40" />

          {/* Detailed fields for confirmation/fine-tuning */}
          <div className="grid gap-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                  <IconMapPin size={14} className="text-accent" />
                </div>
                Confirmed Details
              </h3>
              
              <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
                <div className="sm:col-span-2 grid gap-2">
                  <Label htmlFor="street-address">Street address</Label>
                  <DebouncedInput
                    id="street-address"
                    placeholder="Ul. Makedonija 12"
                    value={location.address}
                    onChange={(val) => setLocation({ ...location, address: val })}
                    className="bg-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <DebouncedInput
                    id="city"
                    placeholder="Skopje"
                    value={location.city}
                    onChange={(val) => setLocation({ ...location, city: val })}
                    className="bg-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="neighborhood">Neighborhood</Label>
                  <DebouncedInput
                    id="neighborhood"
                    placeholder="Centar"
                    value={location.neighborhood}
                    onChange={(val) => setLocation({ ...location, neighborhood: val })}
                    className="bg-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="postal-code">Postal code</Label>
                  <DebouncedInput
                    id="postal-code"
                    placeholder="1000"
                    value={location.postalCode}
                    onChange={(val) => setLocation({ ...location, postalCode: val })}
                    className="bg-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <DebouncedInput
                    id="country"
                    placeholder="MK"
                    value={location.country}
                    onChange={(val) => setLocation({ ...location, country: val })}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 flex">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 rounded-full h-10 px-5 active:scale-[0.98] transition-transform">
            <IconDeviceFloppy size={18} /> Save Location
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
