"use client";

import Image from "next/image";
import { Clock3, MapPin, Scissors, Star } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/components/ui/price";

type Preview = FunctionReturnType<typeof api.activation.getPreview>;

export function ActivationPreview({ preview }: { preview: Preview | undefined }) {
  if (!preview) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Scissors />
          </EmptyMedia>
          <EmptyTitle>Your listing takes shape here</EmptyTitle>
          <EmptyDescription>
            Add your business details and this preview will update from Convex in
            real time.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const cover = preview.media.find((item) => item.type === "cover");
  const today = preview.openingHours?.find(
    (hours) => hours.dayOfWeek === (new Date().getDay() + 6) % 7,
  );

  return (
    <article className="overflow-hidden rounded-3xl border bg-card shadow-l">
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
        <Badge className="absolute left-4 top-4" variant="secondary">
          Preview
        </Badge>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start gap-4">
          <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background">
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
          <div className="flex items-center gap-1 text-sm">
            <Star className="fill-accent text-accent" />
            <span className="font-medium">
              {preview.reviewCount ? preview.averageRating.toFixed(1) : "New"}
            </span>
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

        <Separator />

        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Services
          </p>
          {preview.services.length ? (
            preview.services.slice(0, 3).map((service) => (
              <div
                key={service._id}
                className="flex items-center justify-between gap-4 rounded-2xl bg-secondary/60 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {service.durationMins} min
                  </p>
                </div>
                <p className="font-outfit text-sm font-semibold">
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
