"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ConversationStatusBadge } from "./ConversationStatusBadge";
import { IconBrandInstagram, IconMessageChatbot, IconInbox } from "@tabler/icons-react";

type Status = "active" | "handed_off" | "resolved";

interface ConversationSummary {
  _id: string;
  channel: "instagram" | "webchat";
  status: Status;
  customerName: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: number;
  bookingCount: number;
  handoffReason?: string;
  createdAt: number;
}

interface Props {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  statusFilter: Status | "all";
  onFilterChange: (status: Status | "all") => void;
}

const filters: { value: Status | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "handed_off", label: "Handed Off" },
  { value: "resolved", label: "Resolved" },
];

export function ConversationList({ conversations, selectedId, onSelect, statusFilter, onFilterChange }: Props) {
  return (
    <div className="flex flex-col h-full border-r border-border/50">
      {/* Filter tabs */}
      <div className="flex gap-1 px-3 pt-3 pb-2 border-b border-border/40 overflow-x-auto shrink-0">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
              statusFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <IconInbox size={32} className="text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          </div>
        ) : (
          conversations.map(conv => (
            <button
              key={conv._id}
              onClick={() => onSelect(conv._id)}
              className={cn(
                "w-full text-left px-4 py-3.5 border-b border-border/30 transition-colors hover:bg-muted/40",
                selectedId === conv._id && "bg-muted/60"
              )}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0 text-muted-foreground">
                  {conv.channel === "instagram"
                    ? <IconBrandInstagram size={16} />
                    : <IconMessageChatbot size={16} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">
                      {conv.customerName ?? "Unknown customer"}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                    </span>
                  </div>
                  {conv.lastMessagePreview && (
                    <p className="text-xs text-muted-foreground truncate mb-1">
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
