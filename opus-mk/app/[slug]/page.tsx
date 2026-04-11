"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  IconArrowLeft,
  IconMapPin,
  IconPhone,
  IconBrandInstagram,
  IconWorld,
  IconClock,
  IconStarFilled,
  IconChevronRight,
} from "@tabler/icons-react";
import ChatWidget from "@/components/ChatWidget";

const BusinessMap = dynamic(() => import("@/components/BusinessMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[240px] sm:h-[288px] w-full rounded-2xl bg-muted animate-pulse" />
  ),
});

export default function BusinessProfilePage() {
  const params = useParams();
  const slug = params.slug as string;

  const profile = useQuery(api.public.getPublicProfile, { slug });

  const getImageUrl = (urlOrId?: string) => {
    if (!urlOrId) return undefined;
    if (urlOrId.startsWith("http")) return urlOrId;
    return `https://${process.env.NEXT_PUBLIC_CONVEX_URL?.split("//")[1]}/api/storage/${urlOrId}`;
  };

  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link href="/" className="p-1.5 rounded-lg hover:bg-secondary transition-colors" aria-label="Back to discover">
              <IconArrowLeft size={20} aria-hidden="true" />
            </Link>
            <Skeleton className="h-5 w-32" />
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <p className="text-lg font-semibold">Business not found</p>
        <p className="text-sm text-muted-foreground mt-1">This listing may have been removed.</p>
        <Link href="/">
          <Button variant="outline" className="mt-4 rounded-full">
            <IconArrowLeft size={16} className="mr-2" aria-hidden="true" />
            Back to discover
          </Button>
        </Link>
      </div>
    );
  }

  const servicesByCategory: Record<string, typeof profile.services> = {};
  profile.services.forEach((s) => {
    const cat = s.categoryName || "Services";
    if (!servicesByCategory[cat]) servicesByCategory[cat] = [];
    servicesByCategory[cat].push(s);
  });

  const coverPhoto = profile.media.find((m) => m.type === "cover");
  const gallery = profile.media.filter((m) => m.type === "gallery");

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg hover:bg-secondary transition-colors" aria-label="Back to discover">
            <IconArrowLeft size={20} aria-hidden="true" />
          </Link>
          <span className="text-sm font-medium truncate">{profile.name}</span>
        </div>
      </header>

      {/* ── Cover Photo ── */}
      {coverPhoto && (
        <div className="w-full h-48 sm:h-64 md:h-80 max-h-[40vh] relative bg-muted">
          <Image
            src={coverPhoto.url}
            alt={`${profile.name} cover`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        </div>
      )}

      {/* Adjust px-4 wrapper to overlap the cover if present */}
      <div className={`max-w-3xl mx-auto px-4 relative ${coverPhoto ? "-mt-16" : ""}`}>
        {/* ── Business Header ── */}
        <div className="flex items-start gap-4 pt-6 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden relative">
            {profile.logoUrl ? (
              <Image src={profile.logoUrl} alt={profile.name} fill className="object-cover" sizes="64px" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">{profile.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{profile.name}</h1>
            {profile.tagline && (
              <p className="text-sm text-muted-foreground mt-0.5">{profile.tagline}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {profile.averageRating > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <IconStarFilled size={13} className="text-rating" aria-hidden="true" />
                  <span className="font-semibold">{profile.averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({profile.reviewCount})</span>
                </div>
              )}
              {(profile.city || profile.neighborhood) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <IconMapPin size={13} aria-hidden="true" />
                  <span>{[profile.neighborhood, profile.city].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Contact pills ── */}
        <div className="flex items-center gap-2 pb-4 overflow-x-auto scrollbar-none">
          {profile.phone && (
            <a href={`tel:${profile.phone}`}>
              <Badge variant="secondary" className="rounded-full px-3 py-1.5 gap-1.5 cursor-pointer hover:bg-secondary/80">
                <IconPhone size={14} aria-hidden="true" />
                Call
              </Badge>
            </a>
          )}
          {profile.instagramHandle && (
            <a href={`https://instagram.com/${profile.instagramHandle}`} target="_blank" rel="noopener noreferrer">
              <Badge variant="secondary" className="rounded-full px-3 py-1.5 gap-1.5 cursor-pointer hover:bg-secondary/80">
                <IconBrandInstagram size={14} aria-hidden="true" />
                Instagram
              </Badge>
            </a>
          )}
          {profile.websiteUrl && (
            <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer">
              <Badge variant="secondary" className="rounded-full px-3 py-1.5 gap-1.5 cursor-pointer hover:bg-secondary/80">
                <IconWorld size={14} aria-hidden="true" />
                Website
              </Badge>
            </a>
          )}
        </div>

        {/* ── Gallery ── */}
        {gallery.length > 0 && (
          <div className="pb-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Gallery</h2>
            <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
              {gallery.map((media) => (
                <div key={media._id} className="w-48 h-48 sm:w-64 sm:h-64 shrink-0 rounded-2xl overflow-hidden snap-center bg-muted relative">
                  <Image
                    src={media.url}
                    alt={media.caption || "Gallery image"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 192px, 256px"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Bio ── */}
        {profile.bio && (
          <>
            <Separator className="my-2" />
            <div className="py-4">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">About</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
            </div>
          </>
        )}

        {/* ── Services ── */}
        <Separator className="my-3" />
        <div className="pt-5 pb-4">
          <h2 className="text-base font-semibold mb-5">Services</h2>
          <div className="space-y-6">
            {Object.entries(servicesByCategory).map(([category, services]) => (
              <div key={category}>
                {Object.keys(servicesByCategory).length > 1 && (
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {category}
                  </h3>
                )}
                <div className="space-y-2">
                    {services.map((service) => (
                      <Link
                        key={service._id}
                        href={`/${slug}/book?service=${service._id}`}
                        className="group block"
                      >
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/40 transition-[border-color,box-shadow,transform] duration-150 hover:border-border hover:shadow-sm active:scale-[0.98]">
                          <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                            {service.photoUrl && (
                              <div className="w-12 h-12 rounded-lg bg-secondary shrink-0 overflow-hidden relative">
                                <Image
                                  src={getImageUrl(service.photoUrl)!}
                                  alt={service.name}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{service.name}</p>
                              {service.consumerDescription && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {service.consumerDescription}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <IconClock size={12} aria-hidden="true" />
                                  {service.durationMins} min
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold">
                              {formatPrice(service.priceMinorUnits, service.currency)}
                            </span>
                            <IconChevronRight size={16} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" aria-hidden="true" />
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Location map ── */}
        {profile.coordinates && (
          <>
            <Separator className="my-2" />
            <div className="py-4">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Location</h2>
              <BusinessMap
                coordinates={profile.coordinates}
                address={profile.address}
                city={[profile.neighborhood, profile.city].filter(Boolean).join(", ")}
                name={profile.name}
              />
            </div>
          </>
        )}

      </div>

      {/* ── Sticky bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/40 p-4">
        <div className="max-w-3xl mx-auto">
          <Link href={`/${slug}/book`}>
            <Button className="w-full h-12 rounded-2xl text-base font-semibold bg-cta text-cta-foreground hover:bg-cta/90">
              Book Now
            </Button>
          </Link>
        </div>
      </div>

      {/* ── AI Chat Widget ── */}
      {profile.aiWebchatEnabled && (
        <ChatWidget
          orgId={profile._id}
          personaName={profile.aiPersonaName}
          greetingMessage={profile.aiGreetingMessage}
        />
      )}
    </div>
  );
}
