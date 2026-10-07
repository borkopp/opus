"use client";

import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StaffDetailsForm } from "./StaffDetailsForm";

/** Creation only. Existing members are managed in one staff workspace. */
export function StaffFormDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: Id<"orgs">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useDashboardI18n();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-panel max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("Add a staff member", "Додај вработен", "Shto një anëtar stafi")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Add their details and optional login. Set working hours next.",
              "Додајте детали и опционална најава. Следно поставете работно време.",
              "Shtoni detajet dhe hyrjen opsionale. Vendosni orarin më pas.",
            )}
          </DialogDescription>
        </DialogHeader>
        <StaffDetailsForm
          orgId={orgId}
          onCancel={() => onOpenChange(false)}
          onSaved={(id) => {
            onOpenChange(false);
            router.push(`/beauty/staff/${id}?tab=hours`);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
