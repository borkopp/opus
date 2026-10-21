"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Brain,
  ChartNoAxesCombined,
  Copy,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { AssistantResponse } from "@/components/business-assistant/AssistantResponse";
import { AssistantComposer } from "@/components/business-assistant/AssistantComposer";
import { Logo, LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import dashboard from "@/components/dashboard/clarity.module.css";
import { previewAssistantReport } from "@/lib/assistant-report-presentation";
import { prompts, sampleQuestion } from "../_lib/design-data";
import { useDesign } from "./design-workspace";
import s from "../designs.module.css";

export function Brand({ compact = false }: { compact?: boolean }) {
  return compact ? (
    <LogoMark className="h-7 text-current" />
  ) : (
    <Logo className={dashboard.brand} markClassName={dashboard.brandMark} />
  );
}
export function IconButton({
  children,
  label,
  onClick,
  className = "",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={`${s.iconButton} ${className}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}
export function Profile() {
  return (
    <div className={s.profile}>
      <span className={s.avatar}>AL</span>
      <div>
        <strong>Atelier Luna</strong>
        <span>Studio workspace</span>
      </div>
      <Badge variant="pro">Pro</Badge>
    </div>
  );
}
export function Composer({ large = false }: { large?: boolean }) {
  const { variant, question, setQuestion, deep, setDeep, send, busy } =
    useDesign();
  if (variant === "chat")
    return (
      <AssistantComposer
        question={question}
        setQuestion={setQuestion}
        depth={deep ? "deep" : "standard"}
        setDepth={(value) => setDeep(value === "deep")}
        disabled={busy}
        pending={busy}
        deepRemaining={8}
        onSend={() => send()}
      />
    );
  return (
    <form
      className={s.composer}
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <textarea
        aria-label="Message the assistant"
        placeholder="Ask anything about your studio…"
        value={question}
        rows={large ? 3 : 2}
        maxLength={2000}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            send();
          }
        }}
      />
      <div className={s.composerBottom}>
        <button
          type="button"
          className={s.depthToggle}
          aria-pressed={deep}
          onClick={() => setDeep(!deep)}
        >
          <Brain size={16} />
          {deep ? "Think deeper" : "Quick answer"}
        </button>
        <button
          type="submit"
          className={s.sendButton}
          disabled={!question.trim() || busy}
          aria-label="Send message"
        >
          <ArrowUp size={20} />
        </button>
      </div>
    </form>
  );
}
export function ComposerFootnote() {
  return (
    <p className={s.composerFootnote}>
      Sample data · Answers stay in this preview
    </p>
  );
}
export function PromptList({ detailed = false }: { detailed?: boolean }) {
  const { send, busy } = useDesign();
  const icons = [ChartNoAxesCombined, MessageSquare, Sparkles, Search];
  return (
    <div className={s.promptList}>
      {prompts.map((prompt, index) => {
        const Icon = icons[index];
        return (
          <button
            key={prompt.exampleId}
            type="button"
            disabled={busy}
            onClick={() => send(sampleQuestion(prompt.exampleId))}
          >
            <Icon size={17} />
            <span>
              <strong>{prompt.label}</strong>
              {detailed && <small>{prompt.detail}</small>}
            </span>
            {detailed && <ArrowUpRight size={16} />}
          </button>
        );
      })}
    </div>
  );
}
export function HistoryList({
  search = "",
  limit,
}: {
  search?: string;
  limit?: number;
}) {
  const { chats, selected, selectChat } = useDesign();
  const visible = chats
    .filter((chat) =>
      `${chat.title} ${chat.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .slice(0, limit);
  return (
    <div className={s.historyList}>
      {!visible.length && (
        <p className={s.noResults}>
          No conversations found. Try another search.
        </p>
      )}
      {["Today", "Yesterday", "Last 7 days"].map((date) => {
        const group = visible.filter((chat) => chat.date === date);
        return group.length ? (
          <div key={date}>
            <p className={s.historyDate}>{date}</p>
            {group.map((chat) => (
              <Button
                type="button"
                variant="ghost"
                key={chat.id}
                aria-current={selected?.id === chat.id ? "true" : undefined}
                onClick={() => selectChat(chat.id)}
              >
                <MessageSquare size={15} />
                <span>{chat.title}</span>
              </Button>
            ))}
          </div>
        ) : null;
      })}
    </div>
  );
}
export function NewChatButton() {
  const { newChat } = useDesign();
  return (
    <Button type="button" className={s.newChatButton} onClick={newChat}>
      <Plus size={17} />
      New conversation
    </Button>
  );
}
export function Thread({
  detachedReports = false,
}: {
  detachedReports?: boolean;
}) {
  const { selected, busy, send, openReport, copy, notice } = useDesign();
  const lastQuestion = useRef<HTMLDivElement>(null);
  const count = selected?.turns.length ?? 0;
  useEffect(() => {
    if (count > 1)
      lastQuestion.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
  }, [count]);
  return (
    <div className={s.thread}>
      {selected?.turns.map((turn, index) => (
        <div className={s.turn} key={turn._id}>
          <div
            ref={index === count - 1 ? lastQuestion : undefined}
            className={s.userMessage}
          >
            <span>{turn.question}</span>
          </div>
          <div className={s.assistantLabel}>
            <span className={s.assistantMark}>
              <Sparkles size={15} />
            </span>
            <strong>OPUS Assistant</strong>
            <span>Sample answer</span>
          </div>
          {turn.answer && (
            <div className={s.response}>
              <AssistantResponse
                answer={turn.answer}
                question={turn.question}
                turnId={turn._id}
                reports={
                  detachedReports
                    ? []
                    : turn.reports.map((report) =>
                        previewAssistantReport(report, turn.question),
                      )
                }
                disabled={busy}
                onPrompt={send}
                onOpenReport={() => openReport(turn)}
              />
            </div>
          )}
          <div className={s.answerActions}>
            <IconButton
              label="Copy answer"
              onClick={() => copy(turn.answer?.text ?? "")}
            >
              <Copy size={14} />
            </IconButton>
            {detachedReports && turn.reports.length > 0 && (
              <button type="button" onClick={() => openReport(turn)}>
                View full report <ArrowUpRight size={13} />
              </button>
            )}
          </div>
        </div>
      ))}
      {busy && (
        <div className={s.thinking} role="status">
          <span className={s.assistantMark}>
            <Sparkles size={15} />
          </span>
          Preparing a sample response<span className={s.thinkingDots}>…</span>
        </div>
      )}
      {notice && (
        <p className={s.copyNotice} role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton label="Close conversation" onClick={onClick}>
      <X size={18} />
    </IconButton>
  );
}
