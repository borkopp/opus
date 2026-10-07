import { appearStep } from "@/lib/appear";
import type { CSSProperties } from "react";
import type { ClientAnalytics } from "@/lib/dashboard-overview";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetFrame } from "../WidgetFrame";
import s from "../../clarity.module.css";
export function ReturningClientsWidget({
  analytics,
}: {
  analytics: ClientAnalytics | undefined;
}) {
  const { t } = useDashboardI18n();
  const clients = analytics?.clientGrowth.current;
  const percent = clients ? Math.round(clients.returningClientShare) : 0;
  return (
    <WidgetFrame
      replayPublicSubtitle
      replayPublicTitle
      delay={70}
      title={t("Returning clients", "Редовни клиенти", "Klientë të kthyer")}
      subtitle={t(
        "Clients who keep coming back",
        "Клиенти кои повторно се враќаат",
        "Klientët që kthehen përsëri",
      )}
      className={s.returning}
    >
      <div className={s.returningBody}>
        <div
          data-appear="scale"
          className={s.returningRing}
          style={
            { ...appearStep(3), "--progress": `${percent}%` } as CSSProperties
          }
        >
          <span>
            {clients ? percent : "—"}
            <small data-replay-public>%</small>
          </span>
        </div>
        <div>
          <strong data-replay-public data-appear="item" style={appearStep(4)}>
            {t(
              "Strong relationships, built over time.",
              "Добри односи, градени со време.",
              "Marrëdhënie të forta, të ndërtuara me kalimin e kohës.",
            )}
          </strong>
          <p data-appear="item" style={appearStep(5)}>
            {clients
              ? t(
                  `${clients.returningClients} of ${clients.clients} clients returned in the last 30 days.`,
                  `${clients.returningClients} од ${clients.clients} клиенти се вратија во последните 30 дена.`,
                  `${clients.returningClients} nga ${clients.clients} klientë u kthyen në 30 ditët e fundit.`,
                )
              : t("Loading visits…", "Се вчитуваат посетите…", "Po ngarkohen vizitat…")}
          </p>
        </div>
      </div>
    </WidgetFrame>
  );
}
