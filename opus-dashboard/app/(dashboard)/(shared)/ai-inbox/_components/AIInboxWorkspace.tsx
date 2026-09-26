"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ConversationList } from "@/components/ai-inbox/ConversationList";
import { ConversationDetail } from "@/components/ai-inbox/ConversationDetail";
import { BotMessageSquare, Settings2, ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
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

  if (!orgId || profile === undefined) {
    return <Skeleton className="h-[70dvh] w-full rounded-3xl" />;
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
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <DashboardPageHeader
          replayPublicDescription
          replayPublicTitle
          title={t("AI inbox", "AI сандаче")}
          description={t(
            "Follow Instagram conversations and step in when clients need you.",
            "Следете ги Instagram разговорите и вклучете се кога на клиентите им треба вашата помош.",
          )}
        >
          <Button asChild variant="outline">
            <Link data-replay-public href="/settings?tab=ai">
              <Settings2 data-icon="inline-start" />
              {t("Front-desk settings", "Поставки за AI рецепција")}
            </Link>
          </Button>
        </DashboardPageHeader>
        <div className="flex h-[72dvh] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-[25px] bg-card md:h-[calc(100dvh-18rem)]">
          {selectedId && (
            <div className="px-4 pt-3 md:hidden">
              <Button
                data-replay-public
                variant="ghost"
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeft data-icon="inline-start" />
                {t("Conversations", "Разговори")}
              </Button>
            </div>
          )}
          {/* Split view */}
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {/* Left: conversation list */}
            <div
              className={cn(
                "min-h-0 w-full shrink-0 md:w-[320px] xl:w-[360px]",
                selectedId && "hidden md:block",
              )}
            >
              <ConversationList
                loading={isPaid && conversations === undefined}
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
                <ConversationDetail
                  key={selectedId}
                  orgId={orgId}
                  conversationId={selectedId}
                />
              ) : (
                <Empty className="h-full bg-background/40">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BotMessageSquare />
                    </EmptyMedia>
                    <EmptyTitle>
                      {t(
                        "Your conversations, in one place",
                        "Сите разговори на едно место",
                      )}
                    </EmptyTitle>
                    <EmptyDescription>
                      {t(
                        "Choose a conversation to read messages, review AI replies, or reply as your team.",
                        "Изберете разговор за да ги прочитате пораките, да ги прегледате AI одговорите или да одговорите како тим.",
                      )}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </div>
        </div>
      </div>
    </PaidFeatureOverlay>
  );
}
