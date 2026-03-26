import React from "react";
import { Container } from "./container";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { Button } from "./ui/button";
import Link from "next/link";
import { LandingImages } from "./landing-images";
import { GradientDivider } from "./gradient-divider";

export const Hero = () => {
  return (
    <section className="pt-10 md:pt-20 lg:pt-32 relative overflow-hidden">
      <Container>
        <Heading as="h1">
          Your business, running itself.
        </Heading>

        <Subheading className="py-8">
          Opus replaces your booking tool, front desk, and payment system. One platform that gets smarter every day.
        </Subheading>
        <div className="flex items-center gap-6">
          <Button className="shadow-brand">Get Started</Button>
          <Button asChild variant="outline">
            <Link href="#">Book a demo</Link>
          </Button>
        </div>
        <LandingImages />
      </Container>
      <GradientDivider />
    </section>
  );
};
