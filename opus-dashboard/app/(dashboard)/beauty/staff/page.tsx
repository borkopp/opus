"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";

import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";
import { StaffFormDialog } from "./_components/StaffFormDialog";
import { StaffList } from "./_components/StaffList";
import { StaffPageHeader } from "./_components/StaffPageHeader";
import { StaffPlanFooter } from "./_components/StaffPlanFooter";

export default function StaffPage() {
  const { t } = useDashboardI18n();
  const profile = useQuery(api.users.getMyProfile);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  if (profile === undefined) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (profile === null || !profile.orgId)
    return <div>{t("Not found", "Не е пронајдено")}</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex min-h-full w-full flex-1 flex-col gap-6"
    >
      <StaffPageHeader onAddClick={() => setIsAddStaffOpen(true)} />

      <StaffList
        orgId={profile.orgId}
        onAddClick={() => setIsAddStaffOpen(true)}
        canManageAppointmentEmail={profile.role === "owner"}
      />

      <StaffPlanFooter />

      {isAddStaffOpen && (
        <StaffFormDialog
          orgId={profile.orgId}
          open={isAddStaffOpen}
          canManageAppointmentEmail={profile.role === "owner"}
          onOpenChange={(open) => !open && setIsAddStaffOpen(false)}
        />
      )}
    </motion.div>
  );
}
