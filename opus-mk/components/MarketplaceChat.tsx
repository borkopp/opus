"use client";

// Main marketplace chat component — owns the conversation state,
// calls /api/chat for streaming, and renders messages + business cards.

import { useState, useRef, useEffect, useCallback } from "react";
import { useSessionId } from "@/hooks/use-session-id";
import { useResolveCity } from "@/hooks/use-resolve-city";
import { MessageStream, ChatMessage } from "@/components/chat/MessageStream";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { Recommendation } from "@/components/chat/BusinessCard";
import { IconSparkles } from "@tabler/icons-react";

const RATE_LIMIT_PER_SESSION = 30; // messages per page load
const MAX_QUERY_LENGTH = 500;

type SSEChunk =
  | { type: "text"; text: string }
  | { type: "recommendations"; data: Recommendation[] }
  | { type: "done"; conversationId?: string }
  | { type: "error"; message: string };

function newId() {
  return Math.random().toString(36).slice(2);
}

export function MarketplaceChat() {
  const sessionId = useSessionId();
  const { city, coords } = useResolveCity();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    [sessionId, isLoading, messageCount, city, coords],
  );

  const rateLimited = messageCount >= RATE_LIMIT_PER_SESSION;

  return (
    <div className="flex flex-col h-full">
      {/* Intro — shown only when no messages yet */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-foreground text-background flex items-center justify-center mb-4">
            <IconSparkles size={22} />
          </div>
          <h2 className="text-xl font-semibold mb-1">Find anything, instantly</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Tell me what you&apos;re looking for. Haircut now, spa tonight, dinner for two — I&apos;ll
            find the best options near you.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {[
              "Haircut now near me",
              "Massage this evening",
              "Nail salon tomorrow",
              "Something fun tonight",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-full border border-border/60 bg-card text-sm text-muted-foreground hover:border-border hover:text-foreground transition-colors duration-150 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message list */}
      {messages.length > 0 && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <MessageStream messages={messages} />
        </div>
      )}

      {/* Composer */}
      <ChatComposer
        onSend={sendMessage}
        disabled={isLoading || !sessionId || rateLimited}
        placeholder={
          rateLimited
            ? "Session limit reached. Refresh to continue."
            : "Ask anything…"
        }
      />
    </div>
  );
}
