"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Code2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function CustomSoftwarePlan() {
  const { t } = useI18n();
  const plan = t.pricing.custom;

  return (
    <article className="price-card price-custom reveal">
      <div className="plan-heading">
        <span className="plan-symbol">
          <Code2 aria-hidden="true" />
        </span>
      </div>
      <h3>{plan.name}</h3>
      <div className="price custom-price">{plan.price}</div>
      <p>{plan.desc}</p>
      <Link className="button button-light" href="/contact">
        {plan.cta}
        <span>
          <ArrowUpRight aria-hidden="true" />
        </span>
      </Link>
      <div className="plan-divider" />
      <strong className="included-label">{plan.label}</strong>
      <ul className="plan-features">
        {plan.features.map((feature) => (
          <li key={feature}>
            <Check aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="custom-monthly">{plan.monthly}</div>
      <span className="plan-end">{plan.end}</span>
    </article>
  );
}
