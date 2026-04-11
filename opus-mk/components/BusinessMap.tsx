"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Map, {
  Marker,
  Source,
  Layer,
  NavigationControl,
  AttributionControl,
} from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { IconMapPin, IconNavigation, IconWalk, IconCar } from "@tabler/icons-react";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Approximation of --cta: oklch(47% 0.20 30) — dark clay/terracotta
const ROUTE_COLOR = "#8A3020";
const ROUTE_CASING_LIGHT = "rgba(255,255,255,0.6)";
const ROUTE_CASING_DARK = "rgba(0,0,0,0.4)";

interface BusinessMapProps {
  coordinates: { lat: number; lng: number };
  address?: string;
  city?: string;
  name: string;
}

type TravelMode = "walking" | "driving";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoJSONFC = { type: "FeatureCollection"; features: any[] };

interface RouteInfo {
  duration: number; // seconds
  distance: number; // meters
  geojson: GeoJSONFC;
}

function fmt_duration(s: number): string {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function fmt_distance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
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
    const onChange = () => setIsDark(check());
    mq.addEventListener("change", onChange);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", onChange);
    };
  }, []);
  return isDark;
}

export default function BusinessMap({
  coordinates,
  address,
  city,
  name,
}: BusinessMapProps) {
  const mapRef = useRef<MapRef>(null);
  const isDark = useDarkMode();

  const [mode, setMode] = useState<TravelMode>("walking");
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [userPos, setUserPos] = useState<{ lng: number; lat: number } | null>(null);
  const [locState, setLocState] = useState<"idle" | "loading" | "denied">("idle");

  // ── Geolocation ──
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lng: pos.coords.longitude, lat: pos.coords.latitude });
        setLocState("idle");
      },
      () => setLocState("denied"),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // ── Directions ──
  useEffect(() => {
    if (!userPos || !TOKEN) return;
    let cancelled = false;

    const url = [
      `https://api.mapbox.com/directions/v5/mapbox/${mode}`,
      `/${userPos.lng},${userPos.lat};${coordinates.lng},${coordinates.lat}`,
      `?geometries=geojson&overview=full&access_token=${TOKEN}`,
    ].join("");

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.routes?.[0]) return;
        const r = data.routes[0];
        const info: RouteInfo = {
          duration: r.duration,
          distance: r.distance,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          geojson: {
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: r.geometry, properties: {} }],
          },
        };
        setRoute(info);

        // Fit bounds to show both ends with padding
        const minLng = Math.min(userPos.lng, coordinates.lng);
        const maxLng = Math.max(userPos.lng, coordinates.lng);
        const minLat = Math.min(userPos.lat, coordinates.lat);
        const maxLat = Math.max(userPos.lat, coordinates.lat);
        const pad = 0.004;
        mapRef.current?.fitBounds(
          [
            [minLng - pad, minLat - pad],
            [maxLng + pad, maxLat + pad],
          ],
          { padding: 52, duration: 900, maxZoom: 16 }
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [userPos, mode, coordinates.lat, coordinates.lng]);

  // ── Directions URL for native maps ──
  const directionsUrl =
    typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)
      ? `http://maps.apple.com/?daddr=${coordinates.lat},${coordinates.lng}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}&travelmode=driving`;

  return (
    <div>
      {/* ── Map canvas ── */}
      <div className="relative w-full h-[240px] sm:h-[288px] rounded-2xl overflow-hidden bg-muted ring-1 ring-border/40">
        <Map
          ref={mapRef}
          mapboxAccessToken={TOKEN}
          mapStyle={
            isDark
              ? "mapbox://styles/mapbox/dark-v11"
              : "mapbox://styles/mapbox/light-v11"
          }
          initialViewState={{
            longitude: coordinates.lng,
            latitude: coordinates.lat,
            zoom: 15,
          }}
          attributionControl={false}
          dragRotate={false}
          pitchWithRotate={false}
          style={{ width: "100%", height: "100%" }}
        >
          <AttributionControl compact position="bottom-left" />
          <NavigationControl showCompass={false} position="top-right" />

          {/* Route */}
          {route && (
            <Source id="route" type="geojson" data={route.geojson}>
              <Layer
                id="route-casing"
                type="line"
                layout={{ "line-join": "round", "line-cap": "round" }}
                paint={{
                  "line-color": isDark ? ROUTE_CASING_DARK : ROUTE_CASING_LIGHT,
                  "line-width": 6,
                  "line-opacity": 1,
                }}
              />
              <Layer
                id="route-fill"
                type="line"
                layout={{ "line-join": "round", "line-cap": "round" }}
                paint={{
                  "line-color": ROUTE_COLOR,
                  "line-width": 3,
                  "line-opacity": 0.92,
                }}
              />
            </Source>
          )}

          {/* User dot */}
          {userPos && (
            <Marker longitude={userPos.lng} latitude={userPos.lat} anchor="center">
              <span className="relative flex h-[42px] w-[42px] items-center justify-center">
                <span
                  className="absolute inset-0 rounded-full border-2 border-blue-500/50"
                  style={{ animation: "opus-user-pulse 2.2s ease-out infinite" }}
                />
                <span className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 shadow-md ring-2 ring-white" />
              </span>
            </Marker>
          )}

          {/* Business pin */}
          <Marker
            longitude={coordinates.lng}
            latitude={coordinates.lat}
            anchor="center"
          >
            <div
              className="flex h-11 w-11 cursor-pointer select-none items-center justify-center rounded-full border-[3px] border-background bg-cta font-display text-lg font-semibold text-cta-foreground transition-transform duration-150 hover:scale-110 active:scale-95"
              style={{
                boxShadow: "0 4px 20px rgba(138,48,32,0.45), 0 1px 4px rgba(0,0,0,0.12)",
              }}
              aria-label={`${name} location`}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          </Marker>
        </Map>

        {/* ── ETA chip + mode toggle ── */}
        {route && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
            {/* ETA pill */}
            <div className="flex items-center gap-2 rounded-full bg-background/92 px-4 py-2 shadow-lg backdrop-blur-md ring-1 ring-black/[0.06]">
              <span className="text-sm font-semibold tabular-nums">
                {fmt_duration(route.duration)}
              </span>
              <span className="h-3.5 w-px shrink-0 bg-border/60" />
              <span className="text-sm text-muted-foreground">
                {fmt_distance(route.distance)}
              </span>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-full bg-background/92 p-1 shadow-lg backdrop-blur-md ring-1 ring-black/[0.06]">
              <button
                onClick={() => setMode("walking")}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 ${
                  mode === "walking"
                    ? "bg-cta text-cta-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Walking"
                aria-pressed={mode === "walking"}
              >
                <IconWalk size={15} />
              </button>
              <button
                onClick={() => setMode("driving")}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 ${
                  mode === "driving"
                    ? "bg-cta text-cta-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Driving"
                aria-pressed={mode === "driving"}
              >
                <IconCar size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Location loading */}
        {locState === "loading" && !route && (
          <div className="absolute bottom-3 left-3 z-10 rounded-full bg-background/92 px-3 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur-md">
            Finding location…
          </div>
        )}

        {/* Location denied */}
        {locState === "denied" && (
          <button
            onClick={requestLocation}
            className="absolute bottom-3 left-3 z-10 rounded-full bg-background/92 px-3 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur-md ring-1 ring-black/[0.06] transition-colors hover:text-foreground"
          >
            Enable location for ETA
          </button>
        )}
      </div>

      {/* ── Address + Get Directions ── */}
      <div className="mt-3 flex items-start justify-between gap-3 px-0.5">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <IconMapPin
            size={14}
            className="mt-0.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0">
            {address && (
              <p className="truncate text-sm">{address}</p>
            )}
            {city && (
              <p className="text-xs text-muted-foreground">{city}</p>
            )}
          </div>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-cta transition-opacity hover:opacity-75"
        >
          Get Directions
          <IconNavigation size={13} aria-hidden />
        </a>
      </div>
    </div>
  );
}
