"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnalysisReport } from "@/components/business-assistant/AnalysisReport";
import { ConversationPanel } from "@/components/business-assistant/ConversationPanel";
import { DashboardI18nProvider } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { previewAssistantReport } from "@/lib/assistant-report-presentation";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { PreviewExample, PreviewLanguage } from "../_lib/examples";

export function AssistantCanvas({
  example,
  language,
  theme,
  expanded,
}: {
  example: PreviewExample;
  language: PreviewLanguage;
  theme: DashboardTheme;
  expanded: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const hasReports = example.turn.reports.length > 0;
  const showReports = expanded && hasReports;
  const query = new URLSearchParams({ example: example.id, language, theme });
  const href = (view: string) =>
    `/dashboard-preview/assistant/canvas?${query}&view=${view}`;

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage(
      {
        type: "assistant-preview-view",
        example: example.id,
        view: showReports ? "report" : "chat",
      },
      window.location.origin,
    );
  }, [example.id, showReports]);

  return (
    <DashboardI18nProvider locale={language}>
      <main
        data-dashboard-theme={theme}
        className="dashboard-shell min-h-dvh bg-background p-4 text-foreground sm:p-8"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
          <p className="text-xs text-muted-foreground">
            {language === "mk"
              ? "Примерни податоци · Преглед на дизајн"
              : "Sample data · Design preview"}
          </p>
          {showReports ? (
            <>
              <Button variant="outline" className="self-start" asChild>
                <Link href={href("chat")}>
                  <ArrowLeft data-icon="inline-start" />
                  {language === "mk"
                    ? "Назад кон одговорот"
                    : "Back to response"}
                </Link>
              </Button>
              <h1 className="text-2xl font-semibold tracking-tight">
                {example.turn.question}
              </h1>
              <p className="text-sm text-muted-foreground">
                {language === "mk"
                  ? "Ова се податоците користени за зачуваниот одговор. Прашајте повторно за да ги вклучите поновите промени."
                  : "This is the data used for the saved answer. Ask again to include changes made since then."}
              </p>
              {example.turn.reports.map((report) => (
                <AnalysisReport
                  key={report.key}
                  report={report}
                  question={example.turn.question}
                  expanded
                />
              ))}
            </>
          ) : (
            <section
              aria-label="Sample assistant conversation"
              className="dashboard-assistant-surface flex h-[calc(100dvh-7rem)] min-h-[480px] min-w-0 flex-col"
            >
              <ConversationPanel
                turns={
                  example.empty
                    ? []
                    : [
                        {
                          ...example.turn,
                          reports: example.turn.reports.map((report) =>
                            previewAssistantReport(
                              report,
                              example.turn.question,
                            ),
                          ),
                        },
                      ]
                }
                loading={Boolean(example.loading)}
                disabled={false}
                onPrompt={setPrompt}
                reportHref={(key) => `${href("report")}#${key}`}
              />
              {prompt && (
                <p
                  role="status"
                  className="mt-4 border-t pt-4 text-sm text-muted-foreground"
                >
                  {language === "mk"
                    ? "Избрано прашање (само преглед): "
                    : "Selected prompt (preview only): "}
                  {prompt}
                </p>
              )}
            </section>
          )}
        </div>
      </main>
    </DashboardI18nProvider>
  );
}
