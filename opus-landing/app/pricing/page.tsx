import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/server";
import { pricingPageMessages } from "@/lib/i18n/pricing";
import { PricingContent } from "./_components/pricing-content";
import { pageMetadata } from "@/lib/seo";
import {
  PRO_TEAM_TIERS,
  proPriceMinorUnits,
  proPriceLabel,
} from "@/lib/pro-pricing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const { title, description: template } = pricingPageMessages[locale].metadata;
  // Search snippets stay stable; the visible currency selector remains available.
  const currency = "mkd";
  const description = template.replace(
    "{proPrice}",
    proPriceLabel(
      proPriceMinorUnits(PRO_TEAM_TIERS[0], currency),
      locale,
      currency,
    ),
  );

  return pageMetadata({ locale, path: "/pricing", title, description });
}

export default function PricingPage() {
  return <PricingContent />;
}
