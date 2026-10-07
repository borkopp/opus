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
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { SettingsCard, SettingsToggleRow } from "../SettingsCard";

interface GapOptimizerTabProps {
  orgId: Id<"orgs">;
  isPaid: boolean;
  initialData: {
    gapOptimizerEnabled: boolean;
    gapOptimizerMinGapMins: number;
  };
}

export function GapOptimizerTab({
  orgId,
  isPaid,
  initialData,
}: GapOptimizerTabProps) {
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
    if (!isPaid || isSaving) return;
    if (
      !Number.isInteger(optimizer.minGapMins) ||
      optimizer.minGapMins < 15 ||
      optimizer.minGapMins > 240
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
          "Cilësimet e optimizuesit të hapësirave u ruajtën",
        ),
      );
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : t(
              "Failed to save gap optimizer settings.",
              "Не успеа зачувувањето на поставките за оптимизаторот на празни термини.",
              "Dështoi ruajtja e cilësimeve të optimizuesit të hapësirave.",
            ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TabsContent value="gaps" className="m-0">
      <fieldset disabled={!isPaid || isSaving} className="min-w-0">
        <SettingsCard
          title={t("Gap optimizer", "Оптимизатор на празни термини", "Optimizuesi i hapësirave")}
          action={
            !isPaid && (
              <Badge data-replay-public variant="pro">
                Pro
              </Badge>
            )
          }
          description={t(
            "Find bookable openings in the next seven days. Review a client and approve each email offer before sending.",
            "Пронајдете слободни термини во следните седум дена. Изберете клиент и одобрете ја секоја понуда по е-пошта пред испраќање.",
            "Gjeni orare të rezervueshme në shtatë ditët e ardhshme. Rishikoni një klient dhe miratoni çdo ofertë me email para dërgimit.",
          )}
          contentClassName="flex flex-col gap-6"
          footer={
            isPaid && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                {isSaving
                  ? t("Saving…", "Се зачувува…", "Po ruhet…")
                  : t(
                      "Save optimizer settings",
                      "Зачувај поставки за оптимизатор",
                      "Ruaj cilësimet e optimizuesit",
                    )}
              </Button>
            )
          }
        >
          {!isPaid && (
            <p data-replay-public className="text-sm text-muted-foreground">
              {t(
                "Gap optimizer is included in Pro. Contact OPUS to upgrade and activate it for your studio.",
                "Оптимизаторот на празни термини е дел од Pro. Контактирајте нè за надградба и активирање за вашето студио.",
                "Optimizuesi i hapësirave përfshihet në Pro. Kontaktoni me OPUS për ta përmirësuar dhe aktivizuar për studion tuaj.",
              )}
            </p>
          )}
          <SettingsToggleRow
            title={t(
              "Enable gap optimizer",
              "Овозможи оптимизатор на празни термини",
              "Aktivizo optimizuesin e hapësirave",
            )}
            description={t(
              "Refresh openings after calendar changes. Requires a published studio website, configured email delivery, and client permission. Turning this off cancels outstanding offers.",
              "Освежувај ги слободните термини по промени во распоредот. Потребни се објавена веб-страница, конфигурирана е-пошта и дозвола од клиентот. Исклучувањето ги поништува активните понуди.",
              "Përditësoni oraret e lira pas ndryshimeve në kalendar. Kërkon një faqe interneti të publikuar të studios, dërgim të konfiguruar të email-it dhe lejen e klientit. Çaktivizimi anulon ofertat aktive.",
            )}
            control={
              <Switch
                id="gap-enabled"
                aria-label={t(
                  "Enable gap optimizer",
                  "Овозможи оптимизатор на празни термини",
                  "Aktivizo optimizuesin e hapësirave",
                )}
                checked={isPaid && optimizer.enabled}
                disabled={!isPaid || isSaving}
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
              <FieldLabel data-replay-public htmlFor="min-gap-mins">
                {t(
                  "Minimum gap duration (minutes)",
                  "Минимално времетраење на празнината (минути)",
                  "Kohëzgjatja minimale e hapësirës (minuta)",
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
                disabled={!isPaid || isSaving || !optimizer.enabled}
                onChange={(event) => {
                  setOptimizer((current) => ({
                    ...current,
                    minGapMins: Number.parseInt(event.target.value, 10),
                  }));
                  if (error) setError(undefined);
                }}
              />
              <FieldDescription data-replay-public id="min-gap-description">
                {t(
                  "Shorter openings are ignored so recovery stays focused on useful appointment slots.",
                  "Пократките празнини се игнорираат за пополнувањето да остане фокусирано на корисни термини.",
                  "Hapësirat më të shkurtra injorohen në mënyrë që rikuperimi të mbetet i fokusuar në orare të dobishme terminesh.",
                )}
              </FieldDescription>
              <FieldError>{error}</FieldError>
            </Field>
          </FieldGroup>
        </SettingsCard>
      </fieldset>
    </TabsContent>
  );
}
