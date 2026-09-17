"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChartNoAxesCombined, History, Plus, LockKeyhole } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { analystError } from "@/lib/i18n/business-assistant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ConversationPanel } from "./ConversationPanel";
import { AssistantComposer } from "./AssistantComposer";

type Access = FunctionReturnType<typeof api.analyst.conversations.getAccess>;

export function AssistantPage() {
  const access = useQuery(api.analyst.conversations.getAccess);
  const { t } = useDashboardI18n();
  if (!access)
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (!access.allowed || !access.paid)
    return (
      <Empty className="m-auto max-w-xl">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {access.allowed ? <ChartNoAxesCombined /> : <LockKeyhole />}
          </EmptyMedia>
          <EmptyTitle>{t("Business assistant", "Деловен асистент")}</EmptyTitle>
          <EmptyDescription>
            {!access.allowed
              ? t(
                  "Business analysis is available to studio owners and managers.",
                  "Деловната анализа е достапна за сопственици и менаџери.",
                )
              : t(
                  "Available with OPUS Pro: answers about your appointments, service performance, repeat visits, and capacity, with reports you can inspect.",
                  "Достапно со OPUS Pro: одговори за термините, услугите, редовните клиенти и зафатеноста, со извештаи што можете да ги проверите.",
                )}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return <AssistantWorkspace key={access.orgId} access={access} />;
}

function AssistantWorkspace({ access }: { access: Access }) {
  const { t, language, locale } = useDashboardI18n();
  const conversations = useQuery(api.analyst.conversations.list);
  const [selection, setSelection] = useState<
    Id<"analyst_conversations"> | null | undefined
  >(undefined);
  const conversationId =
    selection === undefined ? conversations?.[0]?._id : selection;
  const conversation = useQuery(
    api.analyst.conversations.get,
    conversationId ? { conversationId } : "skip",
  );
  const send = useMutation(api.analyst.conversations.send);
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<"standard" | "deep">("standard");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<{
    requestId: string;
    language: "en" | "mk";
    question: string;
    depth: "standard" | "deep";
    conversationId?: Id<"analyst_conversations">;
  } | null>(null);
  const pending = submitting || access.busy;
  const exhausted = access.remaining === 0 || !access.budgetAvailable;
  const disabled = pending || exhausted || !access.configured;

  async function submit() {
    if (
      disabled ||
      !question.trim() ||
      submitting ||
      (depth === "deep" &&
        (access.deepRemaining === 0 || !access.deepBudgetAvailable))
    )
      return;
    const text = question.trim();
    if (
      !attempt.current ||
      attempt.current.language !== language ||
      attempt.current.question !== text ||
      attempt.current.depth !== depth ||
      attempt.current.conversationId !== (conversationId ?? undefined)
    ) {
      attempt.current = {
        requestId: crypto.randomUUID(),
        language,
        question: text,
        depth,
        conversationId: conversationId ?? undefined,
      };
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await send({ ...attempt.current, language });
      setSelection(result.conversationId);
      setQuestion("");
      attempt.current = null;
    } catch (cause) {
      setError(analystError(cause, language));
    } finally {
      setSubmitting(false);
    }
  }
  function choosePrompt(text: string) {
    setQuestion(text);
    setError(null);
  }
  function newConversation() {
    setSelection(null);
    setQuestion("");
    setError(null);
    attempt.current = null;
  }
  const chooseConversation = (id: Id<"analyst_conversations">) => {
    setSelection(id);
    setQuestion("");
    setError(null);
    attempt.current = null;
  };
  return (
    <section
      className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col"
      aria-label={t("Business assistant", "Деловен асистент")}
    >
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 pb-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("Business assistant", "Деловен асистент")}
            </h1>
            <Badge variant="secondary">Pro</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t(
              `${access.remaining} of ${access.limit} answers remaining`,
              `Преостанати одговори: ${access.remaining} од ${access.limit}`,
            )}{" "}
            · {t("Renews", "Се обновува")}{" "}
            {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
              access.resetAt,
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("Conversation history", "Историја на разговори")}
              >
                <History />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-80 w-72 overflow-y-auto"
            >
              <DropdownMenuGroup>
                {conversations?.length ? (
                  conversations.map((item) => (
                    <DropdownMenuItem
                      key={item._id}
                      onSelect={() => chooseConversation(item._id)}
                    >
                      <span className="truncate">{item.title}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    {t("No conversations yet", "Сè уште нема разговори")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={newConversation}
            disabled={submitting}
          >
            <Plus data-icon="inline-start" />
            {t("New chat", "Нов разговор")}
          </Button>
        </div>
      </header>
      <div className="flex h-[calc(100dvh-15rem)] min-h-96 min-w-0 flex-1 flex-col md:h-[calc(100dvh-12rem)]">
        {!access.configured && (
          <Alert>
            <AlertDescription>
              {t(
                "New analyses are temporarily unavailable. Your saved conversations and reports remain available.",
                "Новите анализи се привремено недостапни. Зачуваните разговори и извештаи остануваат достапни.",
              )}
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {exhausted && (
          <Alert>
            <AlertDescription>
              {analystError("ANALYST_ALLOWANCE_REACHED", language)}
            </AlertDescription>
          </Alert>
        )}
        <ConversationPanel
          key={conversationId ?? "new"}
          turns={conversation?.turns ?? []}
          loading={Boolean(conversationId && !conversation) || !conversations}
          disabled={disabled}
          onPrompt={choosePrompt}
        />
        <AssistantComposer
          question={question}
          setQuestion={setQuestion}
          depth={depth}
          setDepth={setDepth}
          disabled={disabled}
          pending={pending}
          deepRemaining={access.deepBudgetAvailable ? access.deepRemaining : 0}
          onSend={submit}
        />
      </div>
    </section>
  );
}
