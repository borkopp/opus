import { AiFeatures } from "@/components/ai-features";
import { CTA } from "@/components/cta";
import { FAQs } from "@/components/faqs";
import { FeaturesOne } from "@/components/features-one";
import { FeaturesTwo } from "@/components/features-two";
import Hero from "@/components/hero";
import { Pricing } from "@/components/pricing";

export default function Home() {
  return (
    <main className="">
      <Hero />
      <FeaturesOne />
      <FeaturesTwo />
      <AiFeatures />
      <Pricing />
      <FAQs />
      <CTA />
    </main>
  );
}
