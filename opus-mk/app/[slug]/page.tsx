"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewCard } from "@/components/ReviewCard";
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
import { HeaderAuth } from "@/components/HeaderAuth";
import { motion, type Variants } from "framer-motion";
import { HospitalitySection } from "./_components/HospitalitySection";

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
  const reviews = useQuery(
    api.reviews.listByOrg,
    profile ? { orgId: profile._id, limit: 20 } : "skip",
  );

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
            <Link
              href="/"
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Back to discover"
            >
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
        <p className="text-sm text-muted-foreground mt-1">
          This listing may have been removed.
        </p>
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
  profile.services.forEach((s: any) => {
    const cat = s.categoryName || "Services";
    if (!servicesByCategory[cat]) servicesByCategory[cat] = [];
    servicesByCategory[cat].push(s);
  });

  const coverPhoto = profile.media.find((m: any) => m.type === "cover");
  const gallery = profile.media.filter((m: any) => m.type === "gallery");

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 350, damping: 25 },
    },
  };

  return (
    <div
      className={`min-h-screen bg-background ${profile.industry === "hospitality" ? "pb-12" : "pb-44"}`}
    >
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Back to discover"
            >
              <IconArrowLeft size={20} aria-hidden="true" />
            </Link>
            <span className="text-sm font-medium truncate">{profile.name}</span>
          </div>
          <HeaderAuth />
        </div>
      </header>

      {/* ── Cover Photo ── */}
      {coverPhoto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="w-full h-48 sm:h-64 md:h-80 max-h-[40vh] relative bg-muted overflow-hidden"
        >
          <motion.div
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="w-full h-full relative"
          >
            <Image
              src={coverPhoto.url}
              alt={`${profile.name} cover`}
              fill
              className="object-cover origin-top"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent" />
          </motion.div>
        </motion.div>
      )}

      {/* Adjust px-4 wrapper to overlap the cover if present */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className={`max-w-3xl mx-auto px-4 relative ${coverPhoto ? "-mt-16" : ""}`}
      >
        {/* ── Business Header ── */}
        <motion.div
          variants={fadeInUp}
          className="flex items-start gap-4 pt-6 pb-4"
        >
          <motion.div
            initial={{ scale: 0.9, rotate: -3 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 14, delay: 0.2 }}
            className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden relative shadow-sm text-secondary-foreground"
          >
            {profile.logoUrl ? (
              <Image
                src={profile.logoUrl}
                alt={profile.name}
                fill
                className="object-cover transition-transform duration-500 hover:scale-110"
                sizes="64px"
              />
            ) : (
              <span className="text-2xl font-bold">
                {profile.name.charAt(0)}
              </span>
            )}
          </motion.div>
          <div className="flex-1 min-w-0 pt-1.5">
            <h1 className="text-xl font-bold tracking-tight">{profile.name}</h1>
            {profile.tagline && (
              <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                {profile.tagline}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2">
              {profile.averageRating > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <IconStarFilled
                    size={14}
                    className="text-rating drop-shadow-sm"
                    aria-hidden="true"
                  />
                  <span className="font-bold">
                    {profile.averageRating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground font-medium">
                    ({profile.reviewCount})
                  </span>
                </div>
              )}
              {(profile.city || profile.neighborhood) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <IconMapPin size={14} aria-hidden="true" />
                  <span>
                    {[profile.neighborhood, profile.city]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Contact pills ── */}
        <motion.div
          variants={fadeInUp}
          className="flex items-center gap-2.5 pb-4 overflow-x-auto scrollbar-none px-1 -mx-1"
        >
          {profile.phone && (
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={`tel:${profile.phone}`}
              className="shrink-0"
            >
              <Badge
                variant="secondary"
                className="rounded-full px-3.5 py-1.5 gap-1.5 hover:bg-secondary/80 transition-colors shadow-sm cursor-pointer"
              >
                <IconPhone size={14} aria-hidden="true" />
                <span className="font-semibold text-[13px]">Call</span>
              </Badge>
            </motion.a>
          )}
          {profile.instagramHandle && (
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={`https://instagram.com/${profile.instagramHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Badge
                variant="secondary"
                className="rounded-full px-3.5 py-1.5 gap-1.5 hover:bg-secondary/80 transition-colors shadow-sm cursor-pointer"
              >
                <IconBrandInstagram size={14} aria-hidden="true" />
                <span className="font-semibold text-[13px]">Instagram</span>
              </Badge>
            </motion.a>
          )}
          {profile.websiteUrl && (
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={profile.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Badge
                variant="secondary"
                className="rounded-full px-3.5 py-1.5 gap-1.5 hover:bg-secondary/80 transition-colors shadow-sm cursor-pointer"
              >
                <IconWorld size={14} aria-hidden="true" />
                <span className="font-semibold text-[13px]">Website</span>
              </Badge>
            </motion.a>
          )}
        </motion.div>

        {/* ── Gallery ── */}
        {gallery.length > 0 && (
          <motion.div variants={fadeInUp} className="pb-4 pt-2">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Gallery
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-4 snap-x px-1 -mx-1">
              {gallery.map((media: any) => (
                <motion.div
                  key={media._id}
                  whileHover={{ scale: 1.02 }}
                  className="w-48 h-48 sm:w-64 sm:h-64 shrink-0 rounded-[1.25rem] overflow-hidden snap-center bg-muted relative shadow-sm border border-border/20"
                >
                  <Image
                    src={media.url}
                    alt={media.caption || "Gallery image"}
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-110"
                    sizes="(max-width: 640px) 192px, 256px"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Bio ── */}
        {profile.bio && (
          <motion.div variants={fadeInUp}>
            <Separator className="my-2" />
            <div className="py-4">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                About
              </h2>
              <p className="text-[15px] text-foreground/90 leading-relaxed font-medium">
                {profile.bio}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Vertical-specific sections ── */}
        {profile.industry === "hospitality" ? (
          <HospitalitySection
            openingHours={profile.openingHours}
            menuText={profile.menuText}
            venueType={profile.venueType}
            cuisine={profile.cuisine}
            priceRange={profile.priceRange}
            tags={profile.tags}
          />
        ) : (
          /* ── Beauty: Services ── */
          <motion.div variants={fadeInUp}>
            <Separator className="my-3" />
            <div className="pt-4 pb-4">
              <h2 className="text-lg font-bold tracking-tight mb-5">
                Services
              </h2>
              <div className="space-y-8">
                {Object.entries(servicesByCategory).map(
                  ([category, services]) => (
                    <div key={category}>
                      {Object.keys(servicesByCategory).length > 1 && (
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-3 ml-1">
                          {category}
                        </h3>
                      )}
                      <div className="space-y-3">
                        {services.map((service: any) => (
                          <motion.div
                            key={service._id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Link
                              href={`/${slug}/book?service=${service._id}`}
                              className="group block"
                            >
                              <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 active:scale-[0.98]">
                                <div className="flex items-center gap-3.5 flex-1 min-w-0 mr-3">
                                  {service.photoUrl && (
                                    <div className="w-14 h-14 rounded-xl bg-secondary shrink-0 overflow-hidden relative shadow-sm">
                                      <Image
                                        src={getImageUrl(service.photoUrl)!}
                                        alt={service.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        sizes="56px"
                                      />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-[15px] font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                                      {service.name}
                                    </p>
                                    {service.consumerDescription && (
                                      <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-1 font-medium">
                                        {service.consumerDescription}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <span className="text-[12px] font-bold text-muted-foreground flex items-center gap-1.5">
                                        <IconClock
                                          size={14}
                                          className="text-muted-foreground/70"
                                          aria-hidden="true"
                                        />
                                        {service.durationMins} min
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[15px] font-black tracking-tight">
                                    {formatPrice(
                                      service.priceMinorUnits,
                                      service.currency,
                                    )}
                                  </span>
                                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 text-foreground">
                                    <IconChevronRight
                                      size={16}
                                      aria-hidden="true"
                                    />
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Reviews ── */}
        {reviews && reviews.length > 0 && (
          <motion.div variants={fadeInUp}>
            <Separator className="my-2" />
            <div className="py-4">
              {/* Summary header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold tracking-tight">Reviews</h2>
                <div className="flex items-center gap-2">
                  {profile.averageRating > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <IconStarFilled
                            key={star}
                            size={14}
                            className={
                              star <= Math.round(profile.averageRating)
                                ? "text-rating"
                                : "text-border/60"
                            }
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <span className="text-sm font-bold">
                        {profile.averageRating.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        ({profile.reviewCount})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review cards */}
              <div className="space-y-3">
                {reviews.map((review: any) => (
                  <ReviewCard
                    key={review._id}
                    reviewerName={review.reviewerName}
                    reviewerAvatarUrl={review.reviewerAvatarUrl}
                    rating={review.rating}
                    body={review.body}
                    createdAt={review.createdAt}
                    reply={review.reply}
                    repliedAt={review.repliedAt}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Location map ── */}
        {profile.coordinates && (
          <motion.div variants={fadeInUp}>
            <Separator className="my-2" />
            <div className="py-4">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Location
              </h2>
              <div className="rounded-3xl overflow-hidden shadow-sm border border-border/40">
                <BusinessMap
                  coordinates={profile.coordinates}
                  address={profile.address}
                  city={[profile.neighborhood, profile.city]
                    .filter(Boolean)
                    .join(", ")}
                  name={profile.name}
                />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ── Sticky bottom CTA ── */}
      {profile.industry !== "hospitality" && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", damping: 20, delay: 0.6 }}
          className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/40 pt-4 px-4 pb-24 md:pb-28 z-50"
        >
          <div className="max-w-3xl mx-auto">
            <Link href={`/${slug}/book`}>
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button className="w-full h-14 rounded-2xl text-[17px] font-bold tracking-wide bg-cta text-cta-foreground hover:bg-cta/90 shadow-lg shadow-cta/20 relative overflow-hidden group border border-black/10 dark:border-white/10">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Book Now
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      )}

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
