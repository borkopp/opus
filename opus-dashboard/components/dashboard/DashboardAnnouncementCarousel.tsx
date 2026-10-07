"use client";

import { useEffect, useRef, useState } from "react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { IOSAppBanner } from "@/components/dashboard/IOSAppBanner";
import { OPUSSitesBanner } from "@/components/dashboard/OPUSSitesBanner";
import { Button } from "@/components/ui/button";
import { useDismissibleBanner } from "@/hooks/use-dismissible-banner";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type Announcement = "website" | "ios";
const ROTATION_INTERVAL_MS = 7_000;

export function DashboardAnnouncementCarousel({
  orgId,
  canEditWebsite,
}: {
  orgId: string;
  canEditWebsite: boolean;
}) {
  const { t } = useDashboardI18n();
  const website = useDismissibleBanner(
    `opus-sites-announcement-dismissed-v1:${orgId}`,
  );
  const ios = useDismissibleBanner("opus-ios-coming-soon-dismissed-v1");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [selected, setSelected] = useState<Announcement>("website");
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const carouselRef = useRef<HTMLElement>(null);

  const showWebsite = canEditWebsite && !website.dismissed;
  const showIOS = !ios.dismissed;
  const hasMultiple = showWebsite && showIOS;
  const active: Announcement =
    (selected === "website" && showWebsite) || !showIOS ? "website" : "ios";
  const playing = hasMultiple && !reducedMotion;
  const slideClassName = cn(
    "col-start-1 row-start-1 min-w-0",
    playing && !focused
      ? "transition-opacity duration-200 ease-out motion-reduce:transition-none"
      : "transition-none",
  );

  useEffect(() => {
    if (!playing || hovered || focused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        setSelected(active === "website" ? "ios" : "website");
      }
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [active, focused, hovered, playing]);

  if (!showWebsite && !showIOS) return null;

  function dismissAnnouncement(announcement: Announcement) {
    if (announcement === "website") website.dismiss();
    else ios.dismiss();
    // Keep keyboard focus away from the next slide's dismiss button.
    window.requestAnimationFrame(() => {
      carouselRef.current?.focus({ preventScroll: true });
    });
  }

  const controls = hasMultiple ? (
    <div
      role="group"
      aria-label={t(
        "Announcement controls",
        "Контроли за најавите",
        "Kontrollet e njoftimeve",
      )}
      className="absolute right-3 bottom-3 z-20 flex items-center gap-0.5"
    >
      {(["website", "ios"] as const).map((announcement) => (
        <Button
          key={announcement}
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-11 @[480px]:size-8"
          aria-label={
            announcement === "website"
              ? t(
                  "Show Website Editor announcement",
                  "Прикажи ја најавата за уредникот за веб-страници",
                  "Shfaq njoftimin për redaktuesin e faqes",
                )
              : t(
                  "Show iPhone & iPad announcement",
                  "Прикажи ја најавата за iPhone и iPad",
                  "Shfaq njoftimin për iPhone dhe iPad",
                )
          }
          aria-pressed={active === announcement}
          onClick={() => setSelected(announcement)}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 rounded-full",
              active === announcement ? "bg-primary" : "bg-muted-foreground/40",
            )}
          />
        </Button>
      ))}
    </div>
  ) : null;

  return (
    <section
      ref={carouselRef}
      tabIndex={-1}
      aria-label={t(
        "Studio announcements",
        "Најави за студиото",
        "Njoftime për studion",
      )}
      aria-roledescription={
        hasMultiple ? t("carousel", "карусел", "karusel") : undefined
      }
      className="dashboard-setup-banner @container relative mb-4 min-w-0 shrink-0 overflow-hidden rounded-[25px] bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="grid" aria-live={playing ? "off" : "polite"}>
        {showWebsite && (
          <div
            aria-hidden={active !== "website"}
            inert={active !== "website"}
            className={cn(
              slideClassName,
              active === "website"
                ? "visible z-10 opacity-100"
                : "invisible pointer-events-none opacity-0",
            )}
          >
            <OPUSSitesBanner
              onDismiss={() => dismissAnnouncement("website")}
              withNavigation={hasMultiple}
            />
          </div>
        )}
        {showIOS && (
          <div
            aria-hidden={active !== "ios"}
            inert={active !== "ios"}
            className={cn(
              slideClassName,
              active === "ios"
                ? "visible z-10 opacity-100"
                : "invisible pointer-events-none opacity-0",
            )}
          >
            <IOSAppBanner
              onDismiss={() => dismissAnnouncement("ios")}
              withNavigation={hasMultiple}
            />
          </div>
        )}
      </div>
      {controls}
    </section>
  );
}
