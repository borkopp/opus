import { CTA } from "@/components/cta";
import { FAQs } from "@/components/faqs";
import { Pricing } from "@/components/pricing";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - Simplistic",
  description:
    "Simple, transparent pricing for AI agent deployment. Choose a plan that works best for you and your team. No hidden fees.",
  openGraph: {
    title: "Pricing - Simplistic",
    description:
      "Simple, transparent pricing for AI agent deployment. Choose a plan that works best for you and your team.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing - Simplistic",
    description:
      "Simple, transparent pricing for AI agent deployment. Choose a plan that works best for you and your team.",
  },
};

export default function PricingPage() {
  return (
    <main>
      <div className="pt-10 md:pt-24">
        <Pricing />
      </div>
      <FAQs />
      <CTA />
    </main>
  );
}
