import { Pricing } from "@/components/pricing";
import { FAQs } from "@/components/faqs";
import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { Subheading } from "@/components/subheading";

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <section className="py-16 md:py-24">
        <Container className="text-center">
          <Subheading className="mx-auto">Pricing</Subheading>
          <Heading as="h1" className="mt-4">
            Simple, transparent pricing
          </Heading>
          <Subheading className="mt-4 mx-auto max-w-2xl">
            Choose the plan that works best for you. All plans include a 14-day
            free trial with no credit card required.
          </Subheading>
        </Container>
      </section>
      <Pricing />
      <FAQs />
    </div>
  );
}
