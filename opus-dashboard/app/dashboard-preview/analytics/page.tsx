import { notFound } from "next/navigation";
import { AnalyticsPreview } from "./_components/AnalyticsPreview";

export const metadata = {
  title: "Analytics · sample data",
  robots: { index: false, follow: false },
};

export default function AnalyticsPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <AnalyticsPreview />;
}
