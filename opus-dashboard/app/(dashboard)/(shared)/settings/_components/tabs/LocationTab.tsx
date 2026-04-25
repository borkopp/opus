"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import dynamic from "next/dynamic";

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

  useEffect(() => {
    setLocation({ ...initialData });
  }, [
    initialData.address,
    initialData.city,
    initialData.neighborhood,
    initialData.postalCode,
    initialData.country,
    initialData.coordinates,
  ]);

  const updateLocation = useMutation(api.orgSettings.updateLocation);

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
        <div className="space-y-10">
          {/* Address fields */}
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

          {/* Map pin */}
          <div className="grid gap-2 max-w-2xl">
            <Label htmlFor="map-pin">
              Map pin{" "}
              <span className="text-muted-foreground font-normal ml-1">
                Click the map or drag the pin to set your exact location. Use &ldquo;Find on
                map&rdquo; to geocode the address above.
              </span>
            </Label>
            <LocationMapPicker
              coords={location.coordinates}
              geocodeQuery={[location.address, location.city, location.country]
                .filter(Boolean)
                .join(", ")}
              onChange={(coords) => setLocation({ ...location, coordinates: coords })}
            />
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
