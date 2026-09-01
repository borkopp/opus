import { FeatureSectionWithTerminal } from "@/components/ai-features";
import { LaunchBanner } from "@/components/cta";
import { FAQs } from "@/components/faqs";
import { FeaturesOne } from "@/components/features-one";
import { FeaturesTwo } from "@/components/features-two";
import Hero from "@/components/hero";
import { Pricing } from "@/components/pricing";
import { Stats } from "@/components/stats";

export default function Home() {
  return (
    <main className="">
      <Hero />
      <FeaturesOne />
      <FeatureSectionWithTerminal />
      <Stats />
      <FeaturesTwo />
      <Pricing />
      <FAQs />
      <LaunchBanner />
    </main>
  );
}
