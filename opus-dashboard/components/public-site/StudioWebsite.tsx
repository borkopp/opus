import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Instagram,
  MapPin,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import { StudioLocationMap } from "./StudioLocationMap";
import type { PublicSite } from "./types";

const DAYS = [
  "Понеделник",
  "Вторник",
  "Среда",
  "Четврток",
  "Петок",
  "Сабота",
  "Недела",
];

const CATEGORY_LABELS: Record<string, string> = {
  barbershop: "Берберница",
  hair_salon: "Фризерски салон",
  nail_salon: "Салон за нокти",
  spa: "Спа центар",
  beauty_salon: "Салон за убавина",
  lash_studio: "Студио за трепки",
  brow_bar: "Студио за веѓи",
  tattoo_studio: "Тату студио",
  massage_therapy: "Салон за масажа",
  wellness_center: "Велнес центар",
  personal_trainer: "Персонален тренер",
};

export function StudioWebsite({ site }: { site: PublicSite }) {
  const cover =
    site.media.find((item) => item.type === "cover") ??
    site.media.find((item) => item.type === "gallery");
  const gallery = site.media
    .filter((item) => item.type === "gallery" && item.url !== cover?.url)
    .slice(0, 3);
  const location = [site.address, site.neighborhood, site.city]
    .filter(Boolean)
    .join(", ");
  const instagramHandle = site.instagramHandle?.replace(/^@/, "");
  const categoryName =
    CATEGORY_LABELS[site.beautyCategory ?? ""] || "Студио за убавина";
  const googleMapsUrl = site.coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${site.coordinates.lat},${site.coordinates.lng}`
    : location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${site.name}, ${location}`,
        )}`
      : null;

  const todayDayOfWeek = (new Date().getDay() + 6) % 7;
  const todayHours = site.openingHours?.find(
    (item) => item.dayOfWeek === todayDayOfWeek,
  );

  return (
    <main>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-10 pb-12 sm:px-6 sm:pt-14 sm:pb-16 lg:gap-10 lg:pt-16 lg:pb-20">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end lg:gap-12">
          <div className="flex max-w-3xl flex-col items-start gap-4 sm:gap-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="font-medium tracking-wide">
                {categoryName}
                {site.city ? ` · ${site.city}` : ""}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="text-balance font-display text-4xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                {site.name}
              </h1>
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-8">
                {site.tagline ||
                  "Изберете услуга и слободен термин што ви одговара."}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 sm:w-auto sm:min-w-60 lg:items-end">
            <Button asChild size="lg" className="w-full sm:w-auto shadow-s">
              <Link href="/book">
                Резервирај термин
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>

            {(location || site.phone || instagramHandle) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground lg:justify-end">
                {location &&
                  (googleMapsUrl ? (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MapPin className="size-3.5" aria-hidden="true" />
                      <span className="line-clamp-1 max-w-[200px]">{location}</span>
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      <span className="line-clamp-1 max-w-[200px]">{location}</span>
                    </span>
                  ))}
                {site.phone && (
                  <a
                    href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Phone className="size-3.5" aria-hidden="true" />
                    <span>{site.phone}</span>
                  </a>
                )}
                {instagramHandle && (
                  <a
                    href={`https://instagram.com/${encodeURIComponent(instagramHandle)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Instagram className="size-3.5" aria-hidden="true" />
                    <span>@{instagramHandle}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {cover && (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border/70 bg-card shadow-m sm:aspect-[21/9] sm:rounded-3xl lg:aspect-[2.4/1]">
            <Image
              src={cover.url}
              alt={cover.caption || `${site.name} cover`}
              fill
              priority
              unoptimized
              className="object-cover"
              sizes="(min-width: 1280px) 1152px, (min-width: 1024px) 960px, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 sm:p-6 text-white">
              <div className="flex flex-wrap items-center gap-2">
                {todayHours && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        todayHours.isClosed ? "bg-red-400" : "bg-emerald-400",
                      )}
                    />
                    {todayHours.isClosed
                      ? "Затворено денес"
                      : `Денес ${todayHours.open}–${todayHours.close}`}
                  </span>
                )}
                {site.services.length > 0 && (
                  <span className="hidden items-center rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur-md sm:inline-flex">
                    {site.services.length}{" "}
                    {site.services.length === 1 ? "услуга" : "услуги"}
                  </span>
                )}
              </div>

              {location && (
                <div className="hidden items-center gap-1.5 text-xs text-white/90 drop-shadow-sm md:flex">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section id="services" className="bg-secondary/55">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 sm:py-16">
          <div className="flex max-w-2xl flex-col gap-2">
            <p className="micro-label text-muted-foreground">Услуги</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Изберете ја вашата услуга
            </h2>
            <p className="text-muted-foreground">
              Отворете ги слободните термини директно од менито.
            </p>
          </div>

          <div
            className={cn(
              "grid gap-4",
              site.services.length > 1 && "md:grid-cols-2",
              site.services.length === 1 && "max-w-3xl",
            )}
          >
            {site.services.map((service) => (
              <Link
                key={service._id}
                href={`/book?service=${service._id}`}
                className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
              >
                <Card className="h-full gap-0 overflow-hidden rounded-2xl py-0 transition-[transform,box-shadow,border-color] duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-m motion-reduce:transform-none">
                  <CardHeader className="flex flex-row items-center gap-4 p-5 pb-3">
                    {service.photoUrl && (
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                        <Image
                          src={service.photoUrl}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="64px"
                        />
                      </span>
                    )}
                    <div className="flex min-w-0 flex-col gap-1">
                      <CardTitle className="font-display text-lg">
                        {service.name}
                      </CardTitle>
                      {(service.consumerDescription ||
                        service.categoryName) && (
                        <CardDescription className="line-clamp-2 leading-6">
                          {service.consumerDescription || service.categoryName}
                        </CardDescription>
                      )}
                    </div>
                  </CardHeader>

                  <CardFooter className="justify-between gap-4 px-5 pb-5">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{service.durationMins} мин</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatPrice(
                          service.priceMinorUnits,
                          service.currency,
                          site.bookingSettings.locale,
                        )}
                      </span>
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {(site.bio || gallery.length > 0) && (
        <section
          id="about"
          className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[0.72fr_1.28fr]"
        >
          <div className="flex flex-col gap-4">
            <p className="micro-label text-muted-foreground">За студиото</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {site.name}
            </h2>
            {site.bio && (
              <p className="whitespace-pre-line leading-7 text-muted-foreground">
                {site.bio}
              </p>
            )}
          </div>

          {gallery.length > 0 && (
            <div className="grid min-h-72 grid-cols-2 gap-3">
              {gallery.map((item, index) => (
                <div
                  key={item._id}
                  className={cn(
                    "relative min-h-36 overflow-hidden rounded-xl bg-card",
                    index === 0 && "row-span-2",
                  )}
                >
                  <Image
                    src={item.url}
                    alt={item.caption || `${site.name} gallery`}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(min-width: 1024px) 35vw, 50vw"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section id="info" className="bg-secondary/55">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="flex max-w-2xl flex-col gap-2">
            <p className="micro-label text-muted-foreground">Информации</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Планирајте ја посетата
            </h2>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <Card className="gap-0 rounded-2xl">
              <CardHeader>
                <CardTitle className="font-display text-lg">
                  Работно време
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <dl className="flex flex-col gap-3">
                  {(site.openingHours ?? []).map((day) => (
                    <div
                      key={day.dayOfWeek}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <dt className="text-muted-foreground">
                        {DAYS[day.dayOfWeek]}
                      </dt>
                      <dd className="font-mono font-medium">
                        {day.isClosed
                          ? "Затворено"
                          : `${day.open}–${day.close}`}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card className="gap-0 rounded-2xl">
              <CardHeader>
                <CardTitle className="font-display text-lg">
                  Локација и контакт
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 pb-5">
                {site.coordinates && (
                  <StudioLocationMap
                    studioName={site.name}
                    coordinates={site.coordinates}
                  />
                )}

                <div className="flex flex-col gap-4 text-sm">
                  {location && (
                    <div className="flex items-start gap-3">
                      <MapPin
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col gap-1">
                        <span>{location}</span>
                        {googleMapsUrl && (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-fit items-center gap-1 rounded-md text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            Отвори насоки
                            <ArrowUpRight
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  {site.phone && (
                    <a
                      href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex w-fit items-center gap-3 rounded-md hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Phone
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      {site.phone}
                    </a>
                  )}
                  {instagramHandle && (
                    <a
                      href={`https://instagram.com/${encodeURIComponent(instagramHandle)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center gap-3 rounded-md hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Instagram
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      @{instagramHandle}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
