"use client";

import { Flame } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComingSoonOverlay } from "@/components/ui/coming-soon-overlay";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
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
  initialData,
}: DynamicSurgePricingTabProps) {
  const { t } = useDashboardI18n();

  return (
    <TabsContent value="surge" className="m-0">
      {/* TODO: Wire pricing controls only when dynamic pricing is authorized and operational. */}
      <ComingSoonOverlay
        icon={Flame}
        badgeLabel={t("Coming Soon", "Наскоро", "Së shpejti")}
        description={t(
          "Dynamic surge pricing to automatically adjust rates during peak demand hours will be available in an upcoming update.",
          "Динамичните цени за автоматско прилагодување на цените во часови со голема побарувачка ќе бидат достапни во следно ажурирање.",
          "Çmimet dinamike për përshtatjen automatike të tarifave gjatë orëve të pikut do të jenë të disponueshme në një përditësim të ardhshëm.",
        )}
      >
        <SettingsCard
          title={t("Surge pricing", "Динамични цени", "Çmimet dinamike")}
          description={t(
            "Turn your existing peak-demand pricing rules on or off.",
            "Вклучете или исклучете ги постојните правила за цени во шпиц термини.",
            "Aktivizoni ose çaktivizoni rregullat ekzistuese të çmimeve për periudhat e pikut.",
          )}
          action={
            <Badge
              data-replay-public
              variant="outline"
              className="border-border/80 bg-muted/60 text-xs font-medium text-muted-foreground"
            >
              {t("Coming Soon", "Наскоро", "Së shpejti")}
            </Badge>
          }
          footer={
            <Button data-replay-public disabled>
              {t("Save pricing settings", "Зачувај поставки за цени", "Ruaj cilësimet e çmimeve")}
            </Button>
          }
        >
          <SettingsToggleRow
            title={t("Enable surge pricing", "Овозможи динамични цени", "Aktivizo çmimet dinamike")}
            description={t(
              "Apply configured price adjustments when a peak-demand rule matches a booking.",
              "Примени ги конфигурираните прилагодувања на цените кога правилото за голема побарувачка се совпаѓа со термин.",
              "Aplikoni rregullimet e konfiguruara të çmimit kur një rregull kërkese të lartë përputhet me një rezervim.",
            )}
            control={
              <Switch
                id="surge-enabled"
                aria-label={t(
                  "Enable surge pricing",
                  "Овозможи динамични цени",
                  "Aktivizo çmimet dinamike",
                )}
                disabled
                checked={initialData.surgePricingEnabled}
              />
            }
          />

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/30 p-4">
            <div>
              <p data-replay-public className="text-sm font-medium">
                {t("Configured rules", "Конфигурирани правила", "Rregullat e konfiguruara")}
              </p>
              <p
                data-replay-public
                className="mt-1 text-xs leading-5 text-muted-foreground"
              >
                {t(
                  "Rules are applied only while surge pricing is enabled.",
                  "Правилата се применуваат само додека се овозможени динамичните цени.",
                  "Rregullat zbatohen vetëm përderisa çmimet dinamike janë të aktivizuara.",
                )}
              </p>
            </div>
            <Badge variant="secondary">
              {initialData.surgeRules.length === 1
                ? t("1 rule", "1 правило", "1 rregull")
                : t(
                    `${initialData.surgeRules.length} rules`,
                    `${initialData.surgeRules.length} правила`,
                    `${initialData.surgeRules.length} rregulla`,
                  )}
            </Badge>
          </div>
        </SettingsCard>
      </ComingSoonOverlay>
    </TabsContent>
  );
}
