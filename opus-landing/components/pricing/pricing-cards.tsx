"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Sparkle, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { CustomSoftwarePlan } from "./custom-software-plan";

export function PricingCards({ animated = false }: { animated?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <div className="pricing-grid">
        <article className={cn("price-card", { reveal: animated })}>
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
        <article className={cn("price-card price-pro", { reveal: animated })}>
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
          <Link
            className="button button-dark"
            href="https://studio.opus.mk/upgrade"
          >
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
          </ul>
          <span className="plan-end">{t.pricing.pro.end}</span>
        </article>
        <CustomSoftwarePlan animated={animated} />
      </div>
      <p className="pricing-note">{t.pricing.note}</p>
    </>
  );
}
