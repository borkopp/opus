"use client";

import { Fragment } from "react";
import {
  ChartNoAxesCombined,
  CalendarDays,
  Users,
  TrendingDown,
  LoaderCircle,
} from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { AnalysisReport } from "@/components/business-assistant/AnalysisReport";
import { analystError } from "@/lib/i18n/business-assistant";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

type Turn = FunctionReturnType<
  typeof api.analyst.conversations.get
>["turns"][number];

export function ConversationPanel({
  turns,
  loading,
  disabled,
  onPrompt,
}: {
  turns: Turn[];
  loading: boolean;
  disabled: boolean;
  onPrompt: (question: string) => void;
}) {
  const { t, language } = useDashboardI18n();
  const examples = [
    {
      icon: TrendingDown,
      question: t(
        "What was my weakest day last month?",
        "Кој ми беше најслабиот ден минатиот месец?",
      ),
    },
    {
      icon: ChartNoAxesCombined,
      question: t(
        "How did last month compare with the month before?",
        "Каков беше минатиот месец во споредба со претходниот?",
      ),
    },
    {
      icon: CalendarDays,
      question: t(
        "Which services had the most cancellations last month?",
        "Кои услуги имаа најмногу откажувања минатиот месец?",
      ),
    },
    {
      icon: Users,
      question: t(
        "How many of my clients returned last month?",
        "Колку од моите клиенти се вратија минатиот месец?",
      ),
    },
  ];
  if (loading)
    return (
      <div className="flex flex-1 flex-col gap-6 py-8">
        <Skeleton className="ml-auto h-16 w-2/3" />
        <Skeleton className="h-36 w-4/5" />
      </div>
    );
  if (!turns.length)
    return (
      <Empty className="justify-start overflow-y-auto px-2 py-4 sm:justify-center sm:px-6">
        <EmptyHeader className="shrink-0">
          <EmptyMedia variant="icon">
            <ChartNoAxesCombined />
          </EmptyMedia>
          <EmptyTitle>
            {t("Understand your studio", "Запознајте го вашето студио")}
          </EmptyTitle>
          <EmptyDescription>
            {t(
              "Turn your appointment history into clear answers and practical next steps.",
              "Претворете ја историјата на термините во јасни одговори и практични следни чекори.",
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="max-w-2xl shrink-0">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {examples.map(({ icon: Icon, question }) => (
              <Button
                key={question}
                variant="outline"
                className="h-auto min-h-20 justify-start whitespace-normal p-4 text-left"
                disabled={disabled}
                onClick={() => onPrompt(question)}
              >
                <Icon data-icon="inline-start" />
                <span>{question}</span>
              </Button>
            ))}
          </div>
        </EmptyContent>
      </Empty>
    );
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
      <MessageScroller className="flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent className="py-6 pr-1">
            {turns.map((turn) => (
              <Fragment key={turn._id}>
                <MessageScrollerItem
                  messageId={`${turn._id}-question`}
                  scrollAnchor
                >
                  <Message align="end">
                    <MessageContent>
                      <Bubble variant="secondary" align="end">
                        <BubbleContent className="whitespace-pre-wrap">
                          {turn.question}
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
                <MessageScrollerItem messageId={`${turn._id}-answer`}>
                  <Message>
                    <MessageContent>
                      <MessageHeader>
                        {t(
                          "OPUS · Business assistant",
                          "OPUS · Деловен асистент",
                        )}
                      </MessageHeader>
                      {turn.status === "pending" ||
                      turn.status === "running" ? (
                        <p
                          role="status"
                          className="flex items-center gap-2 px-3 text-sm text-muted-foreground"
                        >
                          <LoaderCircle className="size-4 motion-safe:animate-spin" />
                          {t(
                            "Reviewing your appointments…",
                            "Ги анализираме вашите термини…",
                          )}
                        </p>
                      ) : turn.status === "failed" ? (
                        <Alert>
                          <AlertDescription className="flex flex-col items-start gap-3">
                            {analystError(turn.errorCode, language)}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={disabled}
                              onClick={() => onPrompt(turn.question)}
                            >
                              {t("Ask again", "Прашајте повторно")}
                            </Button>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        turn.answer && (
                          <>
                            <Bubble variant="ghost">
                              <BubbleContent className="whitespace-pre-wrap">
                                {turn.answer.text}
                              </BubbleContent>
                            </Bubble>
                            {turn.reports.length > 0 && (
                              <div className="grid min-w-0 gap-3 xl:grid-cols-2">
                                {turn.reports.map((report) => (
                                  <AnalysisReport
                                    key={report.key}
                                    report={report}
                                    turnId={turn._id}
                                  />
                                ))}
                              </div>
                            )}
                            {turn.answer.recommendations.map(
                              (recommendation, index) => (
                                <div
                                  key={index}
                                  className="flex flex-col gap-2 border-l-2 border-primary/30 py-1 pl-4"
                                >
                                  <p className="text-sm font-medium">
                                    {recommendation.suggestion}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {recommendation.evidence}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {t("Measure", "Измерете")}:{" "}
                                    {recommendation.measurement}
                                  </p>
                                </div>
                              ),
                            )}
                            <div className="flex flex-wrap gap-2">
                              {turn.answer.followUps.map((question) => (
                                <Button
                                  key={question}
                                  variant="outline"
                                  size="sm"
                                  className="h-auto whitespace-normal py-2 text-left"
                                  disabled={disabled}
                                  onClick={() => onPrompt(question)}
                                >
                                  {question}
                                </Button>
                              ))}
                            </div>
                          </>
                        )
                      )}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              </Fragment>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton
          aria-label={t("Go to latest answer", "До последниот одговор")}
        />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
