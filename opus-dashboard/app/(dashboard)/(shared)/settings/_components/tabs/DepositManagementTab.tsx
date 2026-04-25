"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { DebouncedInput } from "@/components/ui/debounced-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconDeviceFloppy, IconAlertCircle } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { validPercentage, validFixedDeposit, type FieldErrors } from "../validation";

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
      <IconAlertCircle size={13} className="shrink-0" />
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
    } catch (e: any) {
      if (isMounted.current) toast.error(e.message ?? "Failed to save deposit settings.");
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent
      value="deposits"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
        <div className="mb-8">
          <h2 className="text-2xl font-medium font-display tracking-tight mb-1">Deposit <span className="serif-accent-inline text-2xl">Management</span></h2>
          <p className="text-sm text-muted-foreground">Require upfront capital to secure a booking.</p>
        </div>
        <div className="space-y-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="deposit-required" className="select-none font-medium cursor-pointer">
                Require Deposit on Booking Creation
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customers must pay upfront before the booking is confirmed.
              </p>
            </div>
            <Switch
              id="deposit-required"
              checked={deposits.depositRequired}
              onCheckedChange={(c) => setDeposits({ ...deposits, depositRequired: c })}
            />
          </div>

          {deposits.depositRequired && (
            <div className="grid gap-6 mt-4 p-6 border border-border/60 rounded-xl bg-background shadow-sm">
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
                  className={cn("bg-white", errors.depositValue && "border-destructive")}
                  onChange={(val) => {
                    setDeposits({ ...deposits, depositValueStr: val });
                    errors.depositValue && setErrors((e) => ({ ...e, depositValue: undefined }));
                  }}
                />
                <FieldError id="deposit-value-error" message={errors.depositValue} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 pt-6 flex">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 rounded-full h-10 px-5 active:scale-[0.98] transition-transform">
            <IconDeviceFloppy size={18} />
            {isSaving ? "Saving…" : "Save Deposit Settings"}
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
