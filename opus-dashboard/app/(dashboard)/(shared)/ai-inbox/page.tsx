"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConversationList } from "@/components/ai-inbox/ConversationList";
import { ConversationDetail } from "@/components/ai-inbox/ConversationDetail";
import { IconMessageChatbot } from "@tabler/icons-react";

type StatusFilter = "all" | "active" | "handed_off" | "resolved";

export default function AIInboxPage() {
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId as Id<"orgs"> | undefined;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const conversations = useQuery(
    api.ai.conversations.listConversations,
    orgId ? { orgId, status: statusFilter === "all" ? undefined : statusFilter } : "skip"
  );

  if (!orgId || profile === undefined || conversations === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 shrink-0">
        <IconMessageChatbot size={20} className="text-accent" />
        <div>
          <h1 className="text-lg font-semibold font-display">AI <span className="serif-accent-inline text-lg">Front-desk</span></h1>
          <p className="text-xs text-muted-foreground">Conversations handled by your AI agent</p>
        </div>
      </div>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: conversation list */}
        <div className="w-80 shrink-0">
          <ConversationList
            conversations={(conversations ?? []) as any[]}
            selectedId={selectedId}
            onSelect={setSelectedId}
            statusFilter={statusFilter}
            onFilterChange={setStatusFilter}
          />
        </div>

        {/* Right: conversation detail */}
        <div className="flex-1 overflow-hidden">
          {selectedId ? (
            <ConversationDetail
              orgId={orgId}
              conversationId={selectedId as Id<"ai_conversations">}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <IconMessageChatbot size={40} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
