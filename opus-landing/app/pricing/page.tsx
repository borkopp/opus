import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/server";
import { pricingPageMessages } from "@/lib/i18n/pricing";
import { PricingContent } from "./_components/pricing-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const { title, description } = pricingPageMessages[locale].metadata;

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
