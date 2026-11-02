"use client";

import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Globe2,
  Mail,
  QrCode,
  UsersRound,
} from "lucide-react";
import { useBillingCurrency } from "@/components/pricing/billing-currency-provider";
import { trialSignupUrl } from "@/lib/pro-pricing";
import { useI18n } from "@/lib/i18n/context";
import {
  BookingPreview,
  CalendarPreview,
  ClientPreview,
} from "./product-previews";

export function ProductTour() {
  const { currency } = useBillingCurrency();
  const { t } = useI18n();
  const features = [
    {
      id: "website",
      copy: t.productTour.features.website,
      icon: Globe2,
      preview: BookingPreview,
    },
    {
      id: "calendar",
      copy: t.productTour.features.calendar,
      icon: CalendarDays,
      preview: CalendarPreview,
    },
    {
      id: "clients",
      copy: t.productTour.features.clients,
      icon: UsersRound,
      preview: ClientPreview,
    },
  ];
  const extras = [
    { id: "reminders", copy: t.productTour.extras.reminders, icon: Mail },
    { id: "sharing", copy: t.productTour.extras.sharing, icon: QrCode },
    { id: "reports", copy: t.productTour.extras.reports, icon: BarChart3 },
  ];

  return (
    <div className="product-tour">
      <div className="product-benefits-grid">
        {features.map(({ id, copy, icon: Icon, preview: Preview }) => (
          <article
            className={`product-benefit product-benefit-${id} reveal`}
            key={id}
            aria-labelledby={`product-benefit-${id}`}
          >
            <div className="product-benefit-copy">
              <span className="product-benefit-label">
                <Icon size={16} aria-hidden="true" />
                {copy.label}
              </span>
              <h3 id={`product-benefit-${id}`}>{copy.title}</h3>
              <p>{copy.description}</p>
            </div>
            <div className="product-benefit-visual">
              <Preview />
            </div>
          </article>
        ))}
      </div>
      <div className="product-extras reveal">
        <p className="product-extras-label">{t.productTour.alsoIncluded}</p>
        <ul>
          {extras.map(({ id, copy, icon: Icon }) => (
            <li key={id}>
              <Icon size={20} aria-hidden="true" />
              <div>
                <h3>{copy.title}</h3>
                <p>{copy.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="product-benefits-action">
        <a className="button button-dark" href={trialSignupUrl(currency)}>
          {t.productTour.cta}
          <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
