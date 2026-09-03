"use client";

import { useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { MessageBubble } from "./MessageBubble";
import { ConversationStatusBadge } from "./ConversationStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Instagram,
  BotMessageSquare,
  MessageSquareOff,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { mk } from "date-fns/locale";
import posthog from "posthog-js";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

interface Props {
  orgId: Id<"orgs">;
  conversationId: Id<"ai_conversations">;
}

export function ConversationDetail({ orgId, conversationId }: Props) {
  const { language, t } = useDashboardI18n();
  const conversation = useQuery(api.ai.conversations.getConversation, {
    orgId,
    conversationId,
  });
  const messages = useQuery(api.ai.messages.listMessages, {
    orgId,
    conversationId,
  });
  const resolveConversation = useMutation(
    api.ai.conversations.resolveConversation,
  );
  const handoffConversation = useMutation(
    api.ai.conversations.handoffConversation,
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleResolve = async () => {
    try {
      await resolveConversation({ orgId, conversationId });
      posthog.capture("ai_conversation_resolved", {
        channel: conversation.channel,
        booking_count: conversation.bookingIds.length,
      });
      toast.success(
        t("Conversation resolved", "Разговорот е означен како решен"),
      );
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              "Failed to resolve conversation",
              "Неуспешно затворање на разговорот",
            ),
      );
    }
  };

  const handleTakeOver = async () => {
    try {
      await handoffConversation({
        orgId,
        conversationId,
        reason: "Staff takeover",
      });
      posthog.capture("ai_conversation_taken_over", {
        channel: conversation.channel,
        booking_count: conversation.bookingIds.length,
      });
      toast.success(
        t(
          "Conversation taken over — AI is no longer responding",
          "Разговорот е преземен — AI веќе не одговара",
        ),
      );
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              "Failed to take over conversation",
              "Неуспешно преземање на разговорот",
            ),
      );
    }
  };

  const ChannelIcon =
    conversation.channel === "instagram" ? Instagram : BotMessageSquare;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 shrink-0 bg-muted/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <User size={16} className="text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {conversation.customer?.name ??
                  t("Unknown customer", "Непознат клиент")}
              </span>
              <ChannelIcon size={13} className="text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <ConversationStatusBadge status={conversation.status} />
              <span className="text-[11px] text-muted-foreground">
                {t("Started", "Започнат на")}{" "}
                {format(new Date(conversation.createdAt), "d MMM yyyy", {
                  locale: language === "mk" ? mk : undefined,
                })}
              </span>
              {conversation.bookingIds.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  · {conversation.bookingIds.length}{" "}
                  {conversation.bookingIds.length === 1
                    ? t("booking", "термин")
                    : t("bookings", "термини")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {(conversation.status === "active" ||
          conversation.status === "handed_off") && (
          <div className="flex gap-2">
            {conversation.status === "active" && (
              <Button size="sm" variant="outline" onClick={handleTakeOver}>
                {t("Take Over", "Преземи")}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleResolve}>
              {t("Mark Resolved", "Означи како решен")}
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {!messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <MessageSquareOff size={28} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {t("No messages yet", "Сè уште нема пораки")}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message._id} message={message} />
          ))
        )}
      </div>

      {/* Handed-off notice */}
      {conversation.status === "handed_off" && conversation.handoffReason && (
        <div className="px-5 py-3 border-t border-border/40 bg-highlight/10 shrink-0">
          <p className="text-xs text-warning">
            <span className="font-medium">
              {t("Handed off:", "Преземено:")}
            </span>{" "}
            {conversation.handoffReason}
          </p>
        </div>
      )}
    </div>
  );
}
