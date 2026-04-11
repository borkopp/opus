"use client";

import { useEffect, useRef, useState } from "react";
import { IconMessageChatbot, IconX, IconSend } from "@tabler/icons-react";

function renderMarkdown(text: string) {
  // Split into lines, then parse inline bold/italic per line
  return text.split("\n").map((line, i) => {
    const parts: React.ReactNode[] = [];
    const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let last = 0;
    let match;
    while ((match = re.exec(line)) !== null) {
      if (match.index > last) parts.push(line.slice(last, match.index));
      if (match[2]) parts.push(<strong key={match.index}><em>{match[2]}</em></strong>);
      else if (match[3]) parts.push(<strong key={match.index}>{match[3]}</strong>);
      else if (match[4]) parts.push(<em key={match.index}>{match[4]}</em>);
      last = match.index + match[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return (
      <span key={i}>
        {i > 0 && <br />}
        {parts.length ? parts : line}
      </span>
    );
  });
}

interface Message {
  role: "user" | "assistant";
  content: string;
  confidence?: number;
  handedOff?: boolean;
}

interface ChatWidgetProps {
  orgId: string;
  personaName?: string;
  greetingMessage?: string | null;
}

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "";

function getOrCreateSessionId(orgId: string): string {
  const key = `opus_chat_session_${orgId}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `${orgId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(key, id);
  return id;
}

export default function ChatWidget({ orgId, personaName = "Aria", greetingMessage }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Init session ID client-side only (localStorage unavailable during SSR)
  useEffect(() => {
    setSessionId(getOrCreateSessionId(orgId));
  }, [orgId]);

  // Load conversation history on first open
  useEffect(() => {
    if (!open || historyLoaded || !sessionId) return;
    setHistoryLoaded(true);

    fetch(`${DASHBOARD_URL}/api/chat?orgId=${encodeURIComponent(orgId)}&sessionId=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          const loaded: Message[] = data.messages
            .filter((m: any) => m.role === "user" || m.role === "assistant")
            .map((m: any) => ({
              role: m.role,
              content: m.content,
              confidence: m.confidenceScore,
            }));
          setMessages(loaded);
        } else if (greetingMessage) {
          setMessages([{ role: "assistant", content: greetingMessage }]);
        }
      })
      .catch(() => {
        if (greetingMessage) {
          setMessages([{ role: "assistant", content: greetingMessage }]);
        }
      });
  }, [open, historyLoaded, sessionId, orgId, greetingMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !sessionId) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch(`${DASHBOARD_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, sessionId, message: text }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Something went wrong. Please try again." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            confidence: data.confidence,
            handedOff: data.handedOff,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Chat panel — sits above the sticky "Book Now" bar */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm flex flex-col bg-background border border-border/60 rounded-2xl shadow-2xl overflow-hidden animate-slide-up-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
                <IconMessageChatbot size={16} className="text-primary" />
              </div>
              <span className="text-sm font-semibold">{personaName}</span>
              <span className="w-2 h-2 rounded-full bg-online inline-block" role="status" aria-label="Online" />
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Close chat"
            >
              <IconX size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[280px] max-h-[400px]">
            {messages.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground text-center pt-8">
                Send a message to start the conversation.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}
                >
                  {renderMarkdown(msg.content)}
                  {msg.handedOff && (
                    <p className="text-xs mt-1.5 opacity-70">
                      A team member will follow up shortly.
                    </p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-dot-pulse [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-dot-pulse [animation-delay:200ms]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-dot-pulse [animation-delay:400ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border/40 bg-card flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${personaName}…`}
              disabled={loading}
              autoComplete="off"
              className="flex-1 text-sm bg-secondary rounded-xl px-3.5 py-2.5 outline-none placeholder:text-muted-foreground disabled:opacity-50 focus:ring-1 focus:ring-ring/40"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Send"
            >
              <IconSend size={16} />
            </button>
          </div>
        </div>
      )}

      {/* FAB — sits above the sticky "Book Now" bar (~80px tall) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-[transform,background-color] duration-150 active:scale-95"
          aria-label="Open chat"
        >
          <IconMessageChatbot size={22} />
        </button>
      )}
    </>
  );
}
