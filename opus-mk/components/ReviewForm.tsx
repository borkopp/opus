"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { IconStarFilled, IconStar } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────
// ReviewForm
// Reusable star-rating + textarea review submission.
// Used inside a Dialog on the My Bookings page.
// ─────────────────────────────────────────────────────

interface ReviewFormProps {
  bookingId: Id<"bookings">;
  businessName: string;
  serviceName: string;
  onSuccess: () => void;
}

export function ReviewForm({
  bookingId,
  businessName,
  serviceName,
  onSuccess,
}: ReviewFormProps) {
  const createReview = useMutation(api.reviews.create);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayRating = hoverRating || rating;

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a star rating.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createReview({
        bookingId,
        rating,
        body: body.trim() || undefined,
      });
      toast.success("Review submitted! Thank you for your feedback.");
      onSuccess();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to submit review.";
      toast.error(message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col items-center text-center">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold tracking-tight mb-1">
          How was your visit?
        </h3>
        <p className="text-sm text-muted-foreground">
          {serviceName} at{" "}
          <span className="font-medium text-foreground">{businessName}</span>
        </p>
      </div>

      {/* Star Rating */}
      <div
        className="flex items-center gap-1 mb-2"
        role="radiogroup"
        aria-label="Rating"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className="p-1 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            {star <= displayRating ? (
              <IconStarFilled
                size={32}
                className="text-rating drop-shadow-sm transition-colors duration-150"
                aria-hidden="true"
              />
            ) : (
              <IconStar
                size={32}
                className="text-border transition-colors duration-150"
                aria-hidden="true"
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Rating label */}
      <AnimatePresence mode="wait">
        {displayRating > 0 && (
          <motion.p
            key={displayRating}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="text-sm font-semibold text-foreground mb-4 h-5"
          >
            {ratingLabels[displayRating]}
          </motion.p>
        )}
      </AnimatePresence>
      {displayRating === 0 && (
        <p className="text-sm text-muted-foreground mb-4 h-5">
          Tap a star to rate
        </p>
      )}

      {/* Review body */}
      <div className="w-full">
        <textarea
          placeholder="Tell others about your experience (optional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          rows={3}
          className="w-full rounded-xl bg-secondary/30 border-transparent px-4 py-3 text-sm resize-none focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50 outline-none"
        />
        <div className="flex justify-end mt-1">
          <span className="text-xs text-muted-foreground/60">
            {body.length}/1000
          </span>
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0}
        className="w-full h-12 rounded-xl text-sm font-semibold bg-cta text-cta-foreground hover:bg-cta/90 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-cta/20 mt-4"
      >
        <div className="absolute inset-0 bg-primary-foreground/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
        <span className="relative flex items-center justify-center gap-2">
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Submitting…
            </>
          ) : (
            "Submit Review"
          )}
        </span>
      </Button>
    </div>
  );
}
