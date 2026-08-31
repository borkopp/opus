"use client";

import Image from "next/image";
import { Clock3, MapPin, Scissors } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { formatPrice } from "@/components/ui/price";

type Preview = FunctionReturnType<typeof api.activation.getPreview>;

export function ActivationPreview({
  preview,
}: {
  preview: Preview | undefined;
}) {
  if (!preview) {
    return (
      <div className="border-y border-border py-20 text-center">
        <Scissors className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-5 font-display text-lg font-semibold">
          Your website takes shape here
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Add your business details and this website preview will update in real
          time.
        </p>
      </div>
    );
  }

  const cover = preview.media.find((item) => item.type === "cover");
  const today = preview.openingHours?.find(
    (hours) => hours.dayOfWeek === (new Date().getDay() + 6) % 7,
  );

  return (
    <article className="w-full overflow-hidden border-y border-border">
      <div className="relative aspect-[16/9] bg-secondary">
        {cover ? (
          <Image
            src={cover.url}
            alt=""
            fill
            unoptimized
            className="object-cover"
            sizes="(min-width: 1024px) 420px, 100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklab,var(--accent)_28%,transparent),transparent_42%),linear-gradient(145deg,var(--primary),color-mix(in_oklab,var(--primary)_74%,var(--accent)))]" />
        )}
      </div>

      <div className="flex flex-col gap-5 py-7">
        <div className="flex items-start gap-4">
          <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
            {preview.logoUrl ? (
              <Image
                src={preview.logoUrl}
                alt={`${preview.name} logo`}
                fill
                unoptimized
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <Scissors className="text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-semibold">
              {preview.name}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {preview.tagline || "Your tagline will appear here."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin />
            {[preview.neighborhood, preview.city].filter(Boolean).join(", ") ||
              "Location pending"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 />
            {today
              ? today.isClosed
                ? "Closed today"
                : `${today.open}–${today.close}`
              : "Hours pending"}
          </span>
        </div>

        <div className="h-px bg-border" />

        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Services
          </p>
          {preview.services.length ? (
            preview.services.slice(0, 3).map((service) => (
              <div
                key={service._id}
                className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {service.durationMins} min
                  </p>
                </div>
                <p className="font-display text-sm font-semibold">
                  {formatPrice(service.priceMinorUnits, service.currency)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Your first service will appear here.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
