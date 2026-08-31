"use client";

import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { HeaderAuth } from "@/components/HeaderAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReviewForm } from "@/components/ReviewForm";
import { formatPrice } from "@/lib/format";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconCalendarEvent,
  IconClock,
  IconUser,
  IconSparkles,
  IconStarFilled,
  IconCircleCheck,
} from "@tabler/icons-react";

type MarketplaceBooking = FunctionReturnType<
  typeof api.opusUsers.getMyBookings
>[number];

// ── Status badge styling ──
function statusConfig(status: string) {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmed",
        variant: "default" as const,
        className: "bg-success/10 text-success border-success/20",
      };
    case "completed":
      return {
        label: "Completed",
        variant: "default" as const,
        className: "bg-primary/10 text-primary border-primary/20",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        variant: "default" as const,
        className: "bg-destructive/10 text-destructive border-destructive/20",
      };
    case "no_show":
      return {
        label: "No Show",
        variant: "default" as const,
        className: "bg-destructive/10 text-destructive border-destructive/20",
      };
    case "checked_in":
      return {
        label: "Checked In",
        variant: "default" as const,
        className: "bg-success/10 text-success border-success/20",
      };
    default:
      return {
        label: status,
        variant: "default" as const,
        className: "bg-secondary text-muted-foreground",
      };
  }
}

export default function MyBookingsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in?callbackUrl=%2Fmy-bookings");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Back to discover"
            >
              <IconArrowLeft size={20} aria-hidden="true" />
            </Link>
            <span className="text-sm font-medium">My Bookings</span>
          </div>
          <HeaderAuth />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-28 md:pb-32">
        {isLoading || !isAuthenticated ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <BookingsList />
        )}
      </div>
    </div>
  );
}

function BookingsList() {
  const [referenceTime] = useState(Date.now);
  const bookings = useQuery(api.opusUsers.getMyBookings, {});

  if (bookings === undefined) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <IconCalendarEvent size={28} className="text-muted-foreground/40" />
        </div>
        <h2 className="text-lg font-semibold mb-1">No bookings yet</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          Discover amazing businesses on opus and book your first appointment.
        </p>
        <Link href="/">
          <Button className="rounded-xl bg-cta text-cta-foreground hover:bg-cta/90 font-semibold gap-2">
            <IconSparkles size={16} />
            Explore businesses
          </Button>
        </Link>
      </div>
    );
  }

  // Split into upcoming and past
  const upcoming = bookings.filter(
    (booking) =>
      booking.startAt > referenceTime &&
      booking.status !== "cancelled" &&
      booking.status !== "no_show",
  );
  const past = bookings.filter(
    (booking) =>
      booking.startAt <= referenceTime ||
      booking.status === "cancelled" ||
      booking.status === "no_show",
  );

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Upcoming
          </h2>
          <div className="space-y-3">
            {upcoming.map((booking) => (
              <BookingCard key={booking._id} booking={booking} isUpcoming />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Past
          </h2>
          <div className="space-y-3">
            {past.map((booking) => (
              <BookingCard key={booking._id} booking={booking} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  isUpcoming,
}: {
  booking: MarketplaceBooking;
  isUpcoming?: boolean;
}) {
  const status = statusConfig(booking.status);
  const startDate = new Date(booking.startAt);
  const timeStr = `${String(startDate.getUTCHours()).padStart(2, "0")}:${String(startDate.getUTCMinutes()).padStart(2, "0")}`;

  const isCompleted = booking.status === "completed";
  const canReview = isCompleted && !booking.hasReview;

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [justReviewed, setJustReviewed] = useState(false);

  return (
    <div className="group block">
      <div
        className={`flex gap-4 p-4 rounded-2xl border transition-all duration-200 ${
          isUpcoming
            ? "border-border/60 bg-card hover:border-primary/30 hover:shadow-sm"
            : "border-border/30 bg-card/60"
        }`}
      >
        {/* Business logo */}
        <Link href={`/${booking.orgSlug}`} className="shrink-0">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden relative">
            {booking.orgLogoUrl ? (
              <Image
                src={booking.orgLogoUrl}
                alt={booking.orgName}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">
                {booking.orgName.charAt(0)}
              </span>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/${booking.orgSlug}`} className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {booking.serviceName}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {booking.orgName}
              </p>
            </Link>
            <Badge
              variant={status.variant}
              className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.className}`}
            >
              {status.label}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <IconCalendarEvent size={12} aria-hidden="true" />
              {format(startDate, "EEE, MMM d")}
            </span>
            <span className="flex items-center gap-1">
              <IconClock size={12} aria-hidden="true" />
              {timeStr}
            </span>
            <span className="flex items-center gap-1">
              <IconUser size={12} aria-hidden="true" />
              {booking.staffName}
            </span>
          </div>

          {/* Review action row */}
          {isCompleted && (
            <div className="mt-3">
              {canReview && !justReviewed ? (
                <Dialog
                  open={reviewDialogOpen}
                  onOpenChange={setReviewDialogOpen}
                >
                  <DialogTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rating/10 text-rating border border-rating/20 hover:bg-rating/20 transition-colors">
                      <IconStarFilled size={12} aria-hidden="true" />
                      Leave a Review
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="sr-only">
                        Leave a Review
                      </DialogTitle>
                    </DialogHeader>
                    <ReviewForm
                      bookingId={booking._id as Id<"bookings">}
                      businessName={booking.orgName}
                      serviceName={booking.serviceName}
                      onSuccess={() => {
                        setReviewDialogOpen(false);
                        setJustReviewed(true);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              ) : booking.hasReview || justReviewed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                  <IconCircleCheck size={12} aria-hidden="true" />
                  Reviewed
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="text-sm font-semibold text-foreground shrink-0 self-center">
          {formatPrice(booking.priceMinorUnits, booking.currency)}
        </div>
      </div>
    </div>
  );
}
