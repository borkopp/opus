"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaidFeatureOverlay } from "@/components/ui/paid-feature-overlay";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export function GapOptimizerWidget({
  orgId,
  isPaid,
}: {
  orgId: Id<"orgs">;
  isPaid: boolean;
}) {
  const { t } = useDashboardI18n();
  const data = useQuery(
    api.ai.gapOptimizerHelpers.getTodaySummary,
    isPaid ? { orgId } : "skip",
  );
  return (
    <PaidFeatureOverlay
      locked={!isPaid}
      featureLabel={t(
        "Fill openings requires OPUS Pro",
        "Пополнувањето слободни термини бара OPUS Pro",
      )}
      compact
      className="h-full"
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle>
            {t("Fill openings", "Пополни слободни термини")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-center gap-2">
          {isPaid && !data ? (
            <Skeleton className="h-20 w-full" />
          ) : !data?.enabled ? (
            <p className="text-sm text-muted-foreground">
              {t(
                "Enable recovery to find bookable openings and review client invitations.",
                "Овозможете пополнување за да пронајдете слободни термини и да прегледате покани за клиенти.",
              )}
            </p>
          ) : !data.lastScanAt ? (
            <p className="text-sm text-muted-foreground">
              {t(
                "Today has not been scanned yet.",
                "Денешниот распоред сè уште не е скениран.",
              )}
            </p>
          ) : (
            <>
              <p className="text-4xl font-semibold">{data.openCount}</p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "bookable openings to review",
                  "слободни термини за преглед",
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.outreachSentCount} {t("active offers", "активни понуди")}{" "}
                · {data.filledCount}{" "}
                {t("bookings through offers", "резервации преку понуди")}
              </p>
            </>
          )}
        </CardContent>
        <CardFooter className="pb-5">
          <Button asChild variant="outline" className="w-full">
            <Link
              href={data?.enabled ? "/gap-optimizer" : "/settings?tab=gaps"}
            >
              {data?.enabled
                ? t("Review openings", "Прегледај термини")
                : t("Configure recovery", "Поставки за пополнување")}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </PaidFeatureOverlay>
  );
}
