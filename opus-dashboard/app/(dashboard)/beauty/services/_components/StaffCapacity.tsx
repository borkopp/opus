"use client";

import type { FunctionReturnType } from "convex/server";
import { motion, useReducedMotion } from "motion/react";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function StaffCapacity({
  status,
}: {
  status: FunctionReturnType<typeof api.staff.getStaffPlanStatus> | undefined;
}) {
  const { t } = useDashboardI18n();
  const reducedMotion = useReducedMotion();
  if (!status) return <Skeleton className="h-24 w-full sm:w-72 rounded-2xl" />;

  const remaining = status.canUseStaffRole
    ? Math.max(
        0,
        status.isFree
          ? Math.min(
              status.staffLimit - status.staffCount,
              status.totalLimit - status.totalCount,
            )
          : status.totalLimit - status.totalCount,
      )
    : 0;

  return (
    <section
      id="staff-plan-limit"
      aria-label={t(
        "Team capacity",
        "Капацитет на тимот",
        "Kapaciteti i ekipit",
      )}
      className="w-full rounded-2xl border border-border/60 bg-card px-4 py-3 sm:w-72"
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium">
          {t("Team capacity", "Капацитет на тимот", "Kapaciteti i ekipit")}
        </span>
        {status.isFree ? (
          <Badge variant="secondary">Free</Badge>
        ) : (
          <Badge variant="pro">Pro</Badge>
        )}
      </div>
      <div className="my-2.5 flex gap-1" aria-hidden="true">
        {Array.from({ length: status.totalLimit }, (_, index) => (
          <div
            key={index}
            className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
          >
            {index < status.totalCount && (
              <motion.div
                className="h-full origin-left rounded-full bg-primary"
                initial={reducedMotion ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 0.25,
                  delay: reducedMotion ? 0 : index * 0.025,
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-2 text-xs" aria-live="polite">
        <span className="tabular-nums">
          {status.totalCount}/{status.totalLimit}{" "}
          {t("active", "активни", "aktivë")}
        </span>
        <span className="text-muted-foreground">
          {t(
            `${remaining} staff slots left`,
            `${remaining} слободни места за тимот`,
            `${remaining} vende të lira për staf`,
          )}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {status.isFree
          ? t(
              "1 owner + 3 staff",
              "1 сопственик + 3 вработени",
              "1 pronar + 3 staf",
            )
          : t(
              "Owners and managers included",
              "Вклучени сопственици и менаџери",
              "Përfshihen pronarët dhe menaxherët",
            )}
        {status.totalCount > status.totalLimit && (
          <>
            {" "}
            ·{" "}
            {t(
              "Over plan limit",
              "Над лимитот на планот",
              "Mbi kufirin e planit",
            )}
          </>
        )}
      </p>
    </section>
  );
}
