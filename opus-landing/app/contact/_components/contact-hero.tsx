"use client";

import { useI18n } from "@/lib/i18n/context";

export function ContactHero() {
  const { t } = useI18n();

  return (
    <section className="contact-hero" aria-labelledby="contact-title">
      <div className="contact-intro">
        <h1 id="contact-title">
          {t.contactPage.heroTitle1}
          <br />
          {t.contactPage.heroTitle2}
        </h1>
        <p>
          {t.contactPage.heroSubLine1}
          <br className="desktop-break" /> {t.contactPage.heroSubLine2}
        </p>
        <aside className="contact-pro-note" aria-labelledby="contact-pro-title">
          <h2 id="contact-pro-title">{t.contactPage.proTitle}</h2>
          <p>{t.contactPage.proDescription}</p>
        </aside>
      </div>
    </section>
  );
}
