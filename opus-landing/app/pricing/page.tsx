import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/server";
import { pricingPageMessages } from "@/lib/i18n/pricing";
import { PricingContent } from "./_components/pricing-content";
import { headers } from "next/headers";
import { requestBillingCurrency } from "../../../shared/billing-currency";
import {
  PRO_TEAM_TIERS,
  proPriceMinorUnits,
  proPriceLabel,
} from "@/lib/pro-pricing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const { title, description: template } = pricingPageMessages[locale].metadata;
  const currency = requestBillingCurrency(await headers());
  const description = template.replace(
    "{proPrice}",
    proPriceLabel(
      proPriceMinorUnits(PRO_TEAM_TIERS[0], currency),
      locale,
      currency,
    ),
  );

  return {
    title,
    description,
    alternates: { canonical: "/pricing" },
    openGraph: { title, description, url: "/pricing" },
    twitter: { title, description },
  };
}

export default function PricingPage() {
  return <PricingContent />;
}
