import { CTA } from "@/components/cta";
import CloudShaderHero from "@/components/cloud-shader-hero-demo";
import { FAQs } from "@/components/faqs";
import { FeaturesOne } from "@/components/features-one";

export default function Home() {
  return (
    <main>
      <CloudShaderHero />
      <FeaturesOne />
      <FAQs />
      <CTA />
    </main>
  );
}
