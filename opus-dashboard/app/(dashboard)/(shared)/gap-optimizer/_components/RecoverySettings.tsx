"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { SettingsToggleRow } from "@/components/settings/SettingsCard";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useSettingsDraft } from "@/hooks/use-settings-draft";

export function RecoverySettings({ orgId }: { orgId: Id<"orgs"> }) {
  const data = useQuery(api.orgSettings.getOrgSettings, { orgId });
  if (data === undefined) return <Skeleton className="h-16 w-full" />;
  if (!data?.settings) return null;
  return (
    <RecoverySettingsForm
      key={orgId}
      orgId={orgId}
      initialData={{
        enabled: data.settings.gapOptimizerEnabled ?? false,
        minGapMins: data.settings.gapOptimizerMinGapMins ?? 30,
      }}
    />
  );
}

function RecoverySettingsForm({
  orgId,
  initialData,
}: {
  orgId: Id<"orgs">;
  initialData: { enabled: boolean; minGapMins: number };
}) {
  const { t } = useDashboardI18n();
  const searchParams = useSearchParams();
  const { draft, setDraft, isDirty } = useSettingsDraft(initialData);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const update = useMutation(api.orgSettings.updateGapOptimizerSettings);

  async function save() {
    if (saving || !isDirty) return;
    if (
      !Number.isInteger(draft.minGapMins) ||
      draft.minGapMins < 15 ||
      draft.minGapMins > 240
    ) {
      setError(
        t(
          "Enter a whole number between 15 and 240 minutes.",
          "Внесете цел број помеѓу 15 и 240 минути.",
          "Vendosni një numër të plotë midis 15 dhe 240 minutave.",
        ),
      );
      return;
    }
    setSaving(true);
    try {
      await update({
        orgId,
        gapOptimizerEnabled: draft.enabled,
        gapOptimizerMinGapMins: draft.minGapMins,
      });
      toast.success(
        t(
          "Recovery settings saved",
          "Поставките за пополнување се зачувани",
          "Cilësimet e rikuperimit u ruajtën",
        ),
      );
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : t(
              "Could not save recovery settings.",
              "Поставките за пополнување не се зачуваа.",
              "Cilësimet e rikuperimit nuk u ruajtën.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Disclosure
      id="recovery-settings"
      open={
        !initialData.enabled ||
        searchParams.get("settings") === "open" ||
        undefined
      }
      title={t(
        "Recovery settings",
        "Поставки за пополнување",
        "Cilësimet e rikuperimit",
      )}
      description={
        initialData.enabled
          ? t(
              "On · Review and approve each offer before sending.",
              "Вклучено · Прегледајте и одобрете ја секоја понуда пред испраќање.",
              "Aktive · Shqyrtoni dhe miratoni çdo ofertë para dërgimit.",
            )
          : t(
              "Off · Enable recovery to find bookable openings.",
              "Исклучено · Вклучете го пополнувањето за да најдете слободни термини.",
              "Joaktive · Aktivizoni rikuperimin për të gjetur orare të lira.",
            )
      }
    >
      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-5">
        <SettingsToggleRow
          title={t(
            "Opening recovery",
            "Пополнување слободни термини",
            "Rikuperimi i hapësirave",
          )}
          description={t(
            "Refresh openings after calendar changes. Each email offer needs your approval. Turning this off cancels outstanding offers.",
            "Освежувајте ги слободните термини по промени во распоредот. Секоја понуда бара ваше одобрение. Исклучувањето ги поништува активните понуди.",
            "Përditësoni oraret e lira pas ndryshimeve në kalendar. Çdo ofertë kërkon miratimin tuaj. Çaktivizimi anulon ofertat aktive.",
          )}
          control={
            <Switch
              id="gap-enabled"
              aria-label={t(
                "Opening recovery",
                "Пополнување слободни термини",
                "Rikuperimi i hapësirave",
              )}
              checked={draft.enabled}
              onCheckedChange={(enabled) =>
                setDraft((current) => ({ ...current, enabled }))
              }
            />
          }
        />
        <Disclosure
          title={t(
            "Minimum opening length",
            "Минимално времетраење",
            "Gjatësia minimale e hapësirës",
          )}
        >
          <FieldGroup className="max-w-sm">
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="min-gap-mins">
                {t("Minutes", "Минути", "Minuta")}
              </FieldLabel>
              <Input
                id="min-gap-mins"
                type="number"
                min={15}
                max={240}
                step={1}
                value={
                  Number.isFinite(draft.minGapMins) ? draft.minGapMins : ""
                }
                disabled={!draft.enabled}
                aria-invalid={Boolean(error)}
                aria-describedby="min-gap-description"
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    minGapMins:
                      event.target.value === ""
                        ? Number.NaN
                        : Number(event.target.value),
                  }));
                  setError(undefined);
                }}
              />
              <FieldDescription id="min-gap-description">
                {t(
                  "Ignore shorter openings. We still check which services fit each available slot.",
                  "Игнорирајте пократки празнини. Се проверува кои услуги се вклопуваат во секој слободен термин.",
                  "Injoroni hapësirat më të shkurtra. Kontrollojmë cilat shërbime përshtaten në çdo orar.",
                )}
              </FieldDescription>
              <FieldError>{error}</FieldError>
            </Field>
          </FieldGroup>
        </Disclosure>
        <Button
          className="w-full sm:w-fit"
          onClick={save}
          disabled={!isDirty || saving}
        >
          {saving && <Spinner data-icon="inline-start" />}
          {t(
            "Save recovery settings",
            "Зачувај поставки за пополнување",
            "Ruaj cilësimet e rikuperimit",
          )}
        </Button>
      </fieldset>
    </Disclosure>
  );
}
