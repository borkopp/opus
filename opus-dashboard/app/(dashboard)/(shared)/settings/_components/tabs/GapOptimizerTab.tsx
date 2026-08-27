"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { SettingsCard, SettingsToggleRow } from "../SettingsCard";

interface GapOptimizerTabProps {
  orgId: Id<"orgs">;
  initialData: {
    gapOptimizerEnabled: boolean;
    gapOptimizerMinGapMins: number;
  };
}

export function GapOptimizerTab({ orgId, initialData }: GapOptimizerTabProps) {
  const [optimizer, setOptimizer] = useState({
    enabled: initialData.gapOptimizerEnabled,
    minGapMins: initialData.gapOptimizerMinGapMins,
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateSettings = useMutation(api.orgSettings.updateGapOptimizerSettings);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        orgId,
        gapOptimizerEnabled: optimizer.enabled,
        gapOptimizerMinGapMins: optimizer.minGapMins,
      });
      toast.success("Gap Optimizer settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save gap settings.");
    }
    setIsSaving(false);
  };

  return (
    <TabsContent
      value="gaps"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <SettingsCard
        title="Gap optimizer"
        description="Find useful openings in the calendar and invite suitable customers to fill them."
        contentClassName="flex flex-col gap-6"
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Spinner /> : <Save />}
            {isSaving ? "Saving…" : "Save optimizer settings"}
          </Button>
        }
      >
          <SettingsToggleRow
            title="Enable gap optimizer"
            description="Run a background scan whenever a cancellation creates a new opening."
            control={<Switch
              id="gap-enabled"
              checked={optimizer.enabled}
              onCheckedChange={(c) =>
                setOptimizer({ ...optimizer, enabled: c })
              }
            />}
          />

          <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-background p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <Label htmlFor="min-gap-mins" className="select-none font-medium">
                Minimum gap duration
              </Label>
              <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                Ignore openings shorter than this. A larger threshold keeps
                outreach focused on slots worth filling.
              </p>
            </div>
            <div className="flex w-36 items-center gap-2">
              <Input
                id="min-gap-mins"
                type="number"
                min={15}
                max={240}
                step={15}
                value={optimizer.minGapMins}
                onChange={(e) =>
                  setOptimizer({ ...optimizer, minGapMins: parseInt(e.target.value) || 30 })
                }
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>
      </SettingsCard>
    </TabsContent>
  );
}
