"use client";

import Map, {
  AttributionControl,
  Marker,
  NavigationControl,
} from "react-map-gl/mapbox";
import type { MarkerDragEvent, MapMouseEvent } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";
import { useTheme } from "next-themes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  isCoordinateInNorthMacedonia,
  NORTH_MACEDONIA_MAP_BOUNDS,
} from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const DEFAULT_CENTER = { lng: 21.4254, lat: 41.9965 };
const NORTH_MACEDONIA_BOUNDS: [[number, number], [number, number]] = [
  [NORTH_MACEDONIA_MAP_BOUNDS.west, NORTH_MACEDONIA_MAP_BOUNDS.south],
  [NORTH_MACEDONIA_MAP_BOUNDS.east, NORTH_MACEDONIA_MAP_BOUNDS.north],
];

interface LocationMapPickerProps {
  coords?: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
}

export default function LocationMapPicker({
  coords,
  onChange,
}: LocationMapPickerProps) {
  const { t } = useDashboardI18n();
  const { resolvedTheme } = useTheme();
  const hasValidCoords = Boolean(
    coords && isCoordinateInNorthMacedonia(coords),
  );
  const confirmedCoords = hasValidCoords ? coords : null;
  const center = confirmedCoords ?? {
    lat: DEFAULT_CENTER.lat,
    lng: DEFAULT_CENTER.lng,
  };
  const mapKey = `${center.lat.toFixed(5)}:${center.lng.toFixed(5)}`;

  const placePin = (event: MapMouseEvent | MarkerDragEvent) => {
    const next = { lat: event.lngLat.lat, lng: event.lngLat.lng };
    if (isCoordinateInNorthMacedonia(next)) {
      onChange(next);
    }
  };

  if (!TOKEN) {
    return (
      <Alert variant="destructive">
        <MapPin />
        <AlertTitle>
          {t("Map is unavailable", "Мапата не е достапна")}
        </AlertTitle>
        <AlertDescription>
          {t(
            "Mapbox is not configured for this deployment. Search and pinning are temporarily unavailable.",
            "Mapbox не е конфигуриран за оваа инсталација. Пребарувањето и означувањето се привремено недостапни.",
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-80 w-full overflow-hidden rounded-2xl border bg-muted">
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
            zoom: confirmedCoords ? 15 : 12,
          }}
          maxBounds={NORTH_MACEDONIA_BOUNDS}
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
          {confirmedCoords && (
            <Marker
              longitude={confirmedCoords.lng}
              latitude={confirmedCoords.lat}
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
        {!confirmedCoords && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-background/90 px-4 py-2 text-sm text-muted-foreground shadow-lg backdrop-blur">
              {t(
                "Click the map to pin your location",
                "Кликнете на мапата за да ја означите вашата локација",
              )}
            </div>
          </div>
        )}
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        {confirmedCoords
          ? `${confirmedCoords.lat.toFixed(5)}, ${confirmedCoords.lng.toFixed(5)} — ${t("drag the pin or click the map to adjust", "повлечете го пинот или кликнете на мапата за прилагодување")}`
          : t("No coordinates confirmed", "Нема потврдени координати")}
      </p>
    </div>
  );
}
