import React from "react";
import { Container } from "./container";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { LandingImages } from "./landing-images";
import { GradientDivider } from "./gradient-divider";

export const Outcomes = () => {
  return (
    <section className="pt-10 md:pt-20 lg:pt-32 relative overflow-hidden">
      <Container>
        <Heading>
          Governed AI, <br />
          Trusted Outcomes
        </Heading>

        <Subheading className="py-8">
          Deploy AI agents with built-in approvals, brand guardrails, and audit
          trails. Every step is visible, reviewable, and compliant.
        </Subheading>

        <LandingImages
          firstImageSrc={"https://assets.aceternity.com/screenshots/5.jpg"}
          secondImageSrc={"https://assets.aceternity.com/screenshots/6.jpg"}
        />
      </Container>
      <GradientDivider />
    </section>
  );
};
