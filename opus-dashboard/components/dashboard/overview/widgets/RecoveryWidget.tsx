import { useQuery } from "convex/react";
import { Badge } from "@/components/ui/badge";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetFrame } from "../WidgetFrame";
import { FeatureCardContent } from "../FeatureCardContent";
export function RecoveryWidget({
  orgId,
  paid,
}: {
  orgId: Id<"orgs">;
  paid: boolean;
}) {
  const { t } = useDashboardI18n();
  const summary = useQuery(
    api.ai.gapOptimizerHelpers.getTodaySummary,
    paid ? { orgId } : "skip",
  );
  return (
    <WidgetFrame
      delay={45}
      className="flex flex-col"
      title={t("Opening recovery", "Пополнување слободни термини")}
      subtitle={t(
        "A cancellation can become a booking",
        "Откажан термин може повторно да се пополни",
      )}
      action={!paid && <Badge variant="pro">Pro</Badge>}
    >
      <FeatureCardContent
        status={
          paid
            ? t(
                `${summary?.openCount ?? "—"} openings to review`,
                `${summary?.openCount ?? "—"} слободни термини за преглед`,
              )
            : null
        }
        description={t(
          "Review openings, choose a client, and share an invitation yourself.",
          "Прегледајте слободни термини, изберете клиент и испратете покана сами.",
        )}
        href={
          !paid
            ? "https://opus.mk/#pricing"
            : summary?.enabled
              ? "/gap-optimizer"
              : "/settings?tab=gaps"
        }
        external={!paid}
        actionLabel={
          paid
            ? t("Review openings", "Прегледај слободни термини")
            : t("Learn more", "Дознај повеќе")
        }
      />
    </WidgetFrame>
  );
}
