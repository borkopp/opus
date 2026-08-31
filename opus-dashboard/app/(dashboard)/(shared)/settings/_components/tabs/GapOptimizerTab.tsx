"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
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
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const updateSettings = useMutation(
    api.orgSettings.updateGapOptimizerSettings,
  );

  const handleSave = async () => {
    if (
      !Number.isInteger(optimizer.minGapMins) ||
      optimizer.minGapMins < 15 ||
      optimizer.minGapMins > 240
    ) {
      setError("Enter a whole number between 15 and 240 minutes.");
      return;
    }

    setError(undefined);
    setIsSaving(true);
    try {
      await updateSettings({
        orgId,
        gapOptimizerEnabled: optimizer.enabled,
        gapOptimizerMinGapMins: optimizer.minGapMins,
      });
      toast.success("Gap optimizer settings saved");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Failed to save gap optimizer settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TabsContent value="gaps" className="m-0">
      <SettingsCard
        title="Gap optimizer"
        description="Choose which openings are large enough for OPUS to consider in cancellation-recovery workflows."
        contentClassName="flex flex-col gap-6"
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {isSaving ? "Saving…" : "Save optimizer settings"}
          </Button>
        }
      >
        <SettingsToggleRow
          title="Enable gap optimizer"
          description="Scan for eligible openings when a cancellation creates space in the schedule."
          control={
            <Switch
              id="gap-enabled"
              aria-label="Enable gap optimizer"
              checked={optimizer.enabled}
              onCheckedChange={(checked) =>
                setOptimizer((current) => ({
                  ...current,
                  enabled: checked,
                }))
              }
            />
          }
        />

        <FieldGroup className="max-w-xl">
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="min-gap-mins">
              Minimum gap duration (minutes)
            </FieldLabel>
            <Input
              id="min-gap-mins"
              type="number"
              min={15}
              max={240}
              step={15}
              value={optimizer.minGapMins}
              aria-describedby="min-gap-description"
              aria-invalid={Boolean(error)}
              disabled={!optimizer.enabled}
              onChange={(event) => {
                setOptimizer((current) => ({
                  ...current,
                  minGapMins: Number.parseInt(event.target.value, 10),
                }));
                if (error) setError(undefined);
              }}
            />
            <FieldDescription id="min-gap-description">
              Shorter openings are ignored so recovery stays focused on useful
              appointment slots.
            </FieldDescription>
            <FieldError>{error}</FieldError>
          </Field>
        </FieldGroup>
      </SettingsCard>
    </TabsContent>
  );
}
