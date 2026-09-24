import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardPreview } from "./_components/dashboard-preview";

export const metadata: Metadata = {
  title: "Dashboard design preview",
  robots: { index: false, follow: false },
};

export default function DashboardPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DashboardPreview />;
}
