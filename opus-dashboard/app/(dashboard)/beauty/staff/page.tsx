"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { PlusIcon } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";
import { StaffFormDialog } from "./_components/StaffFormDialog";
import { StaffList } from "./_components/StaffList";

export default function StaffPage() {
  const { t } = useDashboardI18n();
  const profile = useQuery(api.users.getMyProfile);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  if (profile === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col gap-6"
    >
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
          onClick={() => setIsAddStaffOpen(true)}
          className="w-full transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none sm:w-auto"
        >
          <PlusIcon data-icon="inline-start" />
          {t("Add staff member", "Додај вработен")}
        </Button>
      </header>

      <StaffList
        orgId={profile.orgId}
        onAddClick={() => setIsAddStaffOpen(true)}
        canManageAppointmentEmail={profile.role === "owner"}
      />

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
