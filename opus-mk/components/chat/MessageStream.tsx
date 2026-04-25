"use client";

import { BusinessCard, Recommendation } from "./BusinessCard";
import { Skeleton } from "@/components/ui/skeleton";
import { IconSparkles } from "@tabler/icons-react";
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
    <div className="flex gap-2.5 items-start">
      <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 mt-0.5">
        <IconSparkles size={14} />
      </div>
      <div className="flex-1 min-w-0">
        {msg.isStreaming && !msg.content ? (
          <div className="space-y-2 py-1">
            <Skeleton className="h-3.5 w-48 rounded" />
            <Skeleton className="h-3.5 w-64 rounded" />
          </div>
        ) : (
          <div className="text-sm leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-1">{children}</ol>,
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
            {msg.isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-foreground/70 ml-0.5 animate-pulse align-middle" />
            )}
          </div>
        )}

        {!msg.isStreaming && msg.recommendations && msg.recommendations.length > 0 && (
          <div className="mt-3 space-y-2">
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
      <div className="max-w-[80%] bg-foreground text-background rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm">
        {msg.content}
      </div>
    </div>
  );
}

export function MessageStream({ messages }: Props) {
  return (
    <div className="space-y-5 p-4">
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
