import { FAQs } from "@/components/faqs";
import { Features } from "@/components/features";
import { FeaturesSecondary } from "@/components/features-secondary";
import { FeaturesTertiary } from "@/components/features-tertiary";
import HeroSectionWithMeshGradient from "@/components/hero";
import { Hero } from "@/components/hero-old";
import HeroSection from "@/components/hero-section";
import { LogoCloud } from "@/components/logo-cloud";
import { ModeToggle } from "@/components/mode-toggle";
import { Outcomes } from "@/components/outcomes";
import { Pricing } from "@/components/pricing";
import { Speed } from "@/components/speed";
import TabsDemo from "@/components/tabs-demo";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <Features />
      <TabsDemo />
      <Speed />
      <FeaturesSecondary />
      <Outcomes />
      <FeaturesTertiary />
      <Pricing />
      <FAQs />
    </div>
  );
}
