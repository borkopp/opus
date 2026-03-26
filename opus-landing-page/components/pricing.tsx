import React from "react";
import { Container } from "./container";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { LoopIcon, UsersIcon, LockIcon } from "@/icons";
import { Button } from "./ui/button";
import { IconCircleCheckFilled } from "@tabler/icons-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const Pricing = () => {
  return (
    <section className="py-10 md:py-20 lg:py-32 relative overflow-hidden">
      <Container className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        <div className="flex flex-col gap-4">
          <Subheading className="mt-2">Two tiers</Subheading>
          <Heading>Pricing that grows with you.</Heading>
          <Subheading className="mt-4">
            No setup fees. No contracts. Cancel any time.
          </Subheading>
          <ul className="list-none *:flex *:items-center *:gap-2 *:font-medium mt-4 flex flex-col gap-2">
            <li>
              <LockIcon />
              <p>Built-in Guardrails</p>
            </li>
            <li>
              <UsersIcon />
              <p>Agent Orchestration</p>
            </li>
            <li>
              <LoopIcon />
              <p>Human-in-the-Loop</p>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-8">
          <PricingCard
            title="Starter"
            price="49"
            description="Perfect for individuals or small teams starting their journey."
            ctaLink="/"
            ctaText="Start your free trial"
            steps={[
              "1 location",
              "3 staff",
              "Bookings + payments",
              "Branded web app",
            ]}
          />
          <PricingCard
            title="Growth"
            price="149"
            description="Ideal for growing businesses ready to scale with AI."
            popular
            ctaLink="/"
            ctaText="Get started"
            steps={[
              "3 locations",
              "Unlimited staff",
              "AI front desk",
              "Split payouts",
              "Analytics",
              "Mobile app",
            ]}
          />
        </div>
      </Container>
    </section>
  );
};

const PricingCard = ({
  title,
  price,
  description,
  ctaLink,
  ctaText,
  steps,
  popular,
}: {
  title: string;
  price: string;
  description: string;
  ctaLink: string;
  ctaText: string;
  steps: string[];
  popular?: boolean;
}) => {
  return (
    <div
      className={cn(
        "p-4 md:p-8 rounded-3xl bg-neutral-100 dark:bg-neutral-900/50 grid grid-cols-1 md:grid-cols-2 gap-10 items-center border relative",
        popular
          ? "border-black dark:border-white shadow-2xl"
          : "border-neutral-200 dark:border-neutral-800"
      )}
    >
      {popular && (
        <div className="absolute top-0 right-10 translate-y-[-50%] bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-xl">
          Most Popular
        </div>
      )}
      <div>
        <p className="text-sm font-bold uppercase tracking-widest mb-2 text-neutral-500">
          {title}
        </p>
        <Heading>
          €{price}
          <span className="text-neutral-400 text-sm md:text-xl lg:text-3xl font-normal">
            /mo
          </span>
        </Heading>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400 text-sm">
          {description}
        </p>
        <Button asChild className="mt-4 w-full md:w-auto">
          <Link href={ctaLink}>{ctaText}</Link>
        </Button>
      </div>
      <ul className="list-none *:flex *:items-center *:gap-2 *:font-medium mt-4 flex flex-col gap-2">
        {steps.map((step, index) => (
          <Step key={step + index} title={step} />
        ))}
      </ul>
    </div>
  );
};

const Step = ({ title }: { title: string }) => {
  return (
    <li>
      <IconCircleCheckFilled className="size-5 text-neutral-500 flex-shrink-0" />
      <p className="text-sm md:text-base text-neutral-700 dark:text-neutral-300">
        {title}
      </p>
    </li>
  );
};
