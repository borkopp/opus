import React from "react";
import { Container } from "./container";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { LandingImages } from "./landing-images";
import { GradientDivider } from "./gradient-divider";

export const Speed = () => {
  return (
    <section className="pt-10 md:pt-20 lg:pt-10 relative overflow-hidden">
      <Container>
        <Heading>
          Built for Speed <br />
          Designed for Scale
        </Heading>

        <Subheading className="py-8">
          Deploy AI agents that plan, act through your tools, and report
          outcomes—without changing how your teams work.
        </Subheading>

        <LandingImages
          firstImageSrc={"https://assets.aceternity.com/screenshots/3.jpg"}
          secondImageSrc={"https://assets.aceternity.com/screenshots/4.jpg"}
        />
      </Container>
      <GradientDivider />
    </section>
  );
};
