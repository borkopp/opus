"use client";

import Map, {
  AttributionControl,
  Marker,
  NavigationControl,
} from "react-map-gl/mapbox";
import type { MarkerDragEvent, MapMouseEvent } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";
import { useTheme } from "next-themes";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const DEFAULT_CENTER = { lng: 21.4254, lat: 41.9965 };

interface LocationMapPickerProps {
  coords?: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
}

export default function LocationMapPicker({
  coords,
  onChange,
}: LocationMapPickerProps) {
  const { resolvedTheme } = useTheme();
  const center = coords ?? {
    lat: DEFAULT_CENTER.lat,
    lng: DEFAULT_CENTER.lng,
  };
  const mapKey = `${center.lat.toFixed(5)}:${center.lng.toFixed(5)}`;

  const placePin = (event: MapMouseEvent | MarkerDragEvent) => {
    onChange({ lat: event.lngLat.lat, lng: event.lngLat.lng });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-80 w-full overflow-hidden rounded-2xl rounded-br-2xl border bg-muted">
        <Map
          key={mapKey}
          mapboxAccessToken={TOKEN}
          mapStyle={
            resolvedTheme === "dark"
              ? "mapbox://styles/mapbox/dark-v11"
              : "mapbox://styles/mapbox/light-v11"
          }
          initialViewState={{
            longitude: center.lng,
            latitude: center.lat,
            zoom: coords ? 15 : 12,
          }}
          projection="mercator"
          onClick={placePin}
          cursor="crosshair"
          dragRotate={false}
          pitchWithRotate={false}
          attributionControl={false}
          style={{ width: "100%", height: "100%" }}
        >
          <AttributionControl compact position="bottom-left" />
          <NavigationControl showCompass={false} position="top-right" />
          {coords && (
            <Marker
              longitude={coords.lng}
              latitude={coords.lat}
              anchor="bottom"
              draggable
              onDragEnd={placePin}
            >
              <div className="flex cursor-grab flex-col items-center active:cursor-grabbing">
                <div className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg ring-2 ring-background">
                  <MapPin />
                </div>
                <div className="-mt-0.5 size-2 rounded-full bg-foreground/20 blur-sm" />
              </div>
            </Marker>
          )}
        </Map>
        {!coords && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-background/90 px-4 py-2 text-sm text-muted-foreground shadow-lg backdrop-blur">
              Click the map to pin your location
            </div>
          </div>
        )}
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        {coords
          ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} — drag the pin or click the map to adjust`
          : "No coordinates confirmed"}
      </p>
    </div>
  );
}
