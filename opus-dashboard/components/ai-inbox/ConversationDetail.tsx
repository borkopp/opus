"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { MessageBubble } from "./MessageBubble";
import { ConversationStatusBadge } from "./ConversationStatusBadge";
import { StaffReply } from "./StaffReply";
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
import { getHandoffReason } from "@/lib/i18n/ai-frontdesk";

import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";

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
  const resumeConversation = useMutation(
    api.ai.conversations.resumeConversation,
  );
  const handoffConversation = useMutation(
    api.ai.conversations.handoffConversation,
  );
  if (conversation === null)
    return (
      <p className="p-5 text-sm text-muted-foreground">
        {t("Conversation not found.", "Разговорот не е пронајден.")}
      </p>
    );
  if (conversation === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <Skeleton className="h-48 w-3/4 rounded-2xl" />
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
    <div className="flex min-h-0 min-w-0 flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-border/50 shrink-0 bg-card">
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-11 shrink-0 rounded-full bg-secondary flex items-center justify-center">
            <User size={16} className="text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="break-words [overflow-wrap:anywhere] font-medium text-sm">
                {conversation.customer?.name ??
                  t("Unknown customer", "Непознат клиент")}
              </span>
              <ChannelIcon
                size={13}
                className="shrink-0 text-muted-foreground"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
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
          <div className="flex flex-wrap gap-2">
            {conversation.status === "handed_off" && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await resumeConversation({ orgId, conversationId });
                    toast.success(
                      t(
                        "AI will reply to the next message",
                        "AI ќе одговори на следната порака",
                      ),
                    );
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : t("Unable to resume AI", "AI не може да продолжи"),
                    );
                  }
                }}
              >
                {t("Resume AI", "Продолжи со AI")}
              </Button>
            )}
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
      <div className="min-h-0 flex-1 bg-background/40">
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent className="gap-5 p-4 sm:p-6">
                {messages === undefined ? (
                  <Skeleton className="h-24 w-2/3 rounded-2xl" />
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <MessageSquareOff
                      size={28}
                      className="text-muted-foreground/40"
                    />
                    <p className="text-sm text-muted-foreground">
                      {t("No messages yet", "Сè уште нема пораки")}
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <MessageScrollerItem
                      key={message._id}
                      messageId={message._id}
                    >
                      <MessageBubble message={message} />
                    </MessageScrollerItem>
                  ))
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton
              aria-label={t("Latest messages", "Најнови пораки")}
            />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>

      {/* Handed-off notice */}
      {conversation.status === "handed_off" && conversation.handoffReason && (
        <div className="px-5 py-3 border-t border-border/40 bg-highlight/10 shrink-0">
          <p className="text-xs text-warning">
            <span className="font-medium">
              {t("Handed off:", "Преземено:")}
            </span>{" "}
            {getHandoffReason(language, conversation.handoffReason)}
          </p>
        </div>
      )}
      {conversation.channel === "instagram" &&
        conversation.status !== "resolved" && (
          <StaffReply
            key={conversationId}
            orgId={orgId}
            conversationId={conversationId}
          />
        )}
    </div>
  );
}
