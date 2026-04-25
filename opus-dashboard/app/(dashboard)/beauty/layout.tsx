import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "The intelligent operating system for modern service businesses. Unified scheduling, AI-powered automation, and business intelligence.",
};

export default function BeautyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
