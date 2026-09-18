"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoRotation } from "@/hooks/use-auto-rotation";
import { useI18n } from "@/lib/i18n/context";
import {
  BookingPreview,
  CalendarPreview,
  ClientPreview,
} from "./product-previews";

export function ProductTour() {
  const { t } = useI18n();
  const [instant, setInstant] = useState(false);

  const slides = useMemo(
    () => [
      {
        id: "website",
        label: t.productTour.tabs.website.label,
        title: t.productTour.tabs.website.title,
        description: t.productTour.tabs.website.description,
        preview: BookingPreview,
      },
      {
        id: "calendar",
        label: t.productTour.tabs.calendar.label,
        title: t.productTour.tabs.calendar.title,
        description: t.productTour.tabs.calendar.description,
        preview: CalendarPreview,
      },
      {
        id: "clients",
        label: t.productTour.tabs.clients.label,
        title: t.productTour.tabs.clients.title,
        description: t.productTour.tabs.clients.description,
        preview: ClientPreview,
      },
    ],
    [t],
  );

  const beforeChange = useCallback(
    (_index: number, keyboard: boolean) => setInstant(keyboard),
    [],
  );
  const {
    rootRef,
    progressRef,
    active,
    reducedMotion,
    showItem,
    setHovered,
    setFocused,
  } = useAutoRotation(slides.length, beforeChange);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const slide = slides[active];
  const Preview = slide.preview;

  return (
    <div
      ref={rootRef}
      className="product-tour"
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
      <div
        className="product-tour-tabs"
        role="tablist"
        aria-label={t.productTour.subheading}
      >
        {slides.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => {
              tabsRef.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`product-tab-${item.id}`}
            aria-controls="product-tour-panel"
            aria-selected={active === index}
            tabIndex={active === index ? 0 : -1}
            onClick={(event) => showItem(index, event.detail === 0)}
            onKeyDown={(event) => {
              let next: number | undefined;
              if (event.key === "ArrowRight")
                next = (index + 1) % slides.length;
              if (event.key === "ArrowLeft")
                next = (index + slides.length - 1) % slides.length;
              if (event.key === "Home") next = 0;
              if (event.key === "End") next = slides.length - 1;
              if (next === undefined) return;
              event.preventDefault();
              showItem(next, true);
              tabsRef.current[next]?.focus();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="product-tour-card"
        id="product-tour-panel"
        role="tabpanel"
        aria-labelledby={`product-tab-${slide.id}`}
      >
        <div
          key={slide.id}
          className="product-tour-scene"
          data-instant={instant}
        >
          <div className="product-tour-copy">
            <h3>{slide.title}</h3>
            <p>{slide.description}</p>
            <span className="product-tour-included">
              {t.productTour.includedInFree}
            </span>
          </div>
          <div className="product-tour-visual">
            <Preview />
          </div>
        </div>
        <div className="product-tour-action">
          <Button asChild variant="default">
            <a href="https://studio.opus.mk/signup">
              {t.productTour.cta}{" "}
              <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
            </a>
          </Button>
        </div>
        {!reducedMotion && (
          <div className="product-tour-progress" aria-hidden="true">
            <span ref={progressRef} />
          </div>
        )}
      </div>
    </div>
  );
}
