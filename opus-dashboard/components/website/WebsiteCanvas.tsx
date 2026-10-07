"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Instagram,
  MapPin,
  Phone,
  CalendarDays,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { StudioLocationMap } from "@/components/public-site/StudioLocationMap";
import { initials } from "@/lib/dashboard-overview";
import { formatPrice } from "@/lib/format-price";
import { websiteColors, WEBSITE_FONTS } from "@/lib/website-presets";
import {
  websiteLabels,
  WEBSITE_CATEGORIES,
  WEBSITE_LANGUAGE_NAMES,
} from "@/lib/website-i18n";
import {
  translatedWebsiteText,
  type WebsiteContentKey,
  type WebsitePanel,
} from "../../../shared/website-design";
import { EditableText } from "./EditableText";
import { WebsiteSection } from "./WebsiteSection";
import { WebsiteGallery } from "./WebsiteGallery";
import type { WebsiteCanvasProps } from "./website-types";

export function WebsiteCanvas(props: WebsiteCanvasProps) {
  const { site, design, locale, editing, onLocaleChange } = props;
  const labels = websiteLabels(locale);
  const colors = websiteColors(design);
  const cover =
    site.media.find((m) => m._id === design.hero.imageId) ??
    site.media.find((m) => m.type === "cover") ??
    site.media.find((m) => m.type === "gallery");
  const location = [site.address, site.neighborhood, site.city]
    .filter(Boolean)
    .join(", ");
  const instagram = site.instagramHandle?.replace(/^@/, "");
  const mapUrl = site.coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${site.coordinates.lat},${site.coordinates.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.name}, ${location}`)}`;
  const category =
    WEBSITE_CATEGORIES[site.beautyCategory ?? ""]?.[
      { en: 0, mk: 1, sq: 2 }[locale]
    ] ?? labels.beauty;
  const visible = new Set(
    design.sections
      .filter((section) => section.visible)
      .map((section) => section.id),
  );
  const text = (key: WebsiteContentKey, fallback: string) =>
    translatedWebsiteText(
      design,
      locale,
      `content.${key}`,
      design.content[key] || fallback,
    );
  const editable = (key: WebsiteContentKey) =>
    editing && locale === design.primaryLanguage
      ? (value: string) => editing.content(key, value)
      : undefined;
  const block = (
    key: WebsiteContentKey,
    fallback: string,
    as: "h1" | "h2" | "p" | "span",
    className: string,
    multiline = false,
  ) => (
    <EditableText
      as={as}
      value={text(key, fallback)}
      onChange={editable(key)}
      className={className}
      multiline={multiline}
      label={labels.inlineEdit}
    />
  );
  const bookUrl = `/book?lang=${locale}`;
  const photo = cover ? (
    <Image
      src={cover.url}
      alt={translatedWebsiteText(
        design,
        locale,
        `media.${cover._id}.caption`,
        cover.caption || site.name,
      )}
      fill
      unoptimized
      priority
      className="opus-site-photo"
      style={{ objectPosition: design.hero.imagePosition }}
      sizes="(min-width: 900px) 60vw, 100vw"
    />
  ) : (
    <div className="opus-site-photo-placeholder" aria-hidden="true">
      <span>{initials(site.name)}</span>
    </div>
  );
  const wrap = (
    id: WebsitePanel,
    title: string,
    children: React.ReactNode,
    className?: string,
  ) => (
    <WebsiteSection
      key={id}
      id={id}
      label={`${labels.edit} · ${title}`}
      editing={editing}
      className={className}
    >
      {children}
    </WebsiteSection>
  );
  const heading = (
    label: string,
    key: WebsiteContentKey,
    fallback: string,
    descriptionKey?: WebsiteContentKey,
  ) => (
    <div className="opus-site-section-heading">
      <p className="opus-site-eyebrow">{label}</p>
      {block(key, fallback, "h2", "opus-site-heading")}
      {descriptionKey &&
        (design.content[descriptionKey] || editing) &&
        block(descriptionKey, "", "p", "opus-site-description", true)}
    </div>
  );
  const section = (id: WebsitePanel) => {
    if (id === "hero")
      return wrap(
        id,
        site.name,
        <div
          className="opus-site-container opus-site-hero"
          data-variant={design.hero.variant}
          data-align={design.hero.align}
          data-height={design.hero.height}
        >
          {design.hero.variant !== "minimal" && (
            <div className="opus-site-hero-image">
              {photo}
              {["background", "poster"].includes(design.hero.variant) && (
                <div
                  className="opus-site-hero-shade"
                  style={{
                    background: `rgba(0,0,0,${design.hero.overlay / 100})`,
                  }}
                />
              )}
            </div>
          )}
          <div className="opus-site-hero-copy">
            {(design.hero.showCategory || design.content.heroEyebrow) &&
              block(
                "heroEyebrow",
                `${category}${site.city ? ` · ${site.city}` : ""}`,
                "p",
                "opus-site-eyebrow",
              )}
            {block("heroTitle", site.name, "h1", "opus-site-title")}
            {(site.tagline || design.content.heroDescription || editing) &&
              block(
                "heroDescription",
                site.tagline || "",
                "p",
                "opus-site-description",
                true,
              )}
            <div className="opus-site-hero-actions">
              <a href={bookUrl} className="opus-site-button">
                {block("heroButton", labels.book, "span", "")}
                <ArrowUpRight aria-hidden="true" />
              </a>
              <a href="#services" className="opus-site-text-link">
                {labels.viewServices}
                <ArrowRight aria-hidden="true" />
              </a>
            </div>
            {location && (
              <p className="opus-site-hero-location">
                <MapPin aria-hidden="true" />
                {location}
              </p>
            )}
          </div>
        </div>,
        "opus-site-hero-section",
      );
    if (id === "services")
      return wrap(
        id,
        labels.services,
        <div className="opus-site-container">
          {heading(
            labels.services,
            "servicesTitle",
            labels.chooseService,
            "servicesDescription",
          )}
          <div
            className="opus-site-services"
            data-variant={design.services.variant}
            data-columns={design.services.columns}
          >
            {site.services.map((service, index) => {
              const copy = design.serviceCopy.find(
                (item) => item.serviceId === service._id,
              );
              const name = translatedWebsiteText(
                design,
                locale,
                `service.${service._id}.name`,
                copy?.name || service.name,
              );
              const description = translatedWebsiteText(
                design,
                locale,
                `service.${service._id}.description`,
                copy?.description || service.consumerDescription || "",
              );
              return (
                <a
                  key={service._id}
                  href={`${bookUrl}&service=${encodeURIComponent(service._id)}`}
                  className="opus-site-service"
                >
                  {design.services.variant === "editorial" && (
                    <span className="opus-site-service-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                  {design.services.showPhotos && service.photoUrl && (
                    <div className="opus-site-service-photo">
                      <Image
                        src={service.photoUrl}
                        alt=""
                        fill
                        unoptimized
                        className="opus-site-photo"
                        sizes="(min-width: 900px) 30vw, 90vw"
                      />
                    </div>
                  )}
                  <div className="opus-site-service-copy">
                    <h3>{name}</h3>
                    {design.services.showDescriptions && description && (
                      <p>{description}</p>
                    )}
                    <div className="opus-site-service-meta">
                      <span>
                        {service.durationMins} {labels.minutes}
                      </span>
                      <strong>
                        {formatPrice(
                          service.priceMinorUnits,
                          service.currency,
                          locale === "mk"
                            ? "mk-MK"
                            : locale === "sq"
                              ? "sq-AL"
                              : "en-GB",
                        )}
                      </strong>
                    </div>
                  </div>
                  <ArrowUpRight
                    className="opus-site-service-arrow"
                    aria-hidden="true"
                  />
                </a>
              );
            })}
          </div>
          {!site.services.length && (
            <p className="opus-site-description">{labels.emptyServices}</p>
          )}
        </div>,
      );
    if (id === "about") {
      if (!site.bio && !design.content.aboutBody && !editing) return null;
      return wrap(
        id,
        labels.about,
        <div
          className="opus-site-container opus-site-about"
          data-variant={design.about.variant}
        >
          <div>
            {heading(labels.about, "aboutTitle", labels.aboutTitle)}
            {block(
              "aboutBody",
              site.bio || "",
              "p",
              "opus-site-about-body",
              true,
            )}
          </div>
          {design.about.variant === "split" && (
            <div className="opus-site-about-art" aria-hidden="true">
              <span>{initials(site.name)}</span>
              <span className="opus-site-about-word">{site.name}</span>
            </div>
          )}
        </div>,
      );
    }
    if (id === "gallery") {
      if (!site.media.some((m) => m.type === "gallery") && !editing)
        return null;
      return wrap(
        id,
        labels.gallery,
        <div className="opus-site-container">
          {heading(
            labels.gallery,
            "galleryTitle",
            labels.galleryTitle,
            "galleryDescription",
          )}
          <WebsiteGallery {...props} />
        </div>,
      );
    }
    if (id === "team") {
      if (!site.staff.length) return null;
      return wrap(
        id,
        labels.team,
        <div className="opus-site-container">
          {heading(labels.team, "teamTitle", labels.teamTitle)}
          <div className="opus-site-team" data-variant={design.team.variant}>
            {site.staff.map((member) => (
              <article key={member._id} className="opus-site-team-member">
                <div className="opus-site-team-photo">
                  {member.avatarUrl ? (
                    <Image
                      src={member.avatarUrl}
                      alt={member.displayName}
                      fill
                      unoptimized
                      className="opus-site-photo"
                      sizes="200px"
                    />
                  ) : (
                    <span aria-hidden="true">
                      {initials(member.displayName)}
                    </span>
                  )}
                </div>
                <div>
                  <h3>{member.displayName}</h3>
                  {member.specialties.length > 0 && (
                    <p>
                      {translatedWebsiteText(
                        design,
                        locale,
                        `staff.${member._id}.specialties`,
                        member.specialties.join(" · "),
                      )}
                    </p>
                  )}
                  {member.bio && (
                    <p>
                      {translatedWebsiteText(
                        design,
                        locale,
                        `staff.${member._id}.bio`,
                        member.bio,
                      )}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>,
      );
    }
    if (id === "info")
      return wrap(
        id,
        labels.info,
        <div className="opus-site-container">
          {heading(labels.info, "infoTitle", labels.infoTitle)}
          <div className="opus-site-info" data-variant={design.info.variant}>
            <div className="opus-site-contact">
              <h3>{labels.contact}</h3>
              {location && (
                <p>
                  <MapPin aria-hidden="true" />
                  {location}
                </p>
              )}
              {site.phone && (
                <a
                  href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
                  aria-label={`${labels.phone} ${site.phone}`}
                >
                  <Phone aria-hidden="true" />
                  {site.phone}
                </a>
              )}
              {instagram && (
                <a
                  href={`https://instagram.com/${encodeURIComponent(instagram)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Instagram aria-hidden="true" />@{instagram}
                </a>
              )}
              {location && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="opus-site-text-link"
                >
                  {labels.directions}
                  <ArrowUpRight aria-hidden="true" />
                </a>
              )}
              {design.info.showMap && site.coordinates && (
                <StudioLocationMap
                  studioName={site.name}
                  coordinates={site.coordinates}
                  locale={locale}
                />
              )}
            </div>
            {design.info.showHours && (
              <div className="opus-site-hours">
                <h3>{labels.hours}</h3>
                <dl>
                  {site.openingHours?.map((day) => (
                    <div key={day.dayOfWeek}>
                      <dt>{labels.days[day.dayOfWeek]}</dt>
                      <dd>
                        {day.isClosed
                          ? labels.closed
                          : `${day.open} — ${day.close}`}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>,
      );
    return null;
  };
  return (
    <div
      className="opus-site"
      lang={locale}
      data-font={design.font}
      data-spacing={design.spacing}
      data-width={design.width}
      data-radius={design.radius}
      style={
        {
          "--site-bg": colors.background,
          "--site-surface": colors.surface,
          "--site-text": colors.text,
          "--site-accent": colors.accent,
          "--site-on-accent": colors.onAccent,
          "--site-font": WEBSITE_FONTS[design.font],
          "--site-radius":
            design.radius === "none"
              ? "0px"
              : design.radius === "round"
                ? "28px"
                : "12px",
        } as React.CSSProperties
      }
    >
      {wrap(
        "header",
        labels.navigation,
        <header
          className="opus-site-header"
          data-variant={design.header.variant}
        >
          <Link href="/" className="opus-site-brand">
            {design.header.showLogo &&
              (site.logoUrl ? (
                <span className="opus-site-logo">
                  <Image
                    src={site.logoUrl}
                    alt=""
                    fill
                    unoptimized
                    className="opus-site-photo"
                    sizes="36px"
                  />
                </span>
              ) : (
                <span className="opus-site-initials" aria-hidden="true">
                  {initials(site.name)}
                </span>
              ))}
            <span>{site.name}</span>
          </Link>
          <nav className="opus-site-navigation" aria-label={labels.navigation}>
            <a href="#services">{labels.services}</a>
            {visible.has("about") && (site.bio || design.content.aboutBody) && (
              <a href="#about">{labels.about}</a>
            )}
            {visible.has("gallery") &&
              site.media.some((m) => m.type === "gallery") && (
                <a href="#gallery">{labels.gallery}</a>
              )}
            <a href="#info">{labels.info}</a>
          </nav>
          <div className="opus-site-header-actions">
            {design.languages.length > 1 && (
              <select
                data-site-language
                aria-label={labels.language}
                value={locale}
                onChange={(event) =>
                  onLocaleChange?.(event.target.value as typeof locale)
                }
              >
                {design.languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {WEBSITE_LANGUAGE_NAMES[lang]}
                  </option>
                ))}
              </select>
            )}
            <a
              className="opus-site-button opus-site-header-book"
              href={bookUrl}
            >
              {labels.book}
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </header>,
        design.header.sticky ? "opus-site-sticky" : undefined,
      )}
      <main>
        {design.sections.filter((s) => s.visible).map((s) => section(s.id))}
      </main>
      {wrap(
        "footer",
        "OPUS",
        <footer
          className="opus-site-footer opus-site-container"
          data-variant={design.footer.variant}
        >
          {design.footer.variant === "statement" &&
            block("footerText", site.name, "p", "opus-site-footer-statement")}
          <div>
            <p>
              © {new Date().getFullYear()} {site.name}
            </p>
            <a href="https://opus.mk" className="opus-site-powered">
              {labels.powered}
              <Logo className="text-xs" markClassName="h-3.5" />
              <ArrowUpRight aria-hidden="true" />
            </a>
            {design.footer.showSocial && instagram && (
              <a
                href={`https://instagram.com/${encodeURIComponent(instagram)}`}
                target="_blank"
                rel="noreferrer"
                aria-label={labels.instagram}
              >
                <Instagram aria-hidden="true" />
              </a>
            )}
          </div>
        </footer>,
      )}
      <div className="opus-site-mobile-book">
        <a href={bookUrl} className="opus-site-button">
          <CalendarDays aria-hidden="true" />
          {labels.book}
          <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
