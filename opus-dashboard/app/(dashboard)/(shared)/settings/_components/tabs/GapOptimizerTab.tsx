"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

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

  useEffect(() => {
    setOptimizer({
      enabled: initialData.gapOptimizerEnabled,
      minGapMins: initialData.gapOptimizerMinGapMins,
    });
  }, [initialData.gapOptimizerEnabled, initialData.gapOptimizerMinGapMins]);

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
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSaving(false);
  };

  return (
    <TabsContent
      value="gaps"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0 border-border/40">
        <div className="mb-8">
          <h2 className="text-2xl font-medium font-display tracking-tight mb-1 text-foreground">Gap Optimizer</h2>
          <p className="text-muted-foreground text-sm">
            AI automatically discovers holes in your schedule and privately invites VIP customers to fill them.
          </p>
        </div>
        
        <div className="space-y-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="gap-enabled" className="select-none font-medium cursor-pointer text-foreground">
                Enable AI Gap Optimizer
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically triggers a background scan whenever a booking is cancelled.
              </p>
            </div>
            <Switch
              id="gap-enabled"
              checked={optimizer.enabled}
              onCheckedChange={(c) =>
                setOptimizer({ ...optimizer, enabled: c })
              }
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="min-gap-mins" className="select-none font-medium text-foreground">
                Minimum Gap Duration (minutes)
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[80%]">
                The minimum size of an empty slot before AI considers it a "gap" worth attempting to fill. 
                Shorter durations allow filling more slots, but may crowd your calendar.
              </p>
            </div>
            <div className="w-32">
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
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 flex">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 h-10 px-5 rounded-full font-medium">
            <IconDeviceFloppy size={18} />
            {isSaving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
