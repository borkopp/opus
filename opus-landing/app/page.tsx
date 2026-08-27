import { CTA } from "@/components/cta";
import { FAQs } from "@/components/faqs";
import { FeaturesOne } from "@/components/features-one";
import Hero from "@/components/hero";


export default function Home() {
  return (
    <main className="">
      <Hero />
      <FeaturesOne />
      <FAQs />
      <CTA />
    </main>
  );
}
