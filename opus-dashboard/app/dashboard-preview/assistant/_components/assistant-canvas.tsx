"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnalysisReport } from "@/components/business-assistant/AnalysisReport";
import { ConversationPanel } from "@/components/business-assistant/ConversationPanel";
import { AssistantComposer } from "@/components/business-assistant/AssistantComposer";
import { DashboardI18nProvider } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { previewAssistantReport } from "@/lib/assistant-report-presentation";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import { cn } from "@/lib/utils";
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
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [depth, setDepth] = useState<"standard" | "deep">("standard");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [streamWords, setStreamWords] = useState(0);
  const [replay, setReplay] = useState(0);
  const streamingExample = example.id.startsWith("streaming");
  const freePreview = example.id === "streaming-free";
  const words = example.turn.answer?.text.match(/\S+\s*/g) ?? [];
  const streaming = streamingExample && streamWords < words.length;
  useEffect(() => {
    if (!streamingExample) return;
    let visible = 0;
    const timer = setInterval(() => {
      visible = Math.min(words.length, visible + 5);
      setStreamWords(visible);
      if (visible === words.length) clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, [streamingExample, words.length, replay]);
  const turn = streaming
    ? {
        ...example.turn,
        status: "running" as const,
        streamedText: words.slice(0, streamWords).join(""),
        answer: undefined,
        reports: [],
      }
    : example.turn;
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
        className={cn(
          "dashboard-shell min-h-dvh bg-background p-4 text-foreground sm:p-8",
          !showReports && "h-dvh overflow-hidden",
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-5xl flex-col gap-5",
            !showReports && "h-full min-h-0",
          )}
        >
          <p className="text-xs text-muted-foreground">
            {language === "mk"
              ? "Примерни податоци · Преглед на дизајн"
              : "Sample data · Design preview"}
          </p>
          {streamingExample && !showReports && (
            <Button
              variant="outline"
              className="shrink-0 self-start"
              onClick={() => {
                setStreamWords(0);
                setReplay((value) => value + 1);
              }}
            >
              {language === "mk" ? "Повтори го стримингот" : "Replay streaming"}
            </Button>
          )}
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
              className="dashboard-assistant-surface flex min-h-0 min-w-0 flex-1 flex-col"
            >
              <ConversationPanel
                turns={
                  example.empty
                    ? []
                    : [
                        {
                          ...turn,
                          reports: turn.reports.map((report) =>
                            previewAssistantReport(
                              report,
                              example.turn.question,
                            ),
                          ),
                        },
                      ]
                }
                loading={Boolean(example.loading)}
                disabled={streaming}
                onPrompt={(question) => {
                  setPrompt(question);
                  composerRef.current?.focus({ preventScroll: true });
                }}
                reportHref={(key) => `${href("report")}#${key}`}
              />
              <AssistantComposer
                inputRef={composerRef}
                question={prompt}
                setQuestion={setPrompt}
                depth={depth}
                setDepth={setDepth}
                disabled={streaming}
                pending={streaming}
                deepRemaining={freePreview ? 0 : 20}
                detailedAllowed={!freePreview}
                onSend={() => {
                  if (streaming || !prompt.trim()) return;
                  setSubmittedPrompt(prompt.trim());
                  setPrompt("");
                }}
              />
              {submittedPrompt && (
                <p
                  role="status"
                  className="mt-4 border-t pt-4 text-sm text-muted-foreground"
                >
                  {language === "mk"
                    ? "Избрано прашање (само преглед): "
                    : "Selected prompt (preview only): "}
                  {submittedPrompt}
                </p>
              )}
            </section>
          )}
        </div>
      </main>
    </DashboardI18nProvider>
  );
}
