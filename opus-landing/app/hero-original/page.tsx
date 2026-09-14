import type { Metadata } from "next";
import Hero from "@/components/hero";

export const metadata: Metadata = {
  title: "Original hero — OPUS",
  robots: { index: false, follow: false },
};

export default function OriginalHeroPage() {
  return (
    <main>
      <Hero />
    </main>
  );
}
