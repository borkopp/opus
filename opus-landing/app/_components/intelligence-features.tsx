/* eslint-disable @next/next/no-img-element */
"use client";

import { useI18n } from "@/lib/i18n/context";

export function IntelligenceFeatures() {
  const { t } = useI18n();
  const features = [
    { id: "analyst", copy: t.intelligence.analyst, image: "/assets/opus-logo-3d.jpg" },
    { id: "receptionist", copy: t.intelligence.receptionist, image: "/assets/ai-receptionist.png" },
    { id: "clients", copy: t.intelligence.rebooking, image: "/assets/ai-rebooking.png" },
    { id: "recovery", copy: t.intelligence.recovery, image: "/assets/opening-recovery.png" },
  ];

  return (
    <div className="intelligence-features">
      {features.map(({ id, copy, image }) => (
        <article
          className="intelligence-feature reveal"
          key={id}
          aria-labelledby={`intelligence-${id}-title`}
        >
          <h3 id={`intelligence-${id}-title`}>{copy.name}</h3>
          <img
            className="intelligence-feature-art"
            src={image}
            alt=""
            width={id === "analyst" ? 1254 : 1536}
            height={id === "analyst" ? 1254 : 1024}
            loading="lazy"
            decoding="async"
          />
          <p className="intelligence-feature-description">{copy.description}</p>
        </article>
      ))}
    </div>
  );
}
