"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSettingsDraft } from "@/hooks/use-settings-draft";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SettingsCard } from "@/components/settings/SettingsCard";

export function CurrencySettings({
  orgId,
  currency,
}: {
  orgId: Id<"orgs">;
  currency: string;
}) {
  const { t } = useDashboardI18n();
  const { draft, setDraft, changes, isDirty } = useSettingsDraft({ currency });
  const [saving, setSaving] = useState(false);
  const update = useMutation(api.orgSettings.updateOrgSettings);
  async function save() {
    setSaving(true);
    try {
      await update({ orgId, ...changes });
      toast.success(
        t("Currency saved", "Валутата е зачувана", "Monedha u ruajt"),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              "Could not save currency.",
              "Валутата не е зачувана.",
              "Monedha nuk mund të ruhej.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <SettingsCard
      title={t("Currency", "Валута", "Monedha")}
      description={t(
        "Default currency for new services. Existing service and appointment prices keep their currency.",
        "Стандардна валута за нови услуги. Постојните услуги и термини ја задржуваат својата валута.",
        "Monedha e parazgjedhur për shërbimet e reja. Çmimet ekzistuese ruajnë monedhën e tyre.",
      )}
      footer={
        <Button onClick={save} disabled={saving || !isDirty}>
          {saving && <Spinner data-icon="inline-start" />}
          {t("Save currency", "Зачувај валута", "Ruaj monedhën")}
        </Button>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel id="studio-currency-label">
            {t("Studio currency", "Валута на студиото", "Monedha e studios")}
          </FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            value={draft.currency}
            disabled={saving}
            aria-labelledby="studio-currency-label"
            onValueChange={(value) => {
              if (value) setDraft({ currency: value });
            }}
            className="flex-wrap"
          >
            {["MKD", "EUR", "USD", "GBP"].map((code) => (
              <ToggleGroupItem key={code} value={code}>
                {code}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>
            {t(
              "Changing this does not convert saved prices.",
              "Промената не ги конвертира зачуваните цени.",
              "Ky ndryshim nuk konverton çmimet e ruajtura.",
            )}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </SettingsCard>
  );
}
