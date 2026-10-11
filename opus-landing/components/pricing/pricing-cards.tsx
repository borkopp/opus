"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowUpRight, Check, Sparkle, Sparkles } from "lucide-react";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n/context";
import { formatProPrice, PRO_TEAM_TIERS } from "@/lib/pro-pricing";
import { cn } from "@/lib/utils";
import { CustomSoftwarePlan } from "./custom-software-plan";

export function PricingCards({ animated = false }: { animated?: boolean }) {
  const { t, locale } = useI18n();
  const [tierIndex, setTierIndex] = useState(0);
  const selectorId = useId();
  const tier = PRO_TEAM_TIERS[tierIndex];
  const teamSize = t.pricing.pro.teamSizeValue.replace(
    "{count}",
    String(tier.teamLimit),
  );

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
          <div
            className="price pro-price"
            aria-live="polite"
            aria-atomic="true"
          >
            {formatProPrice(tier.monthlyPriceMinorUnits, locale)}{" "}
            <span>{t.pricing.pro.currency}</span>
          </div>
          <p>{t.pricing.pro.desc}</p>
          <FieldGroup className="pro-team-selector">
            <Field>
              <FieldLabel
                htmlFor={selectorId}
                id={`${selectorId}-label`}
                className="pro-team-label"
              >
                <span>{t.pricing.pro.teamSizeLabel}</span>
                <span className="pro-team-count" aria-hidden="true">
                  {teamSize}
                </span>
              </FieldLabel>
              <div className="pro-team-control">
                <Slider
                  min={0}
                  max={PRO_TEAM_TIERS.length - 1}
                  step={1}
                  value={[tierIndex]}
                  onValueChange={([value]) => setTierIndex(value)}
                  thumbProps={{
                    id: selectorId,
                    "aria-labelledby": `${selectorId}-label`,
                    "aria-valuetext": teamSize,
                    "aria-valuemin": PRO_TEAM_TIERS[0].teamLimit,
                    "aria-valuemax":
                      PRO_TEAM_TIERS[PRO_TEAM_TIERS.length - 1].teamLimit,
                    "aria-valuenow": tier.teamLimit,
                  }}
                />
                <div className="pro-team-ticks" aria-hidden="true">
                  {PRO_TEAM_TIERS.map((option) => (
                    <span
                      key={option.teamLimit}
                      data-selected={option.teamLimit === tier.teamLimit}
                    >
                      {option.teamLimit}
                    </span>
                  ))}
                </div>
              </div>
            </Field>
          </FieldGroup>
          <Link
            className="button button-dark"
            href={`https://studio.opus.mk/upgrade?team=${tier.teamLimit}`}
          >
            {t.pricing.pro.cta}{" "}
            <span>
              <ArrowUpRight aria-hidden="true" />
            </span>
          </Link>
          <div className="plan-divider"></div>
          <strong className="included-label">{t.pricing.pro.label}</strong>
          <ul className="plan-features">
            <li>
              <Check aria-hidden="true" />
              <span>
                {t.pricing.pro.teamFeature.replace(
                  "{count}",
                  String(tier.teamLimit),
                )}
              </span>
            </li>
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
