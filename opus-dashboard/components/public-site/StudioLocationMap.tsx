"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CarFront, Footprints, LocateFixed, MapPin } from "lucide-react";
import { useTheme } from "next-themes";
import Map, {
  AttributionControl,
  Layer,
  Marker,
  NavigationControl,
  Source,
} from "react-map-gl/mapbox";
import type { LayerProps, MapRef } from "react-map-gl/mapbox";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  formatMapboxDistance,
  formatMapboxDuration,
  getMapboxDirections,
  type MapboxRoute,
  type MapboxTravelMode,
} from "@/lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Locale } from "../../../shared/i18n/locale";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const ROUTE_CASING_LAYER: LayerProps = {
  id: "studio-route-casing",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": "rgba(255, 255, 255, 0.92)",
    "line-width": 8,
  },
};

const ROUTE_LAYER: LayerProps = {
  id: "studio-route",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": "#ef7d43",
    "line-width": 4,
  },
};

type Coordinates = { lat: number; lng: number };
type RouteStatus = "idle" | "locating" | "routing" | "ready" | "error";

function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Дозволете пристап до локацијата за да добиете проценка.";
  }
  if (error.code === error.TIMEOUT) {
    return "Локацијата не одговори навреме. Обидете се повторно.";
  }
  return "Вашата локација моментално не е достапна.";
}

function routeBounds(coordinates: [number, number][]) {
  const longitudes = coordinates.map(([lng]) => lng);
  const latitudes = coordinates.map(([, lat]) => lat);

  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ] as [[number, number], [number, number]];
}

export function StudioLocationMap({
  studioName,
  coordinates: destination,
  locale = "mk",
}: {
  studioName: string;
  coordinates: Coordinates;
  locale?: Locale;
}) {
  const t = (en: string, mk: string, sq: string) => ({ en, mk, sq })[locale];
  const errorLabel = (message: string) =>
    ({
      "Дозволете пристап до локацијата за да добиете проценка.": t(
        "Allow location access for an estimate.",
        "Дозволете пристап до локацијата за да добиете проценка.",
        "Lejoni vendndodhjen për një vlerësim.",
      ),
      "Локацијата не одговори навреме. Обидете се повторно.": t(
        "Location request timed out. Try again.",
        "Локацијата не одговори навреме. Обидете се повторно.",
        "Kërkesa për vendndodhjen skadoi. Provoni përsëri.",
      ),
      "Вашата локација моментално не е достапна.": t(
        "Your location is currently unavailable.",
        "Вашата локација моментално не е достапна.",
        "Vendndodhja juaj nuk është e disponueshme aktualisht.",
      ),
      "Не можевме да ја пресметаме рутата. Обидете се повторно.": t(
        "We could not calculate the route. Try again.",
        "Не можевме да ја пресметаме рутата. Обидете се повторно.",
        "Nuk mund ta llogarisnim rrugën. Provoni përsëri.",
      ),
      "Вашиот прелистувач не поддржува споделување локација.": t(
        "Your browser does not support location sharing.",
        "Вашиот прелистувач не поддржува споделување локација.",
        "Shfletuesi juaj nuk mbështet ndarjen e vendndodhjes.",
      ),
    })[message] ?? message;
  const destinationLat = destination.lat;
  const destinationLng = destination.lng;
  const mapRef = useRef<MapRef>(null);
  const routeCache = useRef<Partial<Record<MapboxTravelMode, MapboxRoute>>>({});
  const { resolvedTheme } = useTheme();
  const [travelMode, setTravelMode] = useState<MapboxTravelMode | null>(null);
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [route, setRoute] = useState<MapboxRoute | null>(null);
  const [status, setStatus] = useState<RouteStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const routeGeoJson = useMemo(
    () =>
      route
        ? {
            type: "Feature" as const,
            properties: {},
            geometry: route.geometry,
          }
        : null,
    [route],
  );

  useEffect(() => {
    if (!origin || !travelMode) return;

    const cachedRoute = routeCache.current[travelMode];
    if (cachedRoute) {
      setRoute(cachedRoute);
      setStatus("ready");
      return;
    }

    const controller = new AbortController();
    setRoute(null);
    setStatus("routing");

    void getMapboxDirections({
      origin,
      destination: { lat: destinationLat, lng: destinationLng },
      mode: travelMode,
      signal: controller.signal,
    })
      .then((nextRoute) => {
        routeCache.current[travelMode] = nextRoute;
        setRoute(nextRoute);
        setStatus("ready");
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }
        setRoute(null);
        setTravelMode(null);
        setStatus("error");
        setError("Не можевме да ја пресметаме рутата. Обидете се повторно.");
      });

    return () => controller.abort();
  }, [destinationLat, destinationLng, origin, travelMode]);

  useEffect(() => {
    if (!route) return;

    mapRef.current?.fitBounds(routeBounds(route.geometry.coordinates), {
      padding: { top: 40, right: 40, bottom: 72, left: 40 },
      duration: 700,
      maxZoom: 16,
    });
  }, [route]);

  const selectTravelMode = (value: string) => {
    if (value !== "driving" && value !== "walking") return;

    const nextMode = value as MapboxTravelMode;
    setTravelMode(nextMode);
    setError(null);

    if (origin) return;

    if (!navigator.geolocation) {
      setTravelMode(null);
      setStatus("error");
      setError("Вашиот прелистувач не поддржува споделување локација.");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (locationError) => {
        setTravelMode(null);
        setStatus("error");
        setError(geolocationErrorMessage(locationError));
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300_000,
        timeout: 10_000,
      },
    );
  };

  const statusContent = (() => {
    if (status === "locating") {
      return (
        <span className="inline-flex items-center gap-2">
          <Spinner aria-hidden="true" />
          {t("Locating…", "Локација…", "Duke gjetur vendndodhjen…")}
        </span>
      );
    }
    if (status === "routing") {
      return (
        <span className="inline-flex items-center gap-2">
          <Spinner aria-hidden="true" />
          {t("Routing…", "Рута…", "Duke llogaritur rrugën…")}
        </span>
      );
    }
    if (status === "ready" && route) {
      return (
        <>
          <span className="font-semibold text-foreground">
            {formatMapboxDuration(route.durationSeconds, locale)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatMapboxDistance(route.distanceMeters, locale)}</span>
        </>
      );
    }
    if (status === "error" && error) {
      return (
        <span className="text-destructive">
          {error.startsWith("Дозволете")
            ? t(
                "Enable location",
                "Овозможи локација",
                "Aktivizoni vendndodhjen",
              )
            : t("Try again", "Обиди се повторно", "Provoni përsëri")}
        </span>
      );
    }
    return "ETA";
  })();

  if (!MAPBOX_TOKEN) return null;

  return (
    <div
      className="relative h-60 w-full overflow-hidden rounded-xl bg-secondary ring-1 ring-border/40 sm:h-72"
      role="region"
      aria-label={t(
        `Interactive map to ${studioName}`,
        `Интерактивна мапа до ${studioName}`,
        `Harta interaktive për ${studioName}`,
      )}
    >
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={
          resolvedTheme === "dark"
            ? "mapbox://styles/mapbox/dark-v11"
            : "mapbox://styles/mapbox/light-v11"
        }
        initialViewState={{
          longitude: destinationLng,
          latitude: destinationLat,
          zoom: 15,
        }}
        projection="mercator"
        attributionControl={false}
        dragRotate={false}
        pitchWithRotate={false}
        scrollZoom={false}
        reuseMaps
        style={{ width: "100%", height: "100%" }}
      >
        <AttributionControl compact position="bottom-left" />
        <NavigationControl showCompass={false} position="top-right" />

        {routeGeoJson && (
          <Source id="studio-route-source" type="geojson" data={routeGeoJson}>
            <Layer {...ROUTE_CASING_LAYER} />
            <Layer {...ROUTE_LAYER} />
          </Source>
        )}

        {origin && (
          <Marker longitude={origin.lng} latitude={origin.lat} anchor="center">
            <span
              className="flex size-7 items-center justify-center rounded-full bg-background shadow-md ring-2 ring-foreground"
              role="img"
              aria-label={t(
                "Your location",
                "Вашата локација",
                "Vendndodhja juaj",
              )}
            >
              <LocateFixed className="size-4" aria-hidden="true" />
            </span>
          </Marker>
        )}

        <Marker
          longitude={destinationLng}
          latitude={destinationLat}
          anchor="bottom"
        >
          <span
            className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background"
            role="img"
            aria-label={studioName}
          >
            <MapPin className="size-5" aria-hidden="true" />
          </span>
        </Marker>
      </Map>

      <div className="pointer-events-none absolute bottom-3 left-1/2 flex max-w-[calc(100%_-_1.5rem)] -translate-x-1/2 items-center gap-2">
        <p
          className="pointer-events-auto flex h-10 min-w-14 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-background/95 px-3 text-xs text-muted-foreground shadow-m ring-1 ring-border/60 backdrop-blur-md"
          aria-live="polite"
          aria-label={
            status === "error" && error ? errorLabel(error) : undefined
          }
          title={status === "error" && error ? errorLabel(error) : undefined}
        >
          {statusContent}
        </p>

        <ToggleGroup
          type="single"
          size="sm"
          spacing={1}
          value={travelMode ?? ""}
          onValueChange={selectTravelMode}
          aria-label={t(
            "Travel mode",
            "Начин на патување",
            "Mënyra e udhëtimit",
          )}
          className="pointer-events-auto shrink-0 rounded-full bg-background/95 p-1 shadow-m ring-1 ring-border/60 backdrop-blur-md"
        >
          <ToggleGroupItem
            value="driving"
            aria-label={t(
              "Calculate driving route",
              "Пресметај пат со автомобил",
              "Llogaritni rrugën me makinë",
            )}
            title={t("Driving", "Автомобил", "Me makinë")}
            className="size-8 rounded-full px-0"
          >
            <CarFront aria-hidden="true" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="walking"
            aria-label={t(
              "Calculate walking route",
              "Пресметај пат пеш",
              "Llogaritni rrugën në këmbë",
            )}
            title={t("Walking", "Пеш", "Në këmbë")}
            className="size-8 rounded-full px-0"
          >
            <Footprints aria-hidden="true" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
