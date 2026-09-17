"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AnalysisReport } from "@/components/business-assistant/AnalysisReport";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SavedReport({ turnId }: { turnId: string }) {
  const { t } = useDashboardI18n();
  const access = useQuery(api.analyst.conversations.getAccess);
  const report = useQuery(
    api.analyst.conversations.getReport,
    access?.allowed && access.paid
      ? { turnId: turnId as Id<"analyst_turns"> }
      : "skip",
  );
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Button variant="outline" className="self-start" asChild>
        <Link href="/beauty/assistant">
          <ArrowLeft data-icon="inline-start" />
          {t("Back to assistant", "Назад кон асистентот")}
        </Link>
      </Button>
      {access && (!access.allowed || !access.paid) ? (
        <Alert>
          <AlertDescription>
            {t(
              "This report requires owner or manager access on OPUS Pro.",
              "Овој извештај бара пристап за сопственик или менаџер со OPUS Pro.",
            )}
          </AlertDescription>
        </Alert>
      ) : !report ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">
            {report.question}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "This is the data used for the saved answer. Ask again to include changes made since then.",
              "Ова се податоците користени за зачуваниот одговор. Прашајте повторно за да ги вклучите поновите промени.",
            )}
          </p>
          {report.reports.map((item) => (
            <AnalysisReport key={item.key} report={item} expanded />
          ))}
        </>
      )}
    </div>
  );
}
