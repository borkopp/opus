import { FAQs } from "@/components/faqs";
import { LaunchBanner } from "@/components/cta";
import { Pricing } from "@/components/pricing";
import { Metadata } from "next";
import { getMessages } from "@/lib/i18n/messages";
import { getRequestLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const pricing = getMessages(locale).metadata.pricing;

  return {
    title: pricing.title,
    description: pricing.description,
    openGraph: {
      title: pricing.title,
      description: pricing.socialDescription,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: pricing.title,
      description: pricing.socialDescription,
    },
  };
}

export default function PricingPage() {
  return (
    <main>
      <div className="pt-10 md:pt-24">
        <Pricing />
      </div>
      <FAQs />
      <LaunchBanner />
    </main>
  );
}
