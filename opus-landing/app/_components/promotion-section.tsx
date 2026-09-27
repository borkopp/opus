"use client";

import Image from "next/image";
import { ArrowUpRight, Check, ImagePlus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";

export function PromotionSection() {
  const { t, locale } = useI18n();
  const copy = t.promotion;

  return (
    <section
      className="section promotion-section"
      id="promote"
      aria-labelledby="promotion-title"
    >
      <div className="split-heading reveal">
        <h2 id="promotion-title">{copy.heading}</h2>
        <p>{copy.description}</p>
      </div>

      <div className="promotion-grid">
        <article className="bento-panel promotion-card promotion-qr reveal">
          <div className="bento-copy">
            <span className="promotion-format">
              <QrCode aria-hidden="true" /> {copy.qr.label}
            </span>
            <h3>{copy.qr.title}</h3>
            <p>{copy.qr.description}</p>
          </div>
          <figure className="promotion-visual">
            <div className="promotion-artwork promotion-poster">
              <Image
                src={`/assets/promotion-qr-${locale}.svg`}
                alt={copy.qr.imageAlt}
                width={1748}
                height={2480}
              />
            </div>
            <figcaption>{copy.qr.caption}</figcaption>
          </figure>
        </article>

        <article className="bento-panel promotion-card promotion-story reveal">
          <div className="bento-copy">
            <span className="promotion-format">
              <ImagePlus aria-hidden="true" /> {copy.story.label}
            </span>
            <h3>{copy.story.title}</h3>
            <p>{copy.story.description}</p>
          </div>
          <figure className="promotion-visual">
            <div className="promotion-artwork promotion-story-artwork">
              <Image
                src={`/assets/promotion-story-${locale}.svg`}
                alt={copy.story.imageAlt}
                width={1080}
                height={1920}
              />
            </div>
            <figcaption>{copy.story.caption}</figcaption>
          </figure>
        </article>
      </div>

      <div className="promotion-footer">
        <div className="promotion-details">
          <p className="promotion-included">
            <Check aria-hidden="true" /> {copy.included}
          </p>
          <p>{copy.customization}</p>
        </div>
        <Button asChild size="hero">
          <a href="https://studio.opus.mk/signup">
            {copy.cta}
            <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
          </a>
        </Button>
      </div>
    </section>
  );
}
