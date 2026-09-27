"use client";

import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { useI18n } from "@/lib/i18n/context";
import { pricingPageMessages } from "@/lib/i18n/pricing";
import { PlanComparison } from "./plan-comparison";

export function PricingContent() {
  const { locale } = useI18n();
  const copy = pricingPageMessages[locale];

  return (
    <main id="main" className="pricing-page">
      <section className="pricing-page-intro" aria-labelledby="pricing-title">
        <h1 id="pricing-title">{copy.heading}</h1>
        <p className="pricing-page-description">{copy.description}</p>
        <a className="text-link" href="#comparison">
          {copy.compare} <ArrowDown aria-hidden="true" />
        </a>
      </section>

      <section className="pricing-section" aria-labelledby="pricing-title">
        <PricingCards />
      </section>

      <PlanComparison />

      <aside
        className="pricing-custom-note"
        aria-labelledby="custom-pricing-title"
      >
        <div>
          <h2 id="custom-pricing-title">{copy.customTitle}</h2>
          <p>{copy.customDescription}</p>
        </div>
        <Link className="button button-dark" href="/contact">
          {copy.customCta} <ArrowUpRight aria-hidden="true" />
        </Link>
      </aside>
    </main>
  );
}
