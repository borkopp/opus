"use client";

import { Info } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { analystWarning } from "@/lib/i18n/business-assistant";

export function ReportWarnings({ warnings }: { warnings: string[] }) {
  const { t, language } = useDashboardI18n();
  const labels: Record<string, string> = {
    historical_capacity_unavailable: t(
      "Some working hours are missing",
      "Недостига дел од работното време",
      "Mungojnë disa orë pune",
    ),
    small_sample: t("Small sample", "Мал примерок", "Mostër e vogël"),
    unresolved_appointments: t(
      "Some appointment outcomes are unresolved",
      "Дел од термините немаат конечен статус",
      "Disa termine kanë rezultate të papërcaktuara",
    ),
    includes_current_or_future_day: t(
      "Period still in progress",
      "Периодот сè уште трае",
      "Periudha është ende në vazhdim",
    ),
    mixed_currencies: t(
      "Different currencies cannot be combined",
      "Различни валути не се собираат",
      "Valutat e ndryshme nuk mund të kombinohen",
    ),
    comparison_currency_mismatch: t(
      "Periods use different currencies",
      "Периодите користат различни валути",
      "Periudhat përdorin valuta të ndryshme",
    ),
    combined_services: t(
      "Combined services stay together",
      "Комбинираните услуги се прикажани заедно",
      "Shërbimet e kombinuara mbeten bashkë",
    ),
    appointment_value_not_payments: t(
      "Appointment prices, not payments or profit",
      "Цени на термини, а не наплати или добивка",
      "Çmime terminesh, jo pagesa apo fitim",
    ),
    recorded_history_only: t(
      "Based on recorded visits only",
      "Само според евидентирани посети",
      "Vetëm sipas vizitave të regjistruara",
    ),
    weekday_average: t(
      "Weekday values are averages per observed day",
      "Вредностите по ден во неделата се дневни просеци",
      "Vlerat sipas ditës së javës janë mesatare për ditë të vëzhguar",
    ),
    capacity_exceeded: t(
      "Bookings exceed recorded working hours",
      "Термините го надминуваат евидентираното работно време",
      "Rezervimet tejkalojnë orët e regjistruara të punës",
    ),
  };
  if (!warnings.length) return null;
  return (
    <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <p>
        {[...new Set(warnings)]
          .map(
            (warning) => labels[warning] ?? analystWarning(warning, language),
          )
          .join(" · ")}
      </p>
    </div>
  );
}
