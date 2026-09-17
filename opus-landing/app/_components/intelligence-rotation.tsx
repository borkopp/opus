/* eslint-disable @next/next/no-img-element */
"use client";

import { ArrowRight, Heart, MessagesSquare, RotateCw, Sparkle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnalystPreview } from "./analyst-preview";
import { useFeatureRotation } from "./use-feature-rotation";

const features = [
  {
    id: "analyst",
    name: "Business analyst",
    title: ["Good questions.", "Clearer decisions."],
    description: "Ask questions about bookings, occupancy, cancellations, and business patterns. A fresh perspective on your studio.",
    image: "/assets/opus-logo-3d.jpg",
    alt: "The OPUS symbol sculpted in ice-blue glass and pearl chrome",
    icon: Sparkles,
    note: "200 answers per month, up to 20 detailed.",
  },
  {
    id: "receptionist",
    name: "AI receptionist",
    title: ["Always there.", "Even when you’re busy."],
    description: "Your 24/7 AI receptionist keeps conversations moving on web chat, Instagram, and WhatsApp.",
    image: "/assets/ai-receptionist.png",
    alt: "Pearl and ice-blue glass speech bubbles representing ongoing conversations",
    icon: MessagesSquare,
    note: "500 replies included per month.",
  },
  {
    id: "rebooking",
    name: "Personalized rebooking",
    title: ["The next visit.", "A little more personal."],
    description: "AI uses previous visits to suggest thoughtful rebookings and relevant service upgrades for each client.",
    image: "/assets/ai-rebooking.png",
    alt: "A frosted client profile and service card beside an ice-blue glass sparkle",
    icon: Sparkle,
    note: "Suggestions to help you decide what fits.",
  },
  {
    id: "recovery",
    name: "Opening recovery",
    title: ["An open slot.", "A new opportunity."],
    description: "Find suitable clients for an opening, review the suggestion, and approve each email offer yourself.",
    image: "/assets/opening-recovery.png",
    alt: "A pearl calendar with an open slot, a floating blue appointment tile, and an email envelope",
    icon: RotateCw,
    note: "No AI required. No automatic bookings.",
  },
];

function FeatureDetails({ id }: { id: string }) {
  if (id === "receptionist") return (
    <div className="channel-chips"><span>Web chat</span><span>Instagram</span><span>WhatsApp</span></div>
  );
  if (id === "rebooking") return (
    <div className="suggestion-chip"><span><Heart aria-hidden="true" /></span><span>Personalized to their visit history</span></div>
  );
  if (id === "recovery") return (
    <div className="recovery-flow"><span>Find</span><b><ArrowRight aria-hidden="true" /></b><span>Review</span><b><ArrowRight aria-hidden="true" /></b><span>Approve</span></div>
  );
  return <div className="suggestion-chip"><span><Sparkles aria-hidden="true" /></span><span>Insights from your studio’s data</span></div>;
}

export function IntelligenceRotation() {
  const {
    rootRef, gridRef, progressRef, active, reducedMotion, showFeature,
    setHovered, setFocused,
  } = useFeatureRotation(features.length);
  const ordered = features.map((_, offset) => (active + offset) % features.length);

  return (
    <div ref={rootRef} className="intelligence-rotation" role="region" aria-label="Explore OPUS intelligence features">
      <div
        ref={gridRef}
        className="intelligence-rotation-grid"
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
      >
        {ordered.map((index) => {
          const feature = features[index];
          const featured = index === active;
          const Icon = feature.icon;
          return (
            <article
              key={feature.id}
              className={cn("rotating-feature", featured ? "intelligence-main" : "ai-card", feature.id === "recovery" && "recovery-card")}
              data-feature={feature.id}
              data-featured={featured}
              aria-label={`${feature.name}${featured ? ", featured" : ""}`}
              tabIndex={featured ? -1 : undefined}
            >
              {featured && (
                <div className={cn("intelligence-art", feature.id !== "analyst" && "feature-illustration")} data-feature-content>
                  <img
                    src={feature.image}
                    alt={feature.alt}
                    width={feature.id === "analyst" ? 1254 : 1536}
                    height={feature.id === "analyst" ? 1254 : 1024}
                    loading="lazy"
                    decoding="async"
                  />
                  {feature.id === "analyst" && (
                    <div className="intelligence-art-copy"><h3>A little clarity.<br />A world of possibility.</h3></div>
                  )}
                </div>
              )}
              <div className={cn("feature-content", featured && "feature-content-featured")} data-feature-content>
                {featured && feature.id === "analyst" ? <AnalystPreview /> : (
                  <div className={cn("feature-summary-copy", featured && "feature-expanded-copy")}>
                    <span className="card-icon"><Icon aria-hidden="true" /></span>
                    <h3>{feature.title[0]}<br />{feature.title[1]}</h3>
                    <p>{feature.description}</p>
                    <FeatureDetails id={feature.id} />
                    <small>{feature.note}</small>
                  </div>
                )}
              </div>
              {!featured && (
                <Button
                  type="button"
                  variant="link"
                  className="feature-select"
                  aria-label={`Feature ${feature.name}`}
                  onClick={(event) => {
                    setFocused(false);
                    showFeature(index, event.detail === 0);
                  }}
                ><span className="sr-only">Explore {feature.name}</span></Button>
              )}
              {featured && !reducedMotion && (
                <div className="intelligence-rotation-progress" aria-hidden="true">
                  <span ref={progressRef} />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
