"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
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

export function DynamicSurgePricingTab({
  orgId,
  initialData,
}: DynamicSurgePricingTabProps) {
  const [surge, setSurge] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const updateSurgePricingRules = useMutation(
    api.orgSettings.updateSurgePricingRules,
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSurgePricingRules({ orgId, ...surge });
      toast.success("Surge pricing saved");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save surge pricing.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TabsContent value="surge" className="m-0">
      <SettingsCard
        title="Surge pricing"
        description="Turn your existing peak-demand pricing rules on or off."
        contentClassName="flex flex-col gap-6"
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {isSaving ? "Saving…" : "Save pricing settings"}
          </Button>
        }
      >
        <SettingsToggleRow
          title="Enable surge pricing"
          description="Apply configured price adjustments when a peak-demand rule matches a booking."
          control={
            <Switch
              id="surge-enabled"
              aria-label="Enable surge pricing"
              checked={surge.surgePricingEnabled}
              onCheckedChange={(checked) =>
                setSurge((current) => ({
                  ...current,
                  surgePricingEnabled: checked,
                }))
              }
            />
          }
        />

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/30 p-4">
          <div>
            <p className="text-sm font-medium">Configured rules</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Rules are applied only while surge pricing is enabled.
            </p>
          </div>
          <Badge variant="secondary">
            {surge.surgeRules.length === 1
              ? "1 rule"
              : `${surge.surgeRules.length} rules`}
          </Badge>
        </div>
      </SettingsCard>
    </TabsContent>
  );
}
