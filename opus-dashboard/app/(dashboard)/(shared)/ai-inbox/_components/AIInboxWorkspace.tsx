"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConversationList } from "@/components/ai-inbox/ConversationList";
import { ConversationDetail } from "@/components/ai-inbox/ConversationDetail";
import { BotMessageSquare } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { PaidFeatureOverlay } from "@/components/ui/paid-feature-overlay";

type StatusFilter = "all" | "active" | "handed_off" | "resolved";

export function AIInboxWorkspace() {
  const { t } = useDashboardI18n();
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId as Id<"orgs"> | undefined;
  const isPaid = profile?.plan === "paid";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const search = useSearchParams();
  const [selectedId, setSelectedId] = useState<Id<"ai_conversations"> | null>(
    search.get("conversation") as Id<"ai_conversations"> | null,
  );

  const conversations = useQuery(
    api.ai.conversations.listConversations,
    orgId && isPaid
      ? { orgId, status: statusFilter === "all" ? undefined : statusFilter }
      : "skip",
  );

  if (
    !orgId ||
    profile === undefined ||
    (isPaid && conversations === undefined)
  ) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <PaidFeatureOverlay
      locked={!isPaid}
      featureLabel={t(
        "AI inbox requires OPUS Pro",
        "AI сандачето бара OPUS Pro",
      )}
      className="flex min-h-full flex-1"
      contentClassName="flex min-h-full flex-1"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex min-h-0 min-w-0 flex-1 flex-col h-[calc(100dvh-9rem)]"
      >
        {/* Page header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 shrink-0">
          <BotMessageSquare size={20} className="text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold font-display">
              {t("AI ", "AI ")}
              <span className="font-display italic text-primary">
                {t("Front-desk", "Рецепција")}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {t(
                "Conversations handled by your AI agent",
                "Разговори управувани од вашиот AI агент",
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2 border-b p-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings?tab=ai">
              {t("Frontdesk settings", "Поставки за AI рецепција")}
            </Link>
          </Button>
          {selectedId && (
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => setSelectedId(null)}
            >
              {t("Back to conversations", "Назад кон разговорите")}
            </Button>
          )}
        </div>
        {/* Split view */}
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          {/* Left: conversation list */}
          <div
            className={cn(
              "w-full shrink-0 md:w-80",
              selectedId && "hidden md:block",
            )}
          >
            <ConversationList
              conversations={conversations ?? []}
              selectedId={selectedId}
              onSelect={setSelectedId}
              statusFilter={statusFilter}
              onFilterChange={setStatusFilter}
            />
          </div>

          {/* Right: conversation detail */}
          <div
            className={cn(
              "min-w-0 flex-1 overflow-hidden",
              !selectedId && "hidden md:block",
            )}
          >
            {selectedId ? (
              <ConversationDetail orgId={orgId} conversationId={selectedId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                <BotMessageSquare
                  size={40}
                  className="text-muted-foreground/30"
                />
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Select a conversation to view messages",
                    "Изберете разговор за да ги видите пораките",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </PaidFeatureOverlay>
  );
}
