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
              : planStatus.accessState === "expired"
                ? t(
                    `Trial ended · ${planStatus.totalCount} active team members`,
                    `Пробниот период заврши · ${planStatus.totalCount} активни членови на тимот`,
                    `Prova përfundoi · ${planStatus.totalCount} anëtarë aktivë të ekipit`,
                  )
                : planStatus.accessState === "trial"
                  ? t(
                      `Trial · ${planStatus.totalCount}/${planStatus.totalLimit} active team members`,
                      `Пробен период · ${planStatus.totalCount}/${planStatus.totalLimit} активни членови на тимот`,
                      `Provë · ${planStatus.totalCount}/${planStatus.totalLimit} anëtarë aktivë të ekipit`,
                    )
                  : t(
                      `Pro · ${planStatus.totalCount}/${planStatus.totalLimit} active team members`,
                      `Pro · ${planStatus.totalCount}/${planStatus.totalLimit} активни членови на тимот`,
                      `Pro · ${planStatus.totalCount}/${planStatus.totalLimit} anëtarë aktivë të ekipit`,
                    )}
          </p>
          <p data-replay-public>
            {planStatus.accessState === "expired"
              ? t(
                  "Subscribe before adding or reactivating team members. You can still edit existing profiles or deactivate members.",
                  "Претплатете се пред да додавате или повторно активирате членови. И понатаму можете да уредувате постојни профили или да деактивирате членови.",
                  "Abonohuni para se të shtoni ose riaktivizoni anëtarë. Mund të redaktoni profilet ekzistuese ose të çaktivizoni anëtarë.",
                )
              : !planStatus.isFree
                ? planStatus.canUseStaffRole
                  ? t(
                      `Up to ${planStatus.totalLimit} active team members, including owners and managers. Inactive members do not use a slot.`,
                      `До ${planStatus.totalLimit} активни членови на тимот, вклучувајќи сопственици и менаџери. Неактивните членови не зафаќаат место.`,
                      `Deri në ${planStatus.totalLimit} anëtarë aktivë të ekipit, përfshirë pronarët dhe menaxherët. Anëtarët joaktivë nuk zënë vend.`,
                    )
                  : t(
                      "Team limit reached. Choose a larger Pro package or deactivate a team member to add more.",
                      "Лимитот за тимот е достигнат. Изберете поголем Pro пакет или деактивирајте член на тимот за да додадете повеќе.",
                      "Kufiri i ekipit është arritur. Zgjidhni një paketë më të madhe Pro ose çaktivizoni një anëtar të ekipit për të shtuar më shumë.",
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
