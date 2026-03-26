"use client";

import { Tabs } from "@/components/ui/tabs";
import { Heading } from "./heading";
import { MeshGradient } from "./hero";
import Image from "next/image";

export default function TabsDemo() {
  const tabs = [
    {
      title: "AI",
      value: "ai-front-desk",
      content: (
        <MeshGradient>
          <Image
            src="/hero.png"
            alt="AI Front Desk"
            width={1920}
            height={1080}
            className="mx-auto h-full w-full max-w-[90%] rounded-lg object-cover object-left-top md:max-w-[85%]"
          />
        </MeshGradient>
      ),
    },
    {
      title: "Scheduling",
      value: "smart-scheduling",
      content: (
        <MeshGradient>
          <Image
            src="/bookings.png"
            alt="AI Front Desk"
            width={1920}
            height={1080}
            className="mx-auto h-full w-full max-w-[90%] rounded-lg object-cover object-left-top md:max-w-[85%]"
          />
        </MeshGradient>
      ),
    },
    {
      title: "Split Payouts",
      value: "split-payouts",
      content: (
        <MeshGradient>
          <Image
            src="/hero.png"
            alt="AI Front Desk"
            width={1920}
            height={1080}
            className="mx-auto h-full w-full max-w-[90%] rounded-lg object-cover object-left-top md:max-w-[85%]"
          />
        </MeshGradient>
      ),
    },
    {
      title: "Dashboard",
      value: "dashboard",
      content: (
        <MeshGradient>
          <Image
            src="/hero.png"
            alt="AI Front Desk"
            width={1920}
            height={1080}
            className="mx-auto h-full w-full max-w-[90%] rounded-lg object-cover object-left-top md:max-w-[85%]"
          />
        </MeshGradient>
      ),
    },
  ];

  return (
    <div className="h-[25rem] md:h-[60rem] px-4 [perspective:1000px] relative b flex flex-col max-w-7xl mx-auto w-full items-start justify-start my-40">
      <Heading className="text-center mb-10">
        One platform.
        Everything handled.
      </Heading>
      <Tabs tabs={tabs} />
    </div>
  );
}
