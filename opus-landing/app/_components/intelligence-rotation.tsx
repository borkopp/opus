/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  Heart,
  MessagesSquare,
  RotateCw,
  Sparkle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { AnalystPreview } from "./analyst-preview";
import { useFeatureRotation } from "./use-feature-rotation";

function FeatureDetails({ id }: { id: string }) {
  const { t } = useI18n();

  if (id === "receptionist") {
    return (
      <div className="channel-chips">
        {t.intelligence.receptionist.channels.map((channel) => (
          <span key={channel}>{channel}</span>
        ))}
      </div>
    );
  }
  if (id === "rebooking") {
    return (
      <div className="suggestion-chip">
        <span>
          <Heart aria-hidden="true" />
        </span>
        <span>{t.intelligence.rebooking.chip}</span>
      </div>
    );
  }
  if (id === "recovery") {
    return (
      <div className="recovery-flow">
        <span>{t.intelligence.recovery.flow[0]}</span>
        <b>
          <ArrowRight aria-hidden="true" />
        </b>
        <span>{t.intelligence.recovery.flow[1]}</span>
        <b>
          <ArrowRight aria-hidden="true" />
        </b>
        <span>{t.intelligence.recovery.flow[2]}</span>
      </div>
    );
  }
  return (
    <div className="suggestion-chip">
      <span>
        <Sparkles aria-hidden="true" />
      </span>
      <span>{t.intelligence.analyst.chip}</span>
    </div>
  );
}

export function IntelligenceRotation() {
  const { t } = useI18n();

  const features = useMemo(
    () => [
      {
        id: "analyst",
        name: t.intelligence.analyst.name,
        title: t.intelligence.analyst.title,
        description: t.intelligence.analyst.description,
        image: "/assets/opus-logo-3d.jpg",
        alt: "The OPUS symbol sculpted in ice-blue glass and pearl chrome",
        icon: Sparkles,
        note: t.intelligence.analyst.note,
      },
      {
        id: "receptionist",
        name: t.intelligence.receptionist.name,
        title: t.intelligence.receptionist.title,
        description: t.intelligence.receptionist.description,
        image: "/assets/ai-receptionist.png",
        alt: "Pearl and ice-blue glass speech bubbles representing ongoing conversations",
        icon: MessagesSquare,
        note: t.intelligence.receptionist.note,
      },
      {
        id: "rebooking",
        name: t.intelligence.rebooking.name,
        title: t.intelligence.rebooking.title,
        description: t.intelligence.rebooking.description,
        image: "/assets/ai-rebooking.png",
        alt: "A frosted client profile and service card beside an ice-blue glass sparkle",
        icon: Sparkle,
        note: t.intelligence.rebooking.note,
      },
      {
        id: "recovery",
        name: t.intelligence.recovery.name,
        title: t.intelligence.recovery.title,
        description: t.intelligence.recovery.description,
        image: "/assets/opening-recovery.png",
        alt: "A pearl calendar with an open slot, a floating blue appointment tile, and an email envelope",
        icon: RotateCw,
        note: t.intelligence.recovery.note,
      },
    ],
    [t],
  );

  const {
    rootRef,
    gridRef,
    progressRef,
    active,
    reducedMotion,
    showFeature,
    setHovered,
    setFocused,
  } = useFeatureRotation(features.length);
  const ordered = features.map(
    (_, offset) => (active + offset) % features.length,
  );

  return (
    <div
      ref={rootRef}
      className="intelligence-rotation"
      role="region"
      aria-label={t.intelligence.headingLine1}
    >
      <div
        ref={gridRef}
        className="intelligence-rotation-grid"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setFocused(false);
        }}
      >
        {ordered.map((index) => {
          const feature = features[index];
          const featured = index === active;
          const Icon = feature.icon;
          return (
            <article
              key={feature.id}
              className={cn(
                "rotating-feature",
                featured ? "intelligence-main" : "ai-card",
                feature.id === "recovery" && "recovery-card",
              )}
              data-feature={feature.id}
              data-featured={featured}
              aria-label={`${feature.name}${featured ? ", featured" : ""}`}
              tabIndex={featured ? -1 : undefined}
            >
              {featured && (
                <div
                  className={cn(
                    "intelligence-art",
                    feature.id !== "analyst" && "feature-illustration",
                  )}
                  data-feature-content
                >
                  <img
                    src={feature.image}
                    alt={feature.alt}
                    width={feature.id === "analyst" ? 1254 : 1536}
                    height={feature.id === "analyst" ? 1254 : 1024}
                    loading="lazy"
                    decoding="async"
                  />
                  {feature.id === "analyst" && (
                    <div className="intelligence-art-copy">
                      <h3
                        dangerouslySetInnerHTML={{
                          __html: t.intelligence.analyst.artCopy,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
              <div
                className={cn(
                  "feature-content",
                  featured && "feature-content-featured",
                )}
                data-feature-content
              >
                {featured && feature.id === "analyst" ? (
                  <AnalystPreview />
                ) : (
                  <div
                    className={cn(
                      "feature-summary-copy",
                      featured && "feature-expanded-copy",
                    )}
                  >
                    <span className="card-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <h3>
                      {feature.title[0]}
                      <br />
                      {feature.title[1]}
                    </h3>
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
                >
                  <span className="sr-only">Explore {feature.name}</span>
                </Button>
              )}
              {featured && !reducedMotion && (
                <div
                  className="intelligence-rotation-progress"
                  aria-hidden="true"
                >
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
