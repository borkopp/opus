import { FeatureSectionWithTerminal } from "@/components/ai-features";
import { LaunchBanner } from "@/components/cta";
import { FAQs } from "@/components/faqs";
import { FeaturesOne } from "@/components/features-one";
import { FeaturesTwo } from "@/components/features-two";
import { ImmersiveHero } from "./_components/immersive-hero";
import { Pricing } from "@/components/pricing";
import { Stats } from "@/components/stats";
import { BookingJourney } from "./_components/booking-journey";

export default function Home() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <ImmersiveHero />
      <BookingJourney />
      <FeaturesOne />
      <FeatureSectionWithTerminal />
      <FeaturesTwo compact />
      <Stats compact />
      <Pricing />
      <FAQs />
      <LaunchBanner />
    </main>
  );
}
