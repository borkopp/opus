"use client";

import { useQuery } from "convex/react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";

export function StaffPlanFooter() {
  const { t } = useDashboardI18n();
  const planStatus = useQuery(api.staff.getStaffPlanStatus, {});

  return (
    <>
      {planStatus && (
        <footer
          id="staff-plan-limit"
          className="mt-auto flex flex-col gap-1 pt-6 pb-2 text-sm text-muted-foreground"
          role="status"
        >
          <p className="font-medium text-foreground">
            {planStatus.isFree
              ? t(
                  `Free plan · ${planStatus.staffCount}/${planStatus.staffLimit} staff · ${planStatus.ownerCount}/${planStatus.ownerLimit} owner`,
                  `Бесплатен план · ${planStatus.staffCount}/${planStatus.staffLimit} вработени · ${planStatus.ownerCount}/${planStatus.ownerLimit} сопственик`,
                  `Plani falas · ${planStatus.staffCount}/${planStatus.staffLimit} staf · ${planStatus.ownerCount}/${planStatus.ownerLimit} pronar`,
                )
              : t(
                  `Pro · ${planStatus.totalCount}/${planStatus.totalLimit} active team members`,
                  `Pro · ${planStatus.totalCount}/${planStatus.totalLimit} активни членови на тимот`,
                  `Pro · ${planStatus.totalCount}/${planStatus.totalLimit} anëtarë aktivë të ekipit`,
                )}
          </p>
          <p data-replay-public>
            {!planStatus.isFree
              ? planStatus.canUseStaffRole
                ? t(
                    "Up to 12 active team members, including owners and managers. Inactive members do not use a slot.",
                    "До 12 активни членови на тимот, вклучувајќи сопственици и менаџери. Неактивните членови не зафаќаат место.",
                    "Deri në 12 anëtarë aktivë të ekipit, përfshirë pronarët dhe menaxherët. Anëtarët joaktivë nuk zënë vend.",
                  )
                : t(
                    "Team limit reached. Deactivate a team member to add more.",
                    "Лимитот за тимот е достигнат. Деактивирајте член на тимот за да додадете повеќе.",
                    "Kufiri i ekipit është arritur. Çaktivizoni një anëtar të ekipit për të shtuar më shumë.",
                  )
              : planStatus.canUseStaffRole
                ? t(
                    "1 owner + 3 staff, 4 people total. Managers count as staff; inactive members do not use a slot.",
                    "1 сопственик + 3 вработени, вкупно 4 лица. Менаџерите се бројат како вработени; неактивните членови не зафаќаат место.",
                    "1 pronar + 3 staf, gjithsej 4 persona. Menaxherët llogariten si staf; anëtarët joaktivë nuk zënë vend.",
                  )
                : t(
                    "Staff limit reached. Deactivate a team member or upgrade to OPUS Pro to add more.",
                    "Лимитот за вработени е достигнат. Деактивирајте член на тимот или преминете на OPUS Pro за да додадете повеќе.",
                    "Kufiri i stafit është arritur. Çaktivizoni një anëtar të ekipit ose përmirësoni në OPUS Pro për të shtuar më shumë.",
                  )}
          </p>
        </footer>
      )}
    </>
  );
}
