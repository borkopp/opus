"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import type { AnalystAnswer } from "@/convex/analyst/contracts";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
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
}: {
  answer: AnalystAnswer;
  question: string;
  reports: DisplayReport[];
  turnId: Id<"analyst_turns">;
  disabled: boolean;
  onPrompt: (question: string) => void;
  reportHref?: (key: string) => string;
}) {
  const { t } = useDashboardI18n();
  const [showSupporting, setShowSupporting] = useState(false);
  const primary =
    reports.find((report) => report.key === answer.reportKeys[0]) ?? reports[0];
  const supporting = reports.filter((report) => report !== primary);
  const supportingWarnings = [
    ...new Set(supporting.flatMap((report) => report.warnings)),
  ].filter((warning) => !primary?.warnings.includes(warning));
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <AnswerText text={answer.text} />
      {primary && (
        <AnalysisReport
          report={primary}
          question={question}
          turnId={turnId}
          href={reportHref?.(primary.key)}
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
      {answer.followUps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {answer.followUps.map((followUp) => (
            <Button
              key={followUp}
              variant="outline"
              size="sm"
              className="h-auto whitespace-normal py-2 text-left"
              disabled={disabled}
              onClick={() => onPrompt(followUp)}
            >
              {followUp}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function AnswerText({ text }: { text: string }) {
  const { t } = useDashboardI18n();
  if (text.length <= 650)
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    );
  const paragraph = text.indexOf("\n\n");
  const breakAt =
    paragraph > 0 && paragraph < 500 ? paragraph : text.lastIndexOf(" ", 450);
  const split = breakAt > 0 ? breakAt : 450;
  return (
    <div className="flex flex-col gap-2">
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {text.slice(0, split)}
        {paragraph === split ? "" : "…"}
      </p>
      <Disclosure
        title={t(
          "Read the rest",
          "Прочитајте го остатокот",
          "Lexoni pjesën tjetër",
        )}
        className="border-0 [&>summary]:px-0 [&>summary]:py-1 [&>div]:px-0 [&>div]:pt-3 [&>div]:pb-0"
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {text.slice(split).trimStart()}
        </p>
      </Disclosure>
    </div>
  );
}
