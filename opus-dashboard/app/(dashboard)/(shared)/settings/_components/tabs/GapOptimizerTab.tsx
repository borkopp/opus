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
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { SettingsCard, SettingsToggleRow } from "../SettingsCard";

interface GapOptimizerTabProps {
  orgId: Id<"orgs">;
  initialData: {
    gapOptimizerEnabled: boolean;
    gapOptimizerMinGapMins: number;
  };
}

export function GapOptimizerTab({ orgId, initialData }: GapOptimizerTabProps) {
  const { t } = useDashboardI18n();
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
      setError(
        t(
          "Enter a whole number between 15 and 240 minutes.",
          "Внесете цел број помеѓу 15 и 240 минути.",
        ),
      );
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
      toast.success(
        t(
          "Gap optimizer settings saved",
          "Поставките за оптимизаторот на празни термини се зачувани",
        ),
      );
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : t(
              "Failed to save gap optimizer settings.",
              "Не успеа зачувувањето на поставките за оптимизаторот на празни термини.",
            ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TabsContent value="gaps" className="m-0">
      <SettingsCard
        title={t("Gap optimizer", "Оптимизатор на празни термини")}
        description={t(
          "Choose which openings are large enough for OPUS to consider in cancellation-recovery workflows.",
          "Изберете кои празнини во распоредот се доволно долги за OPUS да ги земе предвид при пополнување откажани термини.",
        )}
        contentClassName="flex flex-col gap-6"
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {isSaving
              ? t("Saving…", "Се зачувува…")
              : t("Save optimizer settings", "Зачувај поставки за оптимизатор")}
          </Button>
        }
      >
        <SettingsToggleRow
          title={t(
            "Enable gap optimizer",
            "Овозможи оптимизатор на празни термини",
          )}
          description={t(
            "Scan for eligible openings when a cancellation creates space in the schedule.",
            "Пребарувај соодветни слободни термини кога некое откажување ќе ослободи простор во распоредот.",
          )}
          control={
            <Switch
              id="gap-enabled"
              aria-label={t(
                "Enable gap optimizer",
                "Овозможи оптимизатор на празни термини",
              )}
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
              {t(
                "Minimum gap duration (minutes)",
                "Минимално времетраење на празнината (минути)",
              )}
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
              {t(
                "Shorter openings are ignored so recovery stays focused on useful appointment slots.",
                "Пократките празнини се игнорираат за пополнувањето да остане фокусирано на корисни термини.",
              )}
            </FieldDescription>
            <FieldError>{error}</FieldError>
          </Field>
        </FieldGroup>
      </SettingsCard>
    </TabsContent>
  );
}
