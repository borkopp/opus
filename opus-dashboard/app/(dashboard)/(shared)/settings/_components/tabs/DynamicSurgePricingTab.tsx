"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { SettingsCard, SettingsToggleRow } from "../SettingsCard";

interface DynamicSurgePricingTabProps {
  orgId: Id<"orgs">;
  initialData: {
    surgePricingEnabled: boolean;
    surgeRules: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      multiplierPct: number;
    }>;
  };
}

export function DynamicSurgePricingTab({ orgId, initialData }: DynamicSurgePricingTabProps) {
  const [surge, setSurge] = useState({
    surgePricingEnabled: initialData.surgePricingEnabled,
    surgeRules: initialData.surgeRules,
  });
  const [isSaving, setIsSaving] = useState(false);

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save surge pricing.");
    }
    setIsSaving(false);
  };

  return (
    <TabsContent
      value="surge"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <SettingsCard
        title="Surge pricing"
        description="Apply account-managed pricing rules during peak demand periods."
        contentClassName="flex flex-col gap-6"
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Spinner /> : <Save />}
            {isSaving ? "Saving…" : "Save pricing settings"}
          </Button>
        }
      >
          <SettingsToggleRow
            title="Enable surge pricing"
            description="Automatically adjust service prices when an active peak-demand rule applies."
            control={<Switch
              id="surge-enabled"
              checked={surge.surgePricingEnabled}
              onCheckedChange={(c) =>
                setSurge({ ...surge, surgePricingEnabled: c })
              }
            />}
          />

          {surge.surgePricingEnabled && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/50 bg-background p-5">
              <div>
                <p className="text-sm font-medium">Managed pricing rules</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Your account team configures these rules and OPUS applies
                  them automatically.
                </p>
              </div>
              <Badge variant="secondary">
                {surge.surgeRules.length} active
              </Badge>
            </div>
          )}
      </SettingsCard>
    </TabsContent>
  );
}
