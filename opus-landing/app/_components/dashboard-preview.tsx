"use client";

import { getImageProps } from "next/image";
import { useI18n } from "@/lib/i18n/context";

export function DashboardPreview() {
  const { t } = useI18n();
  const { props: desktop } = getImageProps({
    src: "/assets/desktop-dashboard.png",
    alt: t.dashboardPreview.imageAlt,
    width: 3600,
    height: 1898,
    sizes: "(max-width: 760px) calc(100vw - 40px), (max-width: 1050px) calc(100vw - 80px), (max-width: 1296px) calc(100vw - 96px), 1200px",
  });
  const { props: mobile } = getImageProps({
    src: "/assets/mobile-dashboard.png",
    alt: t.dashboardPreview.imageAlt,
    width: 1000,
    height: 1872,
    sizes: "(max-width: 480px) calc(100vw - 40px), 440px",
  });

  return (
    <section
      className="section dashboard-preview"
      id="dashboard-preview"
      aria-labelledby="dashboard-preview-title"
    >
      <div className="section-heading centered">
        <h2 id="dashboard-preview-title">{t.dashboardPreview.heading}</h2>
        <p>{t.dashboardPreview.description}</p>
      </div>
      <figure className="dashboard-preview-frame">
        <picture>
          <source
            media="(max-width: 760px)"
            srcSet={mobile.srcSet}
            sizes={mobile.sizes}
            width={mobile.width}
            height={mobile.height}
          />
          {/* Native picture selects one optimized image for the viewport. */}
          <img {...desktop} alt={t.dashboardPreview.imageAlt} />
        </picture>
      </figure>
    </section>
  );
}
