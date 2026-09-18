/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function ContactDetails() {
  const { t } = useI18n();

  return (
    <aside className="contact-details" aria-labelledby="contact-details-title">
      <img
        className="contact-portrait"
        src="/assets/opus-contact-portrait.png"
        alt=""
        width="1024"
        height="1536"
      />
      <div className="contact-details-copy">
        <h2 id="contact-details-title">{t.contactPage.detailsTitle}</h2>
        <dl className="contact-channels">
          <div>
            <dt>
              <Mail aria-hidden="true" /> {t.contactPage.emailLabel}
            </dt>
            <dd>
              <a href="mailto:hello@opus.mk">
                hello@opus.mk <ArrowUpRight aria-hidden="true" />
              </a>
            </dd>
          </div>
          <div>
            <dt>
              <Phone aria-hidden="true" /> {t.contactPage.phoneLabel}
            </dt>
            <dd>
              <a href="tel:+38977826333">
                +389 77 826 333 <ArrowUpRight aria-hidden="true" />
              </a>
            </dd>
          </div>
          <div>
            <dt>
              <MapPin aria-hidden="true" /> {t.contactPage.locationLabel}
            </dt>
            <dd>{t.contactPage.locationValue}</dd>
          </div>
        </dl>
        <Link href="/#faq" className="contact-faq-link">
          {t.contactPage.faqLink} <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
