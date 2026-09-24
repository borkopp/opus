import { notFound } from "next/navigation";
import { ImplementationPreview } from "./_components/implementation-preview";
export const metadata = {
  title: "Clarity implementation · sample data",
  robots: { index: false, follow: false },
};
export default function ImplementationPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ImplementationPreview />;
}
