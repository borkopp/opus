"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, ImagePlus } from "lucide-react";
import { websiteLabels } from "@/lib/website-i18n";
import { translatedWebsiteText } from "../../../shared/website-design";
import type { WebsiteCanvasProps } from "./website-types";

export function WebsiteGallery({ site, design, locale }: WebsiteCanvasProps) {
  const labels = websiteLabels(locale);
  const photos = design.gallery.imageIds.length
    ? design.gallery.imageIds.flatMap((id) => {
        const item = site.media.find((m) => m._id === id);
        return item ? [item] : [];
      })
    : site.media.filter((item) => item.type === "gallery");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const index = photos.length ? active % photos.length : 0;
  const animated =
    design.gallery.variant === "slideshow" ||
    design.gallery.variant === "carousel";
  useEffect(() => {
    if (!animated || !design.gallery.autoplay || paused || photos.length < 2)
      return;
    const interval = setInterval(() => {
      if (
        document.hidden ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        root.current?.matches(":hover, :focus-within")
      )
        return;
      setActive((value) => (value + 1) % photos.length);
    }, design.gallery.interval * 1000);
    return () => clearInterval(interval);
  }, [
    animated,
    design.gallery.autoplay,
    design.gallery.interval,
    paused,
    photos.length,
  ]);
  useEffect(() => {
    if (design.gallery.variant !== "carousel" || !track.current) return;
    const child = track.current.children[index] as HTMLElement | undefined;
    if (child)
      track.current.scrollTo({
        left: child.offsetLeft - track.current.offsetLeft,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [index, design.gallery.variant]);
  useEffect(() => {
    const element = track.current;
    if (design.gallery.variant !== "carousel" || !element) return;
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const nearest = Array.from(element.children).reduce(
          (result, child, position) => {
            const distance = Math.abs(
              (child as HTMLElement).offsetLeft -
                element.offsetLeft -
                element.scrollLeft,
            );
            return distance < result.distance ? { position, distance } : result;
          },
          { position: 0, distance: Infinity },
        );
        setActive(nearest.position);
      }, 150);
    };
    element.addEventListener("scroll", update, { passive: true });
    return () => {
      clearTimeout(timer);
      element.removeEventListener("scroll", update);
    };
  }, [design.gallery.variant, photos.length]);
  if (!photos.length)
    return (
      <div className="opus-site-gallery-empty">
        <ImagePlus aria-hidden="true" />
        <p>{labels.galleryEmpty}</p>
      </div>
    );
  const photo = (item: (typeof photos)[number], priority = false) => (
    <Image
      src={item.url}
      alt={translatedWebsiteText(
        design,
        locale,
        `media.${item._id}.caption`,
        item.caption || `${site.name} · ${labels.photo}`,
      )}
      fill
      unoptimized
      priority={priority}
      className="opus-site-photo"
      sizes="(min-width: 900px) 40vw, 90vw"
    />
  );
  return (
    <div
      ref={root}
      className="opus-site-gallery"
      data-variant={design.gallery.variant}
      data-aspect={design.gallery.aspect}
    >
      {design.gallery.variant === "slideshow" ? (
        <div
          className="opus-site-slideshow"
          aria-roledescription="carousel"
          aria-label={labels.gallery}
        >
          {photos.map((item, position) => (
            <div
              key={item._id}
              className="opus-site-slide"
              data-active={position === index}
              aria-hidden={position !== index}
            >
              {photo(item)}
            </div>
          ))}
          <span
            className="opus-site-photo-count"
            aria-live={paused || !design.gallery.autoplay ? "polite" : "off"}
          >
            {index + 1} / {photos.length}
          </span>
        </div>
      ) : (
        <div ref={track} className="opus-site-gallery-track">
          {photos.map((item) => (
            <div key={item._id} className="opus-site-gallery-photo">
              {photo(item)}
            </div>
          ))}
        </div>
      )}
      {animated && photos.length > 1 && (
        <div className="opus-site-gallery-controls" data-gallery-control>
          <div className="opus-site-gallery-dots">
            {photos.map((item, position) => (
              <button
                key={item._id}
                type="button"
                onClick={() => setActive(position)}
                data-active={position === index}
                aria-label={`${labels.photo} ${position + 1}`}
                aria-pressed={position === index}
              />
            ))}
          </div>
          <div className="opus-site-gallery-arrows">
            {design.gallery.autoplay && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? labels.play : labels.pause}
              >
                {paused ? <Play /> : <Pause />}
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setActive(
                  (current) => (current - 1 + photos.length) % photos.length,
                )
              }
              aria-label={labels.previous}
            >
              <ArrowLeft />
            </button>
            <button
              type="button"
              onClick={() =>
                setActive((current) => (current + 1) % photos.length)
              }
              aria-label={labels.next}
            >
              <ArrowRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
