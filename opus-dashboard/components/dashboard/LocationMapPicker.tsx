"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, { Marker, NavigationControl, AttributionControl } from "react-map-gl/mapbox";
import type { MapRef, MarkerDragEvent, MapMouseEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { IconMapPin, IconSearch, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Default center: Skopje, MK
const DEFAULT_CENTER = { lng: 21.4254, lat: 41.9965 };

interface LocationMapPickerProps {
  coords?: { lat: number; lng: number } | null;
  geocodeQuery?: string; // address string to geocode on demand
  onChange: (coords: { lat: number; lng: number }) => void;
}

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => {
      const root = document.documentElement;
      if (root.classList.contains("dark")) return true;
      if (root.classList.contains("light")) return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    };
    setIsDark(check());
    const obs = new MutationObserver(() => setIsDark(check()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => setIsDark(check());
    mq.addEventListener("change", onMq);
    return () => { obs.disconnect(); mq.removeEventListener("change", onMq); };
  }, []);
  return isDark;
}

export default function LocationMapPicker({
  coords,
  geocodeQuery,
  onChange,
}: LocationMapPickerProps) {
  const mapRef = useRef<MapRef>(null);
  const isDark = useDarkMode();
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(coords ?? null);
  const [geocoding, setGeocoding] = useState(false);

  // Sync external coords changes (e.g. initial load or search selection)
  useEffect(() => {
    if (coords && (coords.lat !== pin?.lat || coords.lng !== pin?.lng)) {
      setPin(coords);
      flyTo(coords.lat, coords.lng);
    }
  }, [coords]); // eslint-disable-line

  const flyTo = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
  }, []);

  const placePin = useCallback(
    (lat: number, lng: number) => {
      setPin({ lat, lng });
      onChange({ lat, lng });
    },
    [onChange]
  );

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      placePin(e.lngLat.lat, e.lngLat.lng);
    },
    [placePin]
  );

  const handleDragEnd = useCallback(
    (e: MarkerDragEvent) => {
      placePin(e.lngLat.lat, e.lngLat.lng);
    },
    [placePin]
  );

  const handleGeocode = useCallback(async () => {
    if (!geocodeQuery?.trim()) {
      toast.error("Enter an address to search");
      return;
    }
    setGeocoding(true);
    try {
      const q = encodeURIComponent(geocodeQuery.trim());
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${TOKEN}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      const feature = data.features?.[0];
      if (!feature) {
        toast.error("Location not found — try a more specific address");
        return;
      }
      const [lng, lat] = feature.center as [number, number];
      placePin(lat, lng);
      flyTo(lat, lng);
    } catch {
      toast.error("Geocoding failed");
    } finally {
      setGeocoding(false);
    }
  }, [geocodeQuery, placePin, flyTo]);

  return (
    <div className="space-y-2">
      <div className="relative w-full h-[320px] rounded-xl overflow-hidden bg-muted border border-border/60">
        <Map
          ref={mapRef}
          mapboxAccessToken={TOKEN}
          mapStyle={isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
          initialViewState={{
            longitude: pin?.lng ?? DEFAULT_CENTER.lng,
            latitude: pin?.lat ?? DEFAULT_CENTER.lat,
            zoom: pin ? 15 : 12,
          }}
          projection="mercator"
          onClick={handleMapClick}
          cursor="crosshair"
          dragRotate={false}
          pitchWithRotate={false}
          attributionControl={false}
          style={{ width: "100%", height: "100%" }}
        >
          <AttributionControl compact position="bottom-left" />
          <NavigationControl showCompass={false} position="top-right" />

          {pin && (
            <Marker
              longitude={pin.lng}
              latitude={pin.lat}
              anchor="bottom"
              draggable
              onDragEnd={handleDragEnd}
            >
              <div
                className="flex flex-col items-center gap-0 cursor-grab active:cursor-grabbing"
                title="Drag to reposition"
              >
                <div
                  className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg ring-2 ring-background"
                  style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}
                >
                  <IconMapPin size={18} />
                </div>
                {/* Pointer shadow */}
                <div className="w-2 h-2 rounded-full bg-foreground/20 blur-sm -mt-0.5" />
              </div>
            </Marker>
          )}
        </Map>

        {/* Instruction hint */}
        {!pin && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-background/90 backdrop-blur-md rounded-full px-4 py-2 shadow-lg text-sm text-muted-foreground ring-1 ring-black/[0.06]">
              Click the map to pin your location
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 my-2">
        <p className="text-xs text-muted-foreground">
          {pin
            ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)} — drag pin or click map to adjust`
            : "No coordinates set"}
        </p>
        {/* <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGeocode}
          disabled={geocoding || !geocodeQuery?.trim()}
          className="gap-1.5 h-8 text-xs"
        >
          {geocoding ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconSearch size={13} />
          )}
          Find on map
        </Button> */}
      </div>
    </div>
  );
}
