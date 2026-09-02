"use client";

import { BusinessCard, Recommendation } from "./BusinessCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkle } from "lucide-react";
import ReactMarkdown from "react-markdown";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: Recommendation[];
  isStreaming?: boolean;
};

interface Props {
  messages: ChatMessage[];
}

function AssistantMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkle size={15} />
      </div>
      <div className="flex-1 min-w-0">
        {msg.isStreaming && !msg.content ? (
          <div className="space-y-2 py-1">
            <Skeleton className="h-3.5 w-48 rounded" />
            <Skeleton className="h-3.5 w-64 rounded" />
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-foreground/95">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
            {msg.isStreaming && (
              <span className="inline-block w-1 h-4 bg-primary ml-1 animate-pulse align-middle" />
            )}
          </div>
        )}

        {!msg.isStreaming && msg.recommendations && msg.recommendations.length > 0 && (
          <div className="mt-4 space-y-3">
            {msg.recommendations.map((rec) => (
              <BusinessCard key={rec.orgId} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] sm:max-w-[75%] bg-primary text-primary-foreground rounded-2xl rounded-br-xs px-4 py-2.5 text-sm font-medium shadow-sm">
        {msg.content}
      </div>
    </div>
  );
}

export function MessageStream({ messages }: Props) {
  return (
    <div className="space-y-6 px-4 py-6">
      {messages.map((msg) =>
        msg.role === "assistant" ? (
          <AssistantMessage key={msg.id} msg={msg} />
        ) : (
          <UserMessage key={msg.id} msg={msg} />
        ),
      )}
    </div>
  );
}
