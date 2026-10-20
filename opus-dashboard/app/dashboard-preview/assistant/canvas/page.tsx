import { notFound } from "next/navigation";
import { AssistantCanvasLoader } from "../_components/assistant-canvas-loader";
import { getExample, type PreviewLanguage } from "../_lib/examples";
import { resolveDashboardTheme } from "@/lib/dashboard-theme";

export const metadata = {
  title: "Assistant sample response",
  robots: { index: false, follow: false },
};

export default async function AssistantCanvasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const language: PreviewLanguage = params.language === "mk" ? "mk" : "en";
  const example = getExample(
    typeof params.example === "string" ? params.example : "",
    language,
  );
  return (
    <AssistantCanvasLoader
      key={`${example.id}-${language}`}
      example={example}
      language={language}
      theme={resolveDashboardTheme(params.theme)}
      expanded={params.view !== "chat"}
    />
  );
}
