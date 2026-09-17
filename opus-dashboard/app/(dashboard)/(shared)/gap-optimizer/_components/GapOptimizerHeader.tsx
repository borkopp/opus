"use client";

import { useAction } from "convex/react";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { recoveryErrorMessage } from "@/lib/gap-recovery";

export function GapOptimizerHeader({
  orgId,
  date,
  today,
  onDateChange,
  canScan,
  lastScanAt,
}: {
  orgId: Id<"orgs">;
  date: string;
  today: string;
  onDateChange: (date: string) => void;
  canScan: boolean;
  lastScanAt: number | null;
}) {
  const { t } = useDashboardI18n();
  const scan = useAction(api.ai.gapOptimizer.scanDayForOrg);
  const [busy, setBusy] = useState(false);
  const lastDate = new Date(Date.parse(`${today}T00:00:00Z`) + 6 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  async function scanDay() {
    setBusy(true);
    try {
      const result = await scan({
        orgId,
        serviceDate: date,
        detectedBy: "manual_scan",
      });
      toast.success(
        `${result.gapsFound} ${t("bookable openings found", "пронајдени слободни термини")}`,
      );
    } catch (error) {
      toast.error(recoveryErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  }
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("Fill openings", "Пополнување слободни термини")}
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          {t(
            "Find a service that fits and review who to invite. You approve every email.",
            "Пронајдете соодветна услуга и изберете кого да поканите. Вие ја одобрувате секоја порака.",
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {lastScanAt
            ? `${t("Last scanned", "Последно скенирање")}: ${new Date(lastScanAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : t(
                "This date has not been scanned yet.",
                "Овој датум сè уште не е скениран.",
              )}
        </p>
      </div>
      <div className="flex items-end gap-2">
        <Field className="w-auto">
          <FieldLabel htmlFor="recovery-date">{t("Date", "Датум")}</FieldLabel>
          <Input
            id="recovery-date"
            type="date"
            min={today}
            max={lastDate}
            value={date}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
          />
        </Field>
        <Button onClick={scanDay} disabled={!canScan || busy}>
          {busy ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
          {t("Scan", "Скенирај")}
        </Button>
      </div>
    </header>
  );
}
