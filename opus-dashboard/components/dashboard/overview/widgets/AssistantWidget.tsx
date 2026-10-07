import { useQuery } from "convex/react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetFrame } from "../WidgetFrame";
import { FeatureCardContent } from "../FeatureCardContent";
export function AssistantWidget() {
  const { t } = useDashboardI18n();
  const access = useQuery(api.analyst.conversations.getAccess, {});
  if (access && !access.allowed) return null;
  return (
    <WidgetFrame
      replayPublicSubtitle
      replayPublicTitle
      delay={0}
      className="flex flex-col"
      title={t("Business assistant", "Деловен асистент", "Asistenti i biznesit")}
      subtitle={t(
        "A clearer view of your studio",
        "Појасен поглед на вашето студио",
        "Një pamje më e qartë e studios suaj",
      )}
      action={
        access?.paid === false && (
          <Badge data-replay-public variant="pro">
            Pro
          </Badge>
        )
      }
    >
      <FeatureCardContent
        status={
          !access
            ? t("Checking availability…", "Се проверува достапноста…", "Po kontrollohet disponueshmëria…")
            : !access.paid
              ? null
              : !access.configured
                ? t("Temporarily unavailable", "Привремено недостапно", "Përkohësisht e padisponueshme")
                : t(
                    `${access.remaining} answers available`,
                    `${access.remaining} достапни одговори`,
                    `${access.remaining} përgjigje të disponueshme`,
                  )
        }
        description={
          access?.paid && !access.configured
            ? t(
                "New analyses are unavailable. Your saved reports are still here.",
                "Новите анализи се недостапни. Зачуваните извештаи се тука.",
                "Analizat e reja nuk janë të disponueshme. Raportet tuaja të ruajtura janë ende këtu.",
              )
            : t(
                "Explore appointment trends, service performance, and client visits.",
                "Анализирајте ги трендовите на термините, услугите и посетите на клиентите.",
                "Eksploroni prirjet e termineve, performancën e shërbimeve dhe vizitat e klientëve.",
              )
        }
        href={
          access && !access.paid
            ? "https://opus.mk/#pricing"
            : "/beauty/assistant"
        }
        external={!!access && !access.paid}
        actionLabel={
          access && !access.paid
            ? t("Learn more", "Дознај повеќе", "Mësoni më shumë")
            : t("Open assistant", "Отвори асистент", "Hap asistentin")
        }
      />
    </WidgetFrame>
  );
}
