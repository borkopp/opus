"use client";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useQuery } from "convex/react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";

export function StaffPageHeader({ onAddClick }: { onAddClick: () => void }) {
  const { t } = useDashboardI18n();
  const planStatus = useQuery(api.staff.getStaffPlanStatus, {});

  return (
    <DashboardPageHeader
      title={t("Staff", "Тим")}
      description={t(
        "Add team members and manage when customers can book them.",
        "Додајте членови на тимот и управувајте со нивното работно време.",
      )}
    >
      <Button
        onClick={onAddClick}
        disabled={!planStatus?.canUseStaffRole}
        aria-describedby={planStatus?.isFree ? "staff-plan-limit" : undefined}
        className="w-full transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none sm:w-auto"
      >
        <PlusIcon data-icon="inline-start" />
        {t("Add staff member", "Додај вработен")}
      </Button>
    </DashboardPageHeader>
  );
}
