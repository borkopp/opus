"use client";

// Main marketplace chat component — owns the conversation state,
// calls /api/chat for streaming, and renders messages + business cards.

import { useState, useRef, useEffect, useCallback } from "react";
import { useSessionId } from "@/hooks/use-session-id";
import { useResolveCity } from "@/hooks/use-resolve-city";
import { MessageStream, ChatMessage } from "@/components/chat/MessageStream";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { Recommendation } from "@/components/chat/BusinessCard";

const RATE_LIMIT_PER_SESSION = 30;
const MAX_QUERY_LENGTH = 500;

const SUGGESTIONS = [
  { label: "Date night 🌙", query: "date night with my girlfriend tonight" },
  { label: "Quick haircut 💈", query: "haircut available now" },
  { label: "Relaxing spa 🧖", query: "couples spa this evening" },
  { label: "Birthday treat 🎂", query: "birthday pampering today" },
];

type SSEChunk =
  | { type: "text"; text: string }
  | { type: "recommendations"; data: Recommendation[] }
  | { type: "done"; conversationId?: string }
  | { type: "error"; message: string };

function newId() {
  return Math.random().toString(36).slice(2);
}

function getDayPeriod(): { label: string; heroTail: string } {
  const now = new Date();
  const h = now.getHours();
  const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    now.getDay()
  ];
  if (h < 12) return { label: `${day} morning`, heroTail: "go this morning?" };
  if (h < 17) return { label: `${day} afternoon`, heroTail: "go this afternoon?" };
  return { label: `${day} evening`, heroTail: "go tonight?" };
}

interface Props {
  onFirstMessage?: () => void;
}

export function MarketplaceChat({ onFirstMessage }: Props) {
  const sessionId = useSessionId();
  const { city, coords } = useResolveCity();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;
  const { label: dayLabel, heroTail } = getDayPeriod();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!sessionId || isLoading) return;
      if (messageCount >= RATE_LIMIT_PER_SESSION) return;

      const trimmed = text.trim().slice(0, MAX_QUERY_LENGTH);
      if (!trimmed) return;

      if (messages.length === 0) {
        onFirstMessage?.();
      }

      setMessageCount((c) => c + 1);

      const userMsg: ChatMessage = { id: newId(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);

      const assistantId = newId();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", isStreaming: true },
      ]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trimmed,
            sessionId,
            city,
            coords: coords ?? undefined,
            locale: navigator.language?.startsWith("mk") ? "mk" : "en",
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedText = "";
        let recs: Recommendation[] | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const chunk: SSEChunk = JSON.parse(raw);
              if (chunk.type === "text") {
                streamedText += chunk.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: streamedText } : m,
                  ),
                );
              } else if (chunk.type === "recommendations") {
                recs = chunk.data;
              } else if (chunk.type === "error") {
                throw new Error(chunk.message);
              }
            } catch {
              // Malformed chunk — skip
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: streamedText, recommendations: recs, isStreaming: false }
              : m,
          ),
        );
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: errMsg, isStreaming: false }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading, messageCount, city, coords, messages.length, onFirstMessage],
  );

  const rateLimited = messageCount >= RATE_LIMIT_PER_SESSION;

  return (
    // flex-1 so this fills the absolute-inset-0 main; max-w-2xl centers content on desktop
    <div className="flex-1 flex flex-col min-h-0 w-full max-w-2xl mx-auto">
      {!hasMessages ? (
        <div className="flex-1 flex flex-col min-h-0 md:justify-center">
          {/* ── Top Spacer (Pushes content down on both mobile and desktop) ── */}
          <div className="flex-1" />

          {/* ── Hero Text ── */}
          <div className="px-6 md:text-center mb-8 md:mb-12">
            <p
              className="text-[11px] font-bold tracking-[0.18em] uppercase mb-3"
              style={{ color: "rgba(244,160,122,0.9)" }}
            >
              {dayLabel}
            </p>
            <h1
              className="text-[2rem] sm:text-[2.25rem] font-medium text-white leading-[1.1] tracking-[-0.025em]"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Where do you want to{" "}
              <em
                style={{
                  fontFamily: "var(--font-instrument-serif)",
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "var(--accent)",
                }}
              >
                {heroTail}
              </em>
            </h1>
          </div>

          {/* ── Input Dock (Suggestions + Composer) ── */}
          <div className="px-4 pb-28 md:pb-24">
            <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar md:justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.query)}
                  disabled={isLoading}
                  className="shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full whitespace-nowrap transition-colors disabled:opacity-50"
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    color: "rgba(250,249,247,0.9)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,0.18)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(255,255,255,0.10)")
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
            <ChatComposer
              onSend={sendMessage}
              disabled={isLoading || !sessionId || rateLimited}
              placeholder={
                rateLimited
                  ? "Session limit reached. Refresh to continue."
                  : "Ask anything — 'date night tonight'…"
              }
            />
          </div>

          {/* ── Bottom Spacer (Desktop only: completes the vertical centering) ── */}
          <div className="hidden md:block flex-1 pb-[12dvh]" />
        </div>
      ) : (
        <>
          {/* ── Conversation View ── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 pt-4">
            <MessageStream messages={messages} />
          </div>

          {/* ── Bottom Dock (Input moves here once chatting starts) ── */}
          <div className="shrink-0 px-4 pb-28 md:pb-24 pt-2">
            <ChatComposer
              onSend={sendMessage}
              disabled={isLoading || !sessionId || rateLimited}
              placeholder={
                rateLimited
                  ? "Session limit reached. Refresh to continue."
                  : "Ask anything — 'date night tonight'…"
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
