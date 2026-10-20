"use client";

import { Component, type ReactNode } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";

/** Analytics limits must not remove access to the independent client directory. */
export class AnalyticsQueryBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <AnalyticsUnavailable
          onRetry={() => this.setState({ failed: false })}
        />
      );
    }
    return this.props.children;
  }
}

function AnalyticsUnavailable({ onRetry }: { onRetry: () => void }) {
  const { t } = useDashboardI18n();
  return (
    <section
      role="alert"
      className="mb-6 flex flex-col items-start gap-4 rounded-3xl bg-card p-6"
    >
      <div className="flex items-center gap-3">
        <ChartNoAxesCombined
          aria-hidden
          className="size-5 text-muted-foreground"
        />
        <h1>
          {t(
            "Analytics couldn’t load",
            "Аналитиката не се вчита",
            "Analitika nuk mund të ngarkohej",
          )}
        </h1>
      </div>
      <p className="max-w-xl text-sm text-muted-foreground">
        {t(
          "Charts and reports couldn’t load. You can still use your client directory below. Try again, or contact support if this continues.",
          "Графиконите и извештаите не се вчитаа. Именикот на клиенти подолу останува достапен. Обидете се повторно или контактирајте со поддршката ако проблемот продолжи.",
          "Grafikët dhe raportet nuk u ngarkuan. Mund të vazhdoni të përdorni regjistrin e klientëve më poshtë. Provoni përsëri ose kontaktoni mbështetjen nëse vazhdon.",
        )}
      </p>
      <Button onClick={onRetry} variant="outline">
        {t("Try again", "Обиди се повторно", "Provo përsëri")}
      </Button>
    </section>
  );
}
