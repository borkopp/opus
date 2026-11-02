"use client";

import { ArrowUpRight, Check } from "lucide-react";
import { useBillingCurrency } from "@/components/pricing/billing-currency-provider";
import { useI18n } from "@/lib/i18n/context";
import { trialSignupUrl } from "@/lib/pro-pricing";
import { HeroShowcase } from "./hero-showcase";

export function HeroSection() {
  const { t } = useI18n();
  const { currency } = useBillingCurrency();

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-background" aria-hidden="true" />
      <div className="hero-layout">
        <div className="hero-copy">
          <h1 id="hero-title">{t.hero.title}</h1>
          <p>{t.hero.description}</p>
          <div className="hero-actions">
            <a className="button button-dark" href={trialSignupUrl(currency)}>
              {t.hero.createWebsite}
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
              <Check aria-hidden="true" /> {t.hero.badgeForStudio}
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <HeroShowcase />
        </div>
      </div>
    </section>
  );
}
