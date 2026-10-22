"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Lightbulb } from "lucide-react";
import type { AnalystAnswer } from "@/convex/analyst/contracts";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Disclosure } from "@/components/ui/disclosure";
import { AssistantAnswerText } from "./AssistantAnswerText";
import { AssistantMessageActions } from "./AssistantMessageActions";
import { AssistantSuggestions } from "./AssistantSuggestions";
import { AnalysisReport, type DisplayReport } from "./AnalysisReport";
import { ReportWarnings } from "./ReportWarnings";

export function AssistantResponse({
  answer,
  question,
  reports,
  turnId,
  disabled,
  onPrompt,
  reportHref,
  onOpenReport,
  streaming = false,
  streamedText,
}: {
  answer?: AnalystAnswer;
  question: string;
  reports: DisplayReport[];
  turnId: Id<"analyst_turns">;
  disabled: boolean;
  onPrompt: (question: string) => void;
  reportHref?: (key: string) => string;
  onOpenReport?: (key: string) => void;
  streaming?: boolean;
  streamedText?: string;
}) {
  const { t } = useDashboardI18n();
  const [showSupporting, setShowSupporting] = useState(false);
  const [startedStreaming] = useState(streaming);
  const reducedMotion = useReducedMotion();
  const text = streaming ? (streamedText ?? "") : (answer?.text ?? "");
  const primary =
    reports.find((report) => report.key === answer?.reportKeys[0]) ??
    reports[0];
  const supporting = reports.filter((report) => report !== primary);
  const supportingWarnings = [
    ...new Set(supporting.flatMap((report) => report.warnings)),
  ].filter((warning) => !primary?.warnings.includes(warning));
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-busy={streaming}>
      <AssistantAnswerText text={text} streaming={streaming} />
      {streaming && (
        <p
          role="status"
          data-replay-public
          className={text ? "sr-only" : "text-sm text-muted-foreground"}
        >
          <span className="shimmer motion-reduce:shimmer-none">
            {text
              ? t(
                  "Writing your answer…",
                  "Го пишуваме вашиот одговор…",
                  "Duke shkruar përgjigjen tuaj…",
                )
              : t(
                  "Reviewing your appointments…",
                  "Ги анализираме вашите термини…",
                  "Duke shqyrtuar terminet tuaja…",
                )}
          </span>
        </p>
      )}
      {!streaming && answer && (
        <motion.div
          initial={
            startedStreaming && reducedMotion === false
              ? { opacity: 0, y: 4 }
              : false
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}
          className="flex min-w-0 flex-col gap-4"
        >
          {primary && (
            <AnalysisReport
              report={primary}
              question={question}
              turnId={turnId}
              href={reportHref?.(primary.key)}
              onOpenReport={
                onOpenReport ? () => onOpenReport(primary.key) : undefined
              }
            />
          )}
          <ReportWarnings warnings={supportingWarnings} />
          {supporting.length > 0 && (
            <Disclosure
              title={`${t("Supporting reports", "Дополнителни извештаи", "Raporte mbështetëse")} (${supporting.length})`}
              onToggle={(event) => setShowSupporting(event.currentTarget.open)}
            >
              {showSupporting &&
                supporting.map((report) => (
                  <AnalysisReport
                    key={report.key}
                    report={report}
                    question={question}
                    turnId={turnId}
                    href={reportHref?.(report.key)}
                    onOpenReport={
                      onOpenReport ? () => onOpenReport(report.key) : undefined
                    }
                  />
                ))}
            </Disclosure>
          )}
          {answer.recommendations.map((recommendation, index) => (
            <section
              key={index}
              className="flex flex-col gap-3 rounded-xl bg-accent/40 p-4 sm:p-5"
            >
              <p className="flex items-center gap-2 text-xs font-medium text-accent-foreground">
                <Lightbulb aria-hidden className="size-3.5" />
                {t(
                  "Suggested experiment",
                  "Предложен експеримент",
                  "Eksperiment i sugjeruar",
                )}
              </p>
              <p className="text-sm font-medium leading-relaxed">
                {recommendation.suggestion}
              </p>
              <Disclosure
                title={t(
                  "Why this & how to measure it",
                  "Зошто и како да го измерите",
                  "Pse dhe si ta matni",
                )}
                className="rounded-none border-0 [&>summary]:px-0 [&>summary]:py-1 [&>summary]:text-muted-foreground [&>div]:px-0 [&>div]:pt-3 [&>div]:pb-0"
              >
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {recommendation.evidence}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {t("Measure", "Измерете", "Matni")}:{" "}
                  </span>
                  {recommendation.measurement}
                </p>
              </Disclosure>
            </section>
          ))}
          <AssistantMessageActions
            text={answer.text}
            reportHref={
              primary
                ? (reportHref?.(primary.key) ??
                  `/beauty/assistant/reports/${turnId}#${primary.key}`)
                : undefined
            }
            onOpenReport={
              primary && onOpenReport
                ? () => onOpenReport(primary.key)
                : undefined
            }
          />
          {answer.followUps.length > 0 && (
            <AssistantSuggestions
              prompts={answer.followUps}
              disabled={disabled}
              onPrompt={onPrompt}
            />
          )}
        </motion.div>
      )}
    </div>
  );
}
