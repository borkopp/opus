import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssistantDesignLab } from "./_components/design-lab";
import { resolveVariant } from "./_lib/design-data";

export const metadata: Metadata = {
  title: "AI Assistant design explorations",
  robots: { index: false, follow: false },
};

export default async function AssistantDesignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  return <AssistantDesignLab initialVariant={resolveVariant(params.variant)} />;
}
