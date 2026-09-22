"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Infinity,
  MonitorSmartphone,
  Plus,
  Sparkle,
  Sparkles,
} from "lucide-react";
import { CustomSoftwarePlan } from "./custom-software-plan";
import { HeroShowcase } from "./hero-showcase";
import { ProductTour } from "./product-tour";
import { IntelligenceRotation } from "./intelligence-rotation";
import { CloudShader } from "@/components/landing/cloud-shader";
import { LandingInteractions } from "@/components/landing/landing-interactions";
import { useI18n } from "@/lib/i18n/context";

const carouselImages = [
  {
    src: "/assets/studio-hair.jpg",
    alt: "Silver salon scissors, a blue glass comb, and flowing hair in a sculptural beauty still life",
  },
  {
    src: "/assets/studio-barber.jpg",
    alt: "A premium chrome barber chair in a quiet ice-blue studio",
  },
  {
    src: "/assets/studio-nails.jpg",
    alt: "Sculptural nail polish bottles and a hand with a pearl manicure",
  },
  {
    src: "/assets/studio-makeup.jpg",
    alt: "Silver makeup brushes and a pearl compact on a frosted blue plinth",
  },
  {
    src: "/assets/studio-massage.jpg",
    alt: "Pearl towels, dark spa stones, and a translucent blue vessel",
  },
];

const offsets = [0, 1, 2, -2, -1];

export function HomeContent() {
  const { t } = useI18n();

  return (
    <>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-background" aria-hidden="true">
            <CloudShader />
          </div>
          <div className="hero-copy">
            <h1 id="hero-title">
              {t.hero.titleLine1}
              <br />
              <span>{t.hero.titleLine2}</span>
            </h1>
            <p>
              {t.hero.descriptionLine1}
              <br className="desktop-break" /> {t.hero.descriptionLine2}
            </p>
            <div className="hero-actions">
              <a className="button button-dark" href="https://studio.opus.mk/">
                {t.hero.createWebsite}{" "}
                <span>
                  <ArrowUpRight aria-hidden="true" />
                </span>
              </a>
              <a className="button button-light" href="#product">
                {t.hero.learnMore}
              </a>
            </div>
            <div className="microcopy">
              <span>
                <Check aria-hidden="true" /> {t.hero.badgeFree}
              </span>
              <span>
                <Check aria-hidden="true" /> {t.hero.badgeNoCard}
              </span>
              <span>
                <Check aria-hidden="true" /> {t.hero.badgeForStudio}
              </span>
            </div>
          </div>
          <HeroShowcase />
          <div className="audience-strip">
            <div>
              {t.hero.audiences.map((audience, i) => (
                <span key={audience} style={{ display: "contents" }}>
                  {i > 0 && (
                    <i>
                      <Sparkle aria-hidden="true" />
                    </i>
                  )}
                  <span>{audience}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="section product-section" id="product">
          <div className="section-heading centered reveal">
            <h2>
              {t.productTour.headingLine1}
              <br />
              {t.productTour.headingLine2}
            </h2>
            <p>{t.productTour.subheading}</p>
          </div>
          <ProductTour />
        </section>

        <section className="section features-section" id="features">
          <div className="split-heading reveal">
            <div>
              <h2>
                {t.featuresBento.headingLine1}
                <br />
                {t.featuresBento.headingLine2}
              </h2>
            </div>
            <p>{t.featuresBento.subheading}</p>
          </div>
          <div className="bento-grid">
            <article className="bento-panel bento-booking reveal">
              <picture className="bento-art">
                <source
                  media="(max-width: 760px)"
                  srcSet="/assets/bento-booking-mobile.png"
                  width="1254"
                  height="1254"
                />
                <img
                  src="/assets/bento-booking.jpg"
                  alt="A beauty studio booking website preview"
                  width="1024"
                  height="1536"
                  loading="lazy"
                />
              </picture>
              <div className="bento-copy">
                <h3>
                  {t.featuresBento.bookingTitle1}
                  <br />
                  {t.featuresBento.bookingTitle2}
                </h3>
                <p>
                  {t.featuresBento.bookingDesc1}
                  <br />
                  {t.featuresBento.bookingDesc2}
                </p>
              </div>
              <div className="bento-link-detail">
                <span>yourstudio.opus.mk</span>
                <span aria-hidden="true">
                  <ArrowUpRight aria-hidden="true" />
                </span>
              </div>
            </article>
            <article className="bento-panel bento-calendar reveal">
              <img
                className="bento-art"
                src="/assets/bento-calendar.jpg"
                alt="A calendar with appointments"
                width="1536"
                height="1024"
                loading="lazy"
              />
              <div className="bento-copy">
                <h3>
                  {t.featuresBento.calendarTitle1}
                  <br />
                  {t.featuresBento.calendarTitle2}
                </h3>
                <p>{t.featuresBento.calendarDesc}</p>
              </div>
            </article>
            <article className="bento-panel bento-clients reveal">
              <img
                className="bento-art"
                src="/assets/bento-clients.jpg"
                alt="Client cards"
                width="1254"
                height="1254"
                loading="lazy"
              />
              <div className="bento-copy">
                <h3>
                  {t.featuresBento.clientsTitle1}
                  <br />
                  {t.featuresBento.clientsTitle2}
                </h3>
                <p>
                  {t.featuresBento.clientsDesc1}
                  <br />
                  {t.featuresBento.clientsDesc2}
                </p>
              </div>
            </article>
            <article className="bento-panel bento-reminders reveal">
              <img
                className="bento-art"
                src="/assets/bento-reminders.jpg"
                alt="Appointment reminder letter"
                width="1254"
                height="1254"
                loading="lazy"
              />
              <div className="bento-copy">
                <h3>
                  {t.featuresBento.remindersTitle1}
                  <br />
                  {t.featuresBento.remindersTitle2}
                </h3>
                <p>
                  {t.featuresBento.remindersDesc1}
                  <br />
                  {t.featuresBento.remindersDesc2}
                </p>
              </div>
            </article>
          </div>
          <div className="feature-summary">
            <span>
              <Infinity aria-hidden="true" /> {t.featuresBento.summaryUnlimited}
            </span>
            <span>
              <Infinity aria-hidden="true" /> {t.featuresBento.summaryServices}
            </span>
            <span>
              <MonitorSmartphone aria-hidden="true" />{" "}
              {t.featuresBento.summaryDevices}
            </span>
          </div>
        </section>

        <section className="intelligence-section" id="intelligence">
          <div className="section-heading centered reveal">
            <h2>
              {t.intelligence.headingLine1}
              <br />
              {t.intelligence.headingLine2}
            </h2>
            <p>
              {t.intelligence.subheading1}
              <br />
              {t.intelligence.subheading2}
            </p>
          </div>
          <IntelligenceRotation />
          <p className="ai-usage-note">{t.intelligence.usageNote}</p>
        </section>

        <section className="section studio-carousel-section" id="your-studio">
          <div className="split-heading reveal">
            <div>
              <h2>
                {t.carousel.headingLine1}
                <br />
                {t.carousel.headingLine2}
              </h2>
            </div>
            <p>{t.carousel.subheading}</p>
          </div>
          <div
            className="studio-carousel reveal"
            role="region"
            aria-roledescription="carousel"
            aria-label={t.carousel.headingLine1}
          >
            <div className="studio-carousel-stage">
              {t.carousel.slides.map((slide, index) => (
                <button
                  key={index}
                  type="button"
                  className="studio-slide"
                  data-studio-index={index}
                  data-offset={offsets[index]}
                  aria-label={slide.title}
                  aria-pressed={index === 0}
                  tabIndex={index === 0 ? 0 : -1}
                >
                  <img
                    src={carouselImages[index].src}
                    alt={carouselImages[index].alt}
                    width="1024"
                    height="1536"
                    loading="lazy"
                    draggable={false}
                  />
                  <span className="studio-slide-copy">
                    <span className="studio-slide-title">{slide.title}</span>
                    <span className="studio-slide-description">
                      {slide.desc}
                    </span>
                    <span className="studio-slide-footer">
                      {t.carousel.footer}
                      <span aria-hidden="true">
                        <ArrowUpRight aria-hidden="true" />
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="studio-carousel-controls">
              <button
                className="studio-prev"
                type="button"
                aria-label={t.carousel.prev}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <span className="studio-carousel-count" aria-hidden="true">
                <b>01</b> / 05
              </span>
              <button
                className="studio-next"
                type="button"
                aria-label={t.carousel.next}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
            <p
              className="visually-hidden studio-carousel-status"
              aria-live="polite"
              aria-atomic="true"
            >
              {`${t.carousel.slides[0].title}, 1 ${t.carousel.statusOf} 5`}
            </p>
          </div>
        </section>

        <section className="section steps-section" id="how-it-works">
          <div className="section-heading centered reveal">
            <h2>
              {t.howItWorks.headingLine1}
              <br />
              {t.howItWorks.headingLine2}
            </h2>
            <p>
              {t.howItWorks.subheadingLine1}
              <br />
              {t.howItWorks.subheadingLine2}
            </p>
          </div>
          <div className="steps-grid">
            <article className="step reveal">
              <div className="step-visual generated-step">
                <img
                  src="/assets/step-setup.jpg"
                  alt=""
                  width="1254"
                  height="1254"
                  loading="lazy"
                />
              </div>
              <h3>{t.howItWorks.step1Title}</h3>
              <p>{t.howItWorks.step1Desc}</p>
            </article>
            <article className="step reveal">
              <div className="step-visual generated-step">
                <img
                  src="/assets/step-publish.jpg"
                  alt=""
                  width="1254"
                  height="1254"
                  loading="lazy"
                />
              </div>
              <h3>{t.howItWorks.step2Title}</h3>
              <p>{t.howItWorks.step2Desc}</p>
            </article>
            <article className="step reveal">
              <div className="step-visual generated-step">
                <img
                  src="/assets/step-booked.jpg"
                  alt=""
                  width="1254"
                  height="1254"
                  loading="lazy"
                />
              </div>
              <h3>{t.howItWorks.step3Title}</h3>
              <p>{t.howItWorks.step3Desc}</p>
            </article>
          </div>
          <a
            className="button button-dark"
            href="https://studio.opus.mk/signup"
          >
            {t.howItWorks.cta}{" "}
            <span>
              <ArrowUpRight aria-hidden="true" />
            </span>
          </a>
        </section>

        <section className="pricing-section" id="pricing">
          <div className="section-heading centered reveal">
            <h2>
              {t.pricing.headingLine1}
              <br />
              {t.pricing.headingLine2}
            </h2>
            <p>
              {t.pricing.subheadingLine1}
              <br />
              {t.pricing.subheadingLine2}
            </p>
          </div>
          <div className="pricing-grid">
            <article className="price-card reveal">
              <div className="plan-heading">
                <span className="plan-symbol">
                  <Sparkle aria-hidden="true" />
                </span>
              </div>
              <h3>{t.pricing.free.name}</h3>
              <div className="price">
                {t.pricing.free.price} <span>{t.pricing.free.currency}</span>
              </div>
              <p>{t.pricing.free.desc}</p>
              <a
                className="button button-light"
                href="https://studio.opus.mk/signup"
              >
                {t.pricing.free.cta}{" "}
                <span>
                  <ArrowUpRight aria-hidden="true" />
                </span>
              </a>
              <div className="plan-divider"></div>
              <strong className="included-label">{t.pricing.free.label}</strong>
              <ul className="plan-features">
                {t.pricing.free.features.map((feature, i) => (
                  <li key={i}>
                    <Check aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <span className="plan-end">{t.pricing.free.end}</span>
            </article>
            <article className="price-card price-pro reveal">
              <div className="plan-heading">
                <span className="plan-symbol">
                  <Sparkles aria-hidden="true" />
                </span>
              </div>
              <h3>{t.pricing.pro.name}</h3>
              <div className="price">
                {t.pricing.pro.price} <span>{t.pricing.pro.currency}</span>
              </div>
              <p>{t.pricing.pro.desc}</p>
              <Link className="button button-dark" href="/contact">
                {t.pricing.pro.cta}{" "}
                <span>
                  <ArrowUpRight aria-hidden="true" />
                </span>
              </Link>
              <div className="plan-divider"></div>
              <strong className="included-label">{t.pricing.pro.label}</strong>
              <ul className="plan-features">
                {t.pricing.pro.features.map((feature, i) => (
                  <li key={i}>
                    <Check aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
                <li>
                  <Check aria-hidden="true" />
                  <span>
                    <span>
                      <b>{t.pricing.pro.aiAnalystTitle}</b>
                      <small>{t.pricing.pro.aiAnalystSub}</small>
                    </span>
                  </span>
                </li>
                <li>
                  <Check aria-hidden="true" />
                  <span>
                    <span>
                      <b>{t.pricing.pro.aiReceptionistTitle}</b>
                      <small>{t.pricing.pro.aiReceptionistSub}</small>
                    </span>
                  </span>
                </li>
                <li>
                  <Check aria-hidden="true" />
                  <span>
                    <span>
                      <b>{t.pricing.pro.aiRebookingTitle}</b>
                      <small>{t.pricing.pro.aiRebookingSub}</small>
                    </span>
                  </span>
                </li>
              </ul>
              <span className="plan-end">{t.pricing.pro.end}</span>
            </article>
            <CustomSoftwarePlan />
          </div>
          <p className="pricing-note">{t.pricing.note}</p>
        </section>

        <section className="section faq-section" id="faq">
          <div className="faq-intro reveal">
            <h2>
              {t.faq.headingLine1}
              <br />
              {t.faq.headingLine2}
            </h2>
            <p>
              {t.faq.subheadingLine1}
              <br />
              {t.faq.subheadingLine2}
            </p>
          </div>
          <div className="faq-list reveal">
            {t.faq.items.map((item, index) => (
              <details key={index} open={index === 0}>
                <summary>
                  {item.question}
                  <span>
                    <Plus aria-hidden="true" />
                  </span>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta section reveal">
          <picture className="cta-panorama">
            <source
              media="(max-width: 760px)"
              srcSet="/assets/opus-contact-portrait.png"
              width="1024"
              height="1536"
            />
            <img
              src="/assets/opus-cta-wide.jpg"
              alt=""
              width="2172"
              height="724"
              loading="lazy"
            />
          </picture>
          <div className="cta-content">
            <h2>
              {t.finalCta.headingLine1}
              <br />
              {t.finalCta.headingLine2}
            </h2>
            <p>
              {t.finalCta.subheadingLine1}
              <br />
              {t.finalCta.subheadingLine2}
            </p>
            <a
              className="button button-dark"
              href="https://studio.opus.mk/signup"
            >
              {t.finalCta.cta}{" "}
              <span>
                <ArrowUpRight aria-hidden="true" />
              </span>
            </a>
            <small>{t.finalCta.small}</small>
          </div>
        </section>
      </main>
      <LandingInteractions />
    </>
  );
}
