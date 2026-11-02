/* eslint-disable @next/next/no-img-element */
"use client";

import { Check, Clock3, Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function BookingPreview() {
  const { t, locale } = useI18n();
  const feature = t.productTour.features.website;

  return (
    <div
      className="product-mini product-mini-booking"
      role="img"
      aria-label={
        locale === "mk"
          ? "Пример за веб-сајт за закажување со услуга и слободни термини"
          : locale === "sq"
            ? "Shembull i uebfaqes së rezervimit me shërbim dhe termine të lira"
            : "Sample studio booking website with a haircut service and available appointment times"
      }
    >
      <div className="product-mini-address">atelier.opus.mk</div>
      <div className="product-mini-cover">
        <img
          src="/assets/studio.jpg"
          alt=""
          width="1536"
          height="1024"
          loading="lazy"
        />
        <span>ATELIER</span>
      </div>
      <div className="product-mini-body">
        <div className="product-mini-service">
          <div>
            <b>{feature.serviceName}</b>
            <span>{feature.serviceDetail}</span>
          </div>
          <Check aria-hidden="true" />
        </div>
        <div className="product-mini-times">
          <span>09:00</span>
          <span className="is-chosen">10:30</span>
          <span>12:00</span>
        </div>
      </div>
    </div>
  );
}

export function CalendarPreview() {
  const { t, locale } = useI18n();
  const feature = t.productTour.features.calendar;

  return (
    <div
      className="product-mini product-mini-calendar"
      role="img"
      aria-label={
        locale === "mk"
          ? "Пример за заеднички календар со двајца членови на тимот и закажани термини"
          : locale === "sq"
            ? "Shembull i kalendarit të përbashkët me dy anëtarë ekipi dhe termine të rezervuara"
            : "Sample shared calendar showing two team members and three scheduled appointments"
      }
    >
      <div className="product-mini-heading">
        <b>{feature.todayHeading}</b>
        <span>{feature.todayDay}</span>
      </div>
      <div className="product-mini-calendar-grid">
        <div className="product-mini-hours">
          <span />
          <span>09:00</span>
          <span>10:00</span>
          <span>11:00</span>
        </div>
        <div className="product-mini-day">
          <b>{feature.staffAna}</b>
          <div className="product-mini-appointment">
            <strong>{feature.apt1}</strong>
            <span>09:00 — 10:00</span>
          </div>
          <div className="product-mini-appointment is-later">
            <strong>{feature.apt2}</strong>
            <span>11:00 — 12:00</span>
          </div>
        </div>
        <div className="product-mini-day">
          <b>{feature.staffMarija}</b>
          <div className="product-mini-appointment is-offset">
            <strong>{feature.apt3}</strong>
            <span>10:00 — 11:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClientPreview() {
  const { t, locale } = useI18n();
  const feature = t.productTour.features.clients;

  return (
    <div
      className="product-mini product-mini-client"
      role="img"
      aria-label={
        locale === "mk"
          ? "Пример за клиентски профил со историја на посети"
          : locale === "sq"
            ? "Shembull i profilit të klientit me historinë e vizitave të fundit"
            : "Sample client profile with her recent haircut and color visits"
      }
    >
      <div className="product-mini-profile">
        <span className="product-mini-avatar">ЕП</span>
        <div>
          <b>{feature.clientName}</b>
          <span>{feature.clientRemembered}</span>
        </div>
        <Heart aria-hidden="true" />
      </div>
      <div className="product-mini-history">
        <span className="product-mini-history-label">
          <Clock3 aria-hidden="true" /> {feature.recentVisits}
        </span>
        <div>
          <span>
            <b>{feature.visit1}</b>
            <small>{feature.date1}</small>
          </span>
          <Check aria-hidden="true" />
        </div>
        <div>
          <span>
            <b>{feature.visit2}</b>
            <small>{feature.date2}</small>
          </span>
          <Check aria-hidden="true" />
        </div>
        <div>
          <span>
            <b>{feature.visit3}</b>
            <small>{feature.date3}</small>
          </span>
          <Check aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
