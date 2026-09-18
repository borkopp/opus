/* eslint-disable @next/next/no-img-element */
"use client";

import { Check, Clock3, Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function BookingPreview() {
  const { t, locale } = useI18n();
  const tab = t.productTour.tabs.website;

  return (
    <div
      className="product-mini product-mini-booking"
      role="img"
      aria-label={
        locale === "mk"
          ? "Пример за веб-сајт за закажување со услуга и слободни термини"
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
            <b>{tab.serviceName}</b>
            <span>{tab.serviceDetail}</span>
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
  const tab = t.productTour.tabs.calendar;

  return (
    <div
      className="product-mini product-mini-calendar"
      role="img"
      aria-label={
        locale === "mk"
          ? "Пример за заеднички календар со двајца членови на тимот и закажани термини"
          : "Sample shared calendar showing two staff members and three scheduled appointments"
      }
    >
      <div className="product-mini-heading">
        <b>{tab.todayHeading}</b>
        <span>{tab.todayDay}</span>
      </div>
      <div className="product-mini-calendar-grid">
        <div className="product-mini-hours">
          <span />
          <span>09:00</span>
          <span>10:00</span>
          <span>11:00</span>
        </div>
        <div className="product-mini-day">
          <b>{tab.staffAna}</b>
          <div className="product-mini-appointment">
            <strong>{tab.apt1}</strong>
            <span>09:00 — 10:00</span>
          </div>
          <div className="product-mini-appointment is-later">
            <strong>{tab.apt2}</strong>
            <span>11:00 — 12:00</span>
          </div>
        </div>
        <div className="product-mini-day">
          <b>{tab.staffMarija}</b>
          <div className="product-mini-appointment is-offset">
            <strong>{tab.apt3}</strong>
            <span>10:00 — 11:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClientPreview() {
  const { t, locale } = useI18n();
  const tab = t.productTour.tabs.clients;

  return (
    <div
      className="product-mini product-mini-client"
      role="img"
      aria-label={
        locale === "mk"
          ? "Пример за клиентски профил со историја на посети"
          : "Sample client profile with her recent haircut and color visits"
      }
    >
      <div className="product-mini-profile">
        <span className="product-mini-avatar">ЕП</span>
        <div>
          <b>{tab.clientName}</b>
          <span>{tab.clientRemembered}</span>
        </div>
        <Heart aria-hidden="true" />
      </div>
      <div className="product-mini-history">
        <span className="product-mini-history-label">
          <Clock3 aria-hidden="true" /> {tab.recentVisits}
        </span>
        <div>
          <span>
            <b>{tab.visit1}</b>
            <small>{tab.date1}</small>
          </span>
          <Check aria-hidden="true" />
        </div>
        <div>
          <span>
            <b>{tab.visit2}</b>
            <small>{tab.date2}</small>
          </span>
          <Check aria-hidden="true" />
        </div>
        <div>
          <span>
            <b>{tab.visit3}</b>
            <small>{tab.date3}</small>
          </span>
          <Check aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
