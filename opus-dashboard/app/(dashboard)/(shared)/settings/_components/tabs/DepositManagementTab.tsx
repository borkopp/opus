"use client";

import { useState, useEffect, useRef } from "react";
import { CircleAlert, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { validPercentage, validFixedDeposit, type FieldErrors } from "../validation";
import { SettingsCard, SettingsToggleRow } from "../SettingsCard";

interface DepositManagementTabProps {
  orgId: Id<"orgs">;
  initialData: {
    depositRequired: boolean;
    depositType: "fixed" | "percentage";
    depositValue: number;
  };
}

type Fields = "depositValue";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
      <CircleAlert className="shrink-0" />
      {message}
    </p>
  );
}

export function DepositManagementTab({ orgId, initialData }: DepositManagementTabProps) {
  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const [deposits, setDeposits] = useState({
    depositRequired: initialData.depositRequired,
    depositType: initialData.depositType,
    depositValueStr:
      initialData.depositType === "percentage"
        ? initialData.depositValue.toString()
        : (initialData.depositValue / 100).toString(),
  });
  const [errors, setErrors] = useState<FieldErrors<Fields>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDeposits({
      depositRequired: initialData.depositRequired,
      depositType: initialData.depositType,
      depositValueStr:
        initialData.depositType === "percentage"
          ? initialData.depositValue.toString()
          : (initialData.depositValue / 100).toString(),
    });
  }, [initialData.depositRequired, initialData.depositType, initialData.depositValue]);

  const updateDepositSettings = useMutation(api.orgSettings.updateDepositSettings);

  function validate(): FieldErrors<Fields> {
    const errs: FieldErrors<Fields> = {};
    if (!deposits.depositRequired) return errs;
    const val = parseFloat(deposits.depositValueStr);
    if (deposits.depositType === "percentage") {
      if (!validPercentage(val) || val === 0)
        errs.depositValue = "Enter a percentage between 1 and 100.";
    } else {
      if (!validFixedDeposit(val))
        errs.depositValue = "Enter a positive amount greater than 0.";
    }
    return errs;
  }

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setIsSaving(true);
    try {
      const val = parseFloat(deposits.depositValueStr);
      const depositValue =
        deposits.depositType === "percentage"
          ? Math.round(val)
          : Math.round(val * 100);
      await updateDepositSettings({
        orgId,
        depositRequired: deposits.depositRequired,
        depositType: deposits.depositType,
        depositValue,
      });
      if (isMounted.current) toast.success("Deposit settings saved");
    } catch (error) {
      if (isMounted.current) {
        toast.error(error instanceof Error ? error.message : "Failed to save deposit settings.");
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent
      value="deposits"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <SettingsCard
        title="Booking deposits"
        description="Decide whether customers pay upfront to secure an appointment and how that amount is calculated."
        contentClassName="flex flex-col gap-6"
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Spinner /> : <Save />}
            {isSaving ? "Saving…" : "Save deposit settings"}
          </Button>
        }
      >
          <SettingsToggleRow
            title="Require a deposit"
            description="Customers must complete the deposit before their booking is confirmed."
            control={<Switch
              id="deposit-required"
              checked={deposits.depositRequired}
              onCheckedChange={(c) => setDeposits({ ...deposits, depositRequired: c })}
            />}
          />

          {deposits.depositRequired && (
            <div className="grid gap-6 rounded-2xl border border-border/50 bg-background p-5 sm:grid-cols-2">
              <div className="grid gap-2 max-w-sm">
                <Label htmlFor="deposit-type">Calculation Method</Label>
                <Select
                  value={deposits.depositType}
                  onValueChange={(v: "fixed" | "percentage") =>
                    setDeposits({ ...deposits, depositType: v, depositValueStr: "" })
                  }
                >
                  <SelectTrigger id="deposit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                    <SelectItem value="percentage">Percentage of total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 max-w-sm">
                <Label htmlFor="deposit-value">
                  Value{" "}
                  <span className="text-muted-foreground font-normal ml-1">
                    {deposits.depositType === "percentage" ? "(1–100%)" : "(e.g. 25.00)"}
                  </span>
                </Label>
                <DebouncedInput
                  id="deposit-value"
                  type="number"
                  min={deposits.depositType === "percentage" ? 1 : 0.01}
                  max={deposits.depositType === "percentage" ? 100 : undefined}
                  value={deposits.depositValueStr}
                  step={deposits.depositType === "percentage" ? "1" : "0.01"}
                  aria-describedby={errors.depositValue ? "deposit-value-error" : undefined}
                  aria-invalid={!!errors.depositValue}
                  className={cn(errors.depositValue && "border-destructive")}
                  onChange={(val) => {
                    setDeposits({ ...deposits, depositValueStr: val });
                    if (errors.depositValue) {
                      setErrors((current) => ({ ...current, depositValue: undefined }));
                    }
                  }}
                />
                <FieldError id="deposit-value-error" message={errors.depositValue} />
              </div>
            </div>
          )}
      </SettingsCard>
    </TabsContent>
  );
}
