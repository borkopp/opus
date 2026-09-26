import { appearStep } from "@/lib/appear";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetFrame } from "../WidgetFrame";
import { Badge } from "@/components/ui/badge";
import s from "../../clarity.module.css";
export function FrontDeskWidget({ paid }: { paid: boolean }) {
  const { t } = useDashboardI18n();
  // TODO: Connect the deferred front desk only after explicit product authorization
  // and provider verification. This concept has no live conversations or actions.
  return (
    <WidgetFrame
      replayPublicSubtitle
      replayPublicTitle
      delay={90}
      title={t("AI front desk", "AI рецепција")}
      subtitle={t(
        "Client conversations and team handoffs",
        "Разговори со клиенти и предавање на тимот",
      )}
      action={
        !paid && (
          <Badge data-replay-public variant="pro">
            Pro
          </Badge>
        )
      }
    >
      <div className="mt-5 flex flex-col items-start gap-3">
        <p
          data-replay-public
          data-appear="item"
          style={appearStep(4)}
          className="text-sm leading-6 text-muted-foreground"
        >
          {t(
            "Let AI answer your Instagram DMs and book appointments for you, 24/7.",
            "Оставете AI да одговара на вашите Instagram пораки и да закажува термини за вас, 24/7.",
          )}
        </p>
      </div>
      {!paid && (
        <p
          data-appear="item"
          style={appearStep(5)}
          className="mt-5 flex flex-col items-start gap-2 border-t border-border/60 pt-4 text-xs leading-5 text-muted-foreground"
        >
          <a
            data-replay-public
            href="https://opus.mk/#pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            {t("Learn more", "Дознај повеќе")}
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </p>
      )}
      {paid ? (
        <Link
          data-replay-public
          data-appear="item"
          style={appearStep(6)}
          href="/settings?tab=ai"
          className={`${s.clientButton} mt-5`}
        >
          {t("Front-desk settings", "Поставки за рецепцијата")}
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      ) : (
        <button
          data-replay-public
          data-appear="item"
          style={appearStep(6)}
          disabled
          type="button"
          className={`${s.clientButton} mt-5 opacity-50`}
        >
          {t("Front-desk settings", "Поставки за рецепцијата")}
          <ArrowUpRight size={17} aria-hidden="true" />
        </button>
      )}
    </WidgetFrame>
  );
}
