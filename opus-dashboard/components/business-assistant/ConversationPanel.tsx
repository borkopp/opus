"use client";

import { Fragment } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { useAssistantPrompts } from "@/hooks/use-assistant-prompts";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { AssistantResponse } from "@/components/business-assistant/AssistantResponse";
import type { DisplayReport } from "./AnalysisReport";
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

type QueriedTurn = FunctionReturnType<
  typeof api.analyst.conversations.get
>["turns"][number];

export type AssistantTurn = Omit<QueriedTurn, "reports"> & {
  reports: DisplayReport[];
};

export function ConversationPanel({
  turns,
  loading,
  disabled,
  onPrompt,
  reportHref,
  onOpenReport,
}: {
  turns: AssistantTurn[];
  loading: boolean;
  disabled: boolean;
  onPrompt: (question: string) => void;
  reportHref?: (reportKey: string) => string;
  onOpenReport?: (turn: AssistantTurn) => void;
}) {
  const { t, language } = useDashboardI18n();
  const examples = useAssistantPrompts();
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
            {t(
              "Understand your studio",
              "Запознајте го вашето студио",
              "Kuptoni studion tuaj",
            )}
          </EmptyTitle>
          <EmptyDescription>
            {t(
              "Turn your appointment history into clear answers and practical next steps.",
              "Претворете ја историјата на термините во јасни одговори и практични следни чекори.",
              "Ktheni historinë e termineve në përgjigje të qarta dhe hapa praktikë të radhës.",
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="max-w-2xl shrink-0">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {examples.map(({ icon: Icon, question }) => (
              <Button
                key={question}
                variant="outline"
                className="dashboard-assistant-prompt h-auto min-h-20 justify-start whitespace-normal p-4 text-left"
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
        <MessageScrollerViewport
          tabIndex={0}
          aria-label={t("Conversation", "Разговор", "Bisedë")}
        >
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
                          "OPUS · AI Assistant",
                          "OPUS · AI асистент",
                          "OPUS · Asistenti AI",
                        )}
                      </MessageHeader>
                      {turn.status === "failed" ? (
                        <Alert>
                          <AlertDescription className="flex flex-col items-start gap-3">
                            {analystError(turn.errorCode, language)}
                            <Button
                              data-replay-public
                              variant="outline"
                              size="sm"
                              disabled={disabled}
                              onClick={() => onPrompt(turn.question)}
                            >
                              {t(
                                "Ask again",
                                "Прашајте повторно",
                                "Pyesni përsëri",
                              )}
                            </Button>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <AssistantResponse
                          answer={turn.answer}
                          streaming={
                            turn.status === "pending" ||
                            turn.status === "running"
                          }
                          streamedText={turn.streamedText}
                          question={turn.question}
                          reports={turn.reports}
                          turnId={turn._id}
                          disabled={disabled}
                          onPrompt={onPrompt}
                          reportHref={reportHref}
                          onOpenReport={
                            onOpenReport ? () => onOpenReport(turn) : undefined
                          }
                        />
                      )}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              </Fragment>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton
          className="size-11 sm:size-9"
          aria-label={t(
            "Go to latest answer",
            "До последниот одговор",
            "Shko te përgjigjja më e fundit",
          )}
        />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
