"use client";

import { useQuery } from "convex/react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";

export function StaffPageHeader({ onAddClick }: { onAddClick: () => void }) {
  const { t } = useDashboardI18n();
  const planStatus = useQuery(api.staff.getStaffPlanStatus, {});

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          {t("Staff", "Вработени")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "Add team members and manage when customers can book them.",
            "Додајте членови на тимот и управувајте со нивното работно време за закажување.",
          )}
        </p>
      </div>

      <Button
        onClick={onAddClick}
        disabled={!planStatus?.canUseStaffRole}
        aria-describedby={planStatus?.isFree ? "staff-plan-limit" : undefined}
        className="w-full transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none sm:w-auto"
      >
        <PlusIcon data-icon="inline-start" />
        {t("Add staff member", "Додај вработен")}
      </Button>
    </header>
  );
}
