"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

interface DynamicSurgePricingTabProps {
  orgId: Id<"orgs">;
  initialData: {
    surgePricingEnabled: boolean;
    surgeRules: any[];
  };
}

export function DynamicSurgePricingTab({ orgId, initialData }: DynamicSurgePricingTabProps) {
  const [surge, setSurge] = useState({
    surgePricingEnabled: initialData.surgePricingEnabled,
    surgeRules: initialData.surgeRules,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSurge({
      surgePricingEnabled: initialData.surgePricingEnabled,
      surgeRules: initialData.surgeRules,
    });
  }, [initialData.surgePricingEnabled, initialData.surgeRules]);

  const updateSurgePricingRules = useMutation(api.orgSettings.updateSurgePricingRules);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSurgePricingRules({
        orgId,
        surgePricingEnabled: surge.surgePricingEnabled,
        surgeRules: surge.surgeRules,
      });
      toast.success("Surge pricing saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSaving(false);
  };

  return (
    <TabsContent
      value="surge"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
        <div className="mb-8">
          <h2 className="text-2xl font-medium font-display tracking-tight mb-1">Dynamic <span className="serif-accent-inline text-2xl">Surge</span> Pricing</h2>
          <p className="text-sm text-muted-foreground">
            Automatically charge more during your busiest hours.
          </p>
        </div>
        <div className="space-y-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="surge-enabled" className="select-none font-medium cursor-pointer">
                Enable Surge Pricing Automation
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically scale service pricing during peak demand periods.
              </p>
            </div>
            <Switch
              id="surge-enabled"
              checked={surge.surgePricingEnabled}
              onCheckedChange={(c) =>
                setSurge({ ...surge, surgePricingEnabled: c })
              }
            />
          </div>

          {surge.surgePricingEnabled && (
            <div className="text-sm text-muted-foreground p-5 border border-dashed border-border/60 rounded-xl bg-background">
              Surge rules are configured by your account team and applied automatically.
              <span className="font-medium mt-2 block text-foreground">
                Active rules: {surge.surgeRules.length}
              </span>
            </div>
          )}
        </div>
        <div className="mt-10 pt-6 flex">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 rounded-full h-10 px-5 active:scale-[0.98] transition-transform">
            <IconDeviceFloppy size={18} />
            {isSaving ? "Saving…" : "Save Pricing Rules"}
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
