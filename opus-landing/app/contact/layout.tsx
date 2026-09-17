import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Contact OPUS",
  description:
    "Talk to OPUS about your beauty studio, booking website, or account.",
  alternates: { canonical: "/contact" },
};
export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
