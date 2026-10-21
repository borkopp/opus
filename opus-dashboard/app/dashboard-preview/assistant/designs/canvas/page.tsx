import { notFound } from "next/navigation";
import { DesignWorkspaceLoader } from "../_components/workspace-loader";
import { resolveVariant } from "../_lib/design-data";

export const metadata = {
  title: "AI Assistant design preview",
  robots: { index: false, follow: false },
};

export default async function AssistantDesignCanvas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const variant = resolveVariant(params.variant);
  return (
    <DesignWorkspaceLoader
      key={`${variant}-${params.view}`}
      variant={variant}
      conversation={params.view === "conversation"}
    />
  );
}
