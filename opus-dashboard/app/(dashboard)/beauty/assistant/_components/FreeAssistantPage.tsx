"use client";

import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import { AssistantChatWorkspace } from "@/components/business-assistant/AssistantChatWorkspace";
import { AssistantComposer } from "@/components/business-assistant/AssistantComposer";
import styles from "./free-assistant.module.css";

export function FreeAssistantPage({ account }: { account?: ReactNode }) {
  const { t } = useDashboardI18n();
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<"standard" | "deep">("standard");
  const [questions, setQuestions] = useState<
    Array<{ prompt: string; reply: string; visible: number; complete: boolean }>
  >([]);
  const [streaming, setStreaming] = useState(false);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  const transcript = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [questions]);
  function submit() {
    const prompt = question.trim();
    if (!prompt || prompt.length > 2000 || busy.current) return;
    const reply = t(
      "This feature is available with OPUS Pro. Upgrade to get answers about your studio, backed by your business data.",
      "Оваа функција е достапна со OPUS Pro. Надгради за да добиваш одговори за студиото врз основа на податоците од твоето работење.",
      "Kjo veçori është e disponueshme me OPUS Pro. Përmirësoni për të marrë përgjigje rreth studios suaj, bazuar në të dhënat e biznesit tuaj.",
    );
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setQuestions((current) => [
      ...current,
      {
        prompt,
        reply,
        visible: reducedMotion ? reply.length : 0,
        complete: reducedMotion,
      },
    ]);
    setQuestion("");
    if (reducedMotion) return;
    busy.current = true;
    setStreaming(true);
    let visible = 0;
    const reveal = () => {
      visible = Math.min(reply.length, visible + 3);
      const complete = visible === reply.length;
      setQuestions((current) =>
        current.map((turn, index) =>
          index === current.length - 1 ? { ...turn, visible, complete } : turn,
        ),
      );
      if (complete) {
        busy.current = false;
        setStreaming(false);
        timer.current = null;
      } else {
        timer.current = setTimeout(reveal, 28);
      }
    };
    timer.current = setTimeout(reveal, 400);
  }
  function newConversation() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    busy.current = false;
    setStreaming(false);
    setQuestions([]);
    setQuestion("");
  }
  return (
    <AssistantChatWorkspace
      conversations={[]}
      onSelect={() => {}}
      onNew={newConversation}
      paid={false}
      account={account}
      isEmpty={questions.length === 0}
      onPrompt={setQuestion}
      promptDisabled={streaming}
      composer={
        <AssistantComposer
          question={question}
          setQuestion={setQuestion}
          depth={depth}
          setDepth={setDepth}
          disabled={false}
          pending={streaming}
          deepRemaining={null}
          onSend={submit}
        />
      }
    >
      <div
        ref={transcript}
        role="log"
        aria-live="polite"
        aria-busy={streaming}
        aria-label={t("Conversation", "Разговор", "Biseda")}
        className="flex max-h-[55dvh] flex-1 flex-col gap-6 overflow-y-auto py-6 pr-1"
      >
        {questions.map((turn, index) => (
          <div
            key={index}
            className={`flex flex-col gap-4 ${styles.messageEnter}`}
          >
            <Message align="end">
              <MessageContent>
                <Bubble variant="secondary" align="end">
                  <BubbleContent className="whitespace-pre-wrap">
                    {turn.prompt}
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
            <Message>
              <MessageContent>
                <MessageHeader>
                  {t(
                    "OPUS · AI Assistant",
                    "OPUS · AI асистент",
                    "OPUS · Asistenti AI",
                  )}
                </MessageHeader>
                <Bubble variant="muted">
                  <BubbleContent>
                    <p>
                      {turn.visible === 0 && !turn.complete ? (
                        <span
                          className={styles.typing}
                          aria-label={t("Typing…", "Пишува…", "Duke shkruar…")}
                        >
                          <i />
                          <i />
                          <i />
                        </span>
                      ) : (
                        <>
                          {turn.reply.slice(0, turn.visible)}
                          {!turn.complete && (
                            <span
                              className={styles.cursor}
                              aria-hidden="true"
                            />
                          )}
                        </>
                      )}
                    </p>
                    {turn.complete && (
                      <a
                        data-replay-public
                        href="https://opus.mk/#pricing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-3 inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4 ${styles.messageEnter}`}
                      >
                        {t(
                          "Learn more about OPUS Pro",
                          "Дознај повеќе за OPUS Pro",
                          "Mësoni më shumë rreth OPUS Pro",
                        )}
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </a>
                    )}
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          </div>
        ))}
      </div>
    </AssistantChatWorkspace>
  );
}
