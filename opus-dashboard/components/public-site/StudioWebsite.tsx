import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Instagram,
  MapPin,
  Phone,
  Scissors,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";
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

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

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

  return (
    <main>
      <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:px-8 lg:py-20">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="secondary">
            <CalendarDays />
            Онлајн резервации
          </Badge>
          <div className="flex max-w-3xl flex-col gap-4">
            <h1 className="text-balance font-display text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
              {site.name}
            </h1>
            <p className="max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              {site.tagline ||
                "Изберете услуга и слободен термин што ви одговара."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/book">
                Резервирај термин
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            {site.phone && (
              <Button asChild variant="outline" size="lg">
                <a href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone data-icon="inline-start" />
                  Јави се
                </a>
              </Button>
            )}
          </div>

          {location && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 shrink-0" aria-hidden="true" />
              {location}
            </p>
          )}
        </div>

        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border bg-card shadow-lg sm:aspect-[5/4] lg:aspect-[4/5]">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.caption || `${site.name} studio`}
              fill
              priority
              unoptimized
              className="object-cover"
              sizes="(min-width: 1024px) 42vw, 100vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_25%_20%,var(--brand-soft),transparent_42%),linear-gradient(145deg,var(--card),var(--secondary))]">
              <Scissors
                className="size-16 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </section>

      <section
        id="services"
        className="border-y border-border bg-card/60 py-16 sm:py-20"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="micro-label text-muted-foreground">Услуги</p>
            <h2 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Изберете со што сакате да започнете
            </h2>
            <p className="text-muted-foreground">
              Секоја услуга води директно до слободните термини.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {site.services.map((service) => (
              <Card key={service._id} className="h-full">
                <CardHeader>
                  <CardTitle>{service.name}</CardTitle>
                  <CardDescription>
                    {service.categoryName || `${service.durationMins} минути`}
                  </CardDescription>
                  <CardAction className="font-mono text-sm font-medium">
                    {formatPrice(
                      service.priceMinorUnits,
                      service.currency,
                      site.bookingSettings.locale,
                    )}
                  </CardAction>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {service.consumerDescription ||
                      `Планирајте околу ${service.durationMins} минути за овој термин.`}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/book?service=${service._id}`}>
                      Види термини
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {(site.bio || gallery.length > 0) && (
        <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
          <div className="flex flex-col gap-4">
            <p className="micro-label text-muted-foreground">За студиото</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Грижа во секој детал
            </h2>
            {site.bio && (
              <p className="whitespace-pre-line text-base leading-7 text-muted-foreground">
                {site.bio}
              </p>
            )}
          </div>

          {gallery.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {gallery.map((item, index) => (
                <div
                  key={item._id}
                  className={cn(
                    "relative min-h-48 overflow-hidden rounded-2xl border border-border bg-card",
                    index === 0 && "row-span-2",
                  )}
                >
                  <Image
                    src={item.url}
                    alt={item.caption || `${site.name} gallery`}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(min-width: 1024px) 30vw, 50vw"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {site.staff.length > 0 && (
        <section className="border-y border-border py-16 sm:py-20">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
            <div className="flex max-w-2xl flex-col gap-3">
              <p className="micro-label text-muted-foreground">Тим</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Запознајте го тимот
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {site.staff.map((member) => (
                <Card key={member._id}>
                  <CardHeader className="grid-cols-[auto_1fr] items-center">
                    <Avatar size="lg">
                      {member.avatarUrl && (
                        <AvatarImage
                          src={member.avatarUrl}
                          alt={member.displayName}
                        />
                      )}
                      <AvatarFallback>
                        {initials(member.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col gap-1">
                      <CardTitle className="truncate">
                        {member.displayName}
                      </CardTitle>
                      {member.specialties.length > 0 && (
                        <CardDescription className="truncate">
                          {member.specialties.join(" · ")}
                        </CardDescription>
                      )}
                    </div>
                  </CardHeader>
                  {member.bio && (
                    <CardContent>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {member.bio}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 />
              Работно време
            </CardTitle>
            <CardDescription>
              Термините за резервација се прикажуваат според достапноста.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                    {day.isClosed ? "Затворено" : `${day.open}–${day.close}`}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin />
              Контакт и локација
            </CardTitle>
            <CardDescription>
              Резервирајте онлајн или контактирајте го студиото директно.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            {location && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 shrink-0 text-muted-foreground" />
                {location}
              </p>
            )}
            {site.phone && (
              <a
                href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
                className="flex w-fit items-center gap-2 rounded-md underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Phone className="text-muted-foreground" />
                {site.phone}
              </a>
            )}
            {instagramHandle && (
              <a
                href={`https://instagram.com/${encodeURIComponent(instagramHandle)}`}
                target="_blank"
                rel="noreferrer"
                className="flex w-fit items-center gap-2 rounded-md underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Instagram className="text-muted-foreground" />@
                {instagramHandle}
              </a>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/book">Резервирај термин</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
