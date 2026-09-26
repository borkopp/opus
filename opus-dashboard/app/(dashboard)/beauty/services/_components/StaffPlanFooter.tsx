"use client";

import { useQuery } from "convex/react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";

export function StaffPlanFooter() {
  const { t } = useDashboardI18n();
  const planStatus = useQuery(api.staff.getStaffPlanStatus, {});

  return (
    <>
      {planStatus?.isFree && (
        <footer
          id="staff-plan-limit"
          className="mt-auto flex flex-col gap-1 pt-6 pb-2 text-sm text-muted-foreground"
          role="status"
        >
          <p className="font-medium text-foreground">
            {t(
              `Free plan · ${planStatus.staffCount}/${planStatus.staffLimit} staff · ${planStatus.ownerCount}/${planStatus.ownerLimit} owner`,
              `Бесплатен план · ${planStatus.staffCount}/${planStatus.staffLimit} вработени · ${planStatus.ownerCount}/${planStatus.ownerLimit} сопственик`,
            )}
          </p>
          <p data-replay-public>
            {planStatus.canUseStaffRole
              ? t(
                  "1 owner + 3 staff, 4 people total. Managers count as staff; inactive members do not use a slot.",
                  "1 сопственик + 3 вработени, вкупно 4 лица. Менаџерите се бројат како вработени; неактивните членови не зафаќаат место.",
                )
              : t(
                  "Staff limit reached. Deactivate a team member or upgrade to OPUS Pro to add more.",
                  "Лимитот за вработени е достигнат. Деактивирајте член на тимот или преминете на OPUS Pro за да додадете повеќе.",
                )}
          </p>
        </footer>
      )}
    </>
  );
}
