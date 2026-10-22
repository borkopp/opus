"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { analystError } from "@/lib/i18n/business-assistant";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ConversationPanel } from "@/components/business-assistant/ConversationPanel";
import { AssistantComposer } from "@/components/business-assistant/AssistantComposer";
import { AssistantChatWorkspace } from "@/components/business-assistant/AssistantChatWorkspace";
import { DashboardAccountMenu } from "@/components/dashboard/DashboardAccountMenu";

type Access = FunctionReturnType<typeof api.analyst.conversations.getAccess>;

export function AssistantPage() {
  const access = useQuery(api.analyst.conversations.getAccess);
  const profile = useQuery(api.users.getMyProfile);
  const { t } = useDashboardI18n();
  if (!access)
    return (
      <div className="flex min-h-dvh flex-col gap-6 p-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (!access.allowed)
    return (
      <Empty className="m-auto min-h-dvh max-w-xl">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LockKeyhole />
          </EmptyMedia>
          <EmptyTitle>
            {t("AI Assistant", "AI асистент", "Asistenti AI")}
          </EmptyTitle>
          <EmptyDescription>
            {t(
              "Business analysis is available to studio owners and managers.",
              "Деловната анализа е достапна за сопственици и менаџери.",
              "Analiza e biznesit është e disponueshme për pronarët dhe menaxherët e studios.",
            )}
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" asChild>
          <Link href="/beauty">
            <ArrowLeft />
            {t("Back to studio", "Назад кон студиото", "Kthehu te studioja")}
          </Link>
        </Button>
      </Empty>
    );
  const account = profile ? (
    <DashboardAccountMenu profile={profile} />
  ) : undefined;
  return (
    <AssistantWorkspace key={access.orgId} access={access} account={account} />
  );
}

function AssistantWorkspace({
  access,
  account,
}: {
  access: Access;
  account?: ReactNode;
}) {
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
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [selectedDepth, setDepth] = useState<"standard" | "deep">("standard");
  const depth = access.paid ? selectedDepth : "standard";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<{
    requestId: string;
    language: "en" | "mk";
    question: string;
    depth: "standard" | "deep";
    conversationId?: Id<"analyst_conversations">;
  } | null>(null);
  const attemptInFlight = useRef(false);
  const pending = submitting || access.busy;
  const exhausted = access.remaining === 0 || !access.budgetAvailable;
  const disabled = pending || exhausted || !access.configured;

  async function submit() {
    if (
      disabled ||
      !question.trim() ||
      submitting ||
      attemptInFlight.current ||
      (depth === "deep" &&
        (access.deepRemaining === 0 || !access.deepBudgetAvailable))
    )
      return;
    const text = question.trim();
    const analystLanguage: "en" | "mk" = language === "mk" ? "mk" : "en";
    if (
      !attempt.current ||
      attempt.current.language !== analystLanguage ||
      attempt.current.question !== text ||
      attempt.current.depth !== depth ||
      attempt.current.conversationId !== (conversationId ?? undefined)
    ) {
      attempt.current = {
        requestId: crypto.randomUUID(),
        language: analystLanguage,
        question: text,
        depth,
        conversationId: conversationId ?? undefined,
      };
    }
    attemptInFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await send({
        ...attempt.current,
        language: analystLanguage,
      });
      setSelection(result.conversationId);
      setQuestion("");
      attempt.current = null;
    } catch (cause) {
      setError(analystError(cause, language));
    } finally {
      attemptInFlight.current = false;
      setSubmitting(false);
    }
  }
  function choosePrompt(text: string) {
    setQuestion(text);
    setError(null);
    composerRef.current?.focus({ preventScroll: true });
  }
  function newConversation() {
    if (attemptInFlight.current) return;
    setSelection(null);
    setQuestion("");
    setError(null);
    attempt.current = null;
  }
  const chooseConversation = (id: string) => {
    if (attemptInFlight.current) return;
    setSelection(id as Id<"analyst_conversations">);
    setQuestion("");
    setError(null);
    attempt.current = null;
  };
  const loading = Boolean(conversationId && !conversation) || !conversations;
  return (
    <AssistantChatWorkspace
      conversations={conversations?.map((item) => ({
        id: item._id,
        title: item.title,
        updatedAt: item.updatedAt,
      }))}
      selectedId={conversationId}
      onSelect={chooseConversation}
      onNew={newConversation}
      navigationDisabled={submitting}
      paid={access.paid}
      usage={access}
      account={account}
      isEmpty={!loading && !conversation?.turns.length}
      onPrompt={choosePrompt}
      promptDisabled={disabled}
      notices={
        <>
          {!access.configured && (
            <Alert>
              <AlertDescription data-replay-public>
                {t(
                  "New analyses are temporarily unavailable. Your saved conversations and reports remain available.",
                  "Новите анализи се привремено недостапни. Зачуваните разговори и извештаи остануваат достапни.",
                  "Analizat e reja janë përkohësisht të padisponueshme. Bisedat dhe raportet tuaja të ruajtura mbeten të disponueshme.",
                )}
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {exhausted && !pending && (
            <Alert>
              <AlertDescription>
                {analystError("ANALYST_ALLOWANCE_REACHED", language)}
                <span>
                  {t("Renews", "Се обновува", "Rinovohet")}{" "}
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                  }).format(access.resetAt)}
                </span>
                {!access.paid && (
                  <Link
                    href="https://opus.mk/#pricing"
                    className="font-medium underline underline-offset-4"
                  >
                    {t(
                      "Upgrade to OPUS Pro for more answers and Detailed mode.",
                      "Надгради на OPUS Pro за повеќе одговори и детална анализа.",
                      "Përmirëso në OPUS Pro për më shumë përgjigje dhe modalitetin e detajuar.",
                    )}
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          )}
        </>
      }
      composer={
        <AssistantComposer
          inputRef={composerRef}
          question={question}
          setQuestion={setQuestion}
          depth={depth}
          setDepth={setDepth}
          disabled={disabled}
          pending={pending}
          deepRemaining={access.deepBudgetAvailable ? access.deepRemaining : 0}
          detailedAllowed={access.paid}
          onSend={submit}
        />
      }
    >
      <ConversationPanel
        key={conversationId ?? "new"}
        turns={conversation?.turns ?? []}
        loading={Boolean(conversationId && !conversation) || !conversations}
        disabled={disabled}
        onPrompt={choosePrompt}
      />
    </AssistantChatWorkspace>
  );
}
