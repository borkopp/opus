"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { mk } from "date-fns/locale";
import { ConversationStatusBadge } from "./ConversationStatusBadge";
import {
  IconBrandInstagram,
  IconMessageChatbot,
  IconInbox,
} from "@tabler/icons-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

type Status = "active" | "handed_off" | "resolved";

type ConversationSummary = FunctionReturnType<
  typeof api.ai.conversations.listConversations
>[number];

interface Props {
  loading?: boolean;
  conversations: ConversationSummary[];
  selectedId: Id<"ai_conversations"> | null;
  onSelect: (id: Id<"ai_conversations">) => void;
  statusFilter: Status | "all";
  onFilterChange: (status: Status | "all") => void;
}

export function ConversationList({
  loading = false,
  conversations,
  selectedId,
  onSelect,
  statusFilter,
  onFilterChange,
}: Props) {
  const { language, t } = useDashboardI18n();

  const filters: { value: Status | "all"; label: string }[] = [
    { value: "all", label: t("All", "Сите") },
    { value: "active", label: t("Active", "Активни") },
    { value: "handed_off", label: t("Handed Off", "Преземени") },
    { value: "resolved", label: t("Resolved", "Решени") },
  ];

  return (
    <div className="flex min-h-0 flex-col h-full md:border-r border-border/50">
      <div className="flex flex-col gap-4 border-b border-border/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-medium">
            {t("Conversations", "Разговори")}
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {loading ? "…" : conversations.length}
          </span>
        </div>
        <ToggleGroup
          spacing={1}
          type="single"
          value={statusFilter}
          onValueChange={(value) => {
            if (value) onFilterChange(value as Status | "all");
          }}
          className="grid w-full grid-cols-2 gap-1"
          aria-label={t("Filter conversations", "Филтрирај разговори")}
        >
          {filters.map((f) => (
            <ToggleGroupItem key={f.value} value={f.value} className="min-h-10">
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {loading ? (
          <div
            className="flex flex-col gap-3 p-2"
            aria-label={t("Loading conversations", "Се вчитуваат разговорите")}
          >
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <Empty className="h-full px-4 md:px-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconInbox />
              </EmptyMedia>
              <EmptyTitle>
                {statusFilter === "all"
                  ? t("No conversations yet", "Сè уште нема разговори")
                  : t("No conversations here", "Нема разговори тука")}
              </EmptyTitle>
              <EmptyDescription>
                {statusFilter === "all"
                  ? t(
                      "Messages from your connected Instagram account will appear here.",
                      "Пораките од поврзаната Instagram сметка ќе се прикажат тука.",
                    )
                  : t(
                      "Try another filter to see your conversations.",
                      "Изберете друг филтер за да ги видите разговорите.",
                    )}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv._id}
              type="button"
              aria-current={selectedId === conv._id ? "true" : undefined}
              onClick={() => onSelect(conv._id)}
              className={cn(
                "w-full rounded-2xl text-left p-4 transition-colors hover:bg-secondary/60",
                selectedId === conv._id && "bg-secondary",
              )}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-primary">
                  {conv.channel === "instagram" ? (
                    <IconBrandInstagram size={16} />
                  ) : (
                    <IconMessageChatbot size={16} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                    <span className="text-sm font-medium truncate">
                      {conv.customerName ??
                        t("Unknown customer", "Непознат клиент")}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), {
                        addSuffix: true,
                        locale: language === "mk" ? mk : undefined,
                      })}
                    </span>
                  </div>
                  {conv.lastMessagePreview && (
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {conv.lastMessagePreview}
                    </p>
                  )}
                  <ConversationStatusBadge status={conv.status} />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
