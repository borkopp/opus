import type { Metric } from "@/convex/analyst/contracts";
import type { DashboardLanguage } from "./types";

export const analystMetricLabels: Record<Metric, { en: string; mk: string }> = {
  completed_value: {
    en: "Completed appointment value",
    mk: "Вредност на завршени термини",
  },
  appointments: { en: "Appointments", mk: "Термини" },
  completed_appointments: {
    en: "Completed appointments",
    mk: "Завршени термини",
  },
  cancellations: { en: "Cancelled appointments", mk: "Откажани термини" },
  no_shows: { en: "Missed appointments", mk: "Недоаѓања" },
  cancellation_rate: { en: "Cancellation rate", mk: "Стапка на откажување" },
  no_show_rate: { en: "No-show rate", mk: "Стапка на недоаѓање" },
  utilisation: { en: "Booked capacity", mk: "Зафатеност" },
  returning_clients: {
    en: "Returning clients",
    mk: "Клиенти со претходна посета",
  },
  returning_client_share: {
    en: "Returning client share",
    mk: "Удел на редовни клиенти",
  },
};

const warnings: Record<string, { en: string; mk: string }> = {
  historical_capacity_unavailable: {
    en: "Historical working hours are not recorded for all these dates. Capacity is unavailable where hours cannot be verified; weekday averages may include closed days.",
    mk: "Нема евиденција за работното време за сите датуми. За тие денови зафатеноста не е достапна, а просекот по ден може да вклучува неработни денови.",
  },
  small_sample: {
    en: "Few appointments in this period. Treat patterns as tentative.",
    mk: "Има малку термини во периодов. Заклучоците се прелиминарни.",
  },
  unresolved_appointments: {
    en: "Some past appointments are still marked confirmed. Update their outcomes for a more complete picture.",
    mk: "Дел од минатите термини сè уште се означени како потврдени. Ажурирајте го нивниот исход за поточна анализа.",
  },
  includes_current_or_future_day: {
    en: "This period includes today or future dates; outcomes are not final.",
    mk: "Периодов вклучува денешни или идни датуми; исходите не се конечни.",
  },
  mixed_currencies: {
    en: "Appointments use different currencies. A combined monetary total is unavailable.",
    mk: "Термините се во различни валути. Заедничкиот паричен износ не е достапен.",
  },
  comparison_currency_mismatch: {
    en: "The periods use different currencies. Monetary change is unavailable.",
    mk: "Периодите користат различни валути. Паричната промена не е достапна.",
  },
  combined_services: {
    en: "Combined services stay together because the booking has one total price.",
    mk: "Комбинираните услуги се прикажани заедно бидејќи терминот има една вкупна цена.",
  },
  appointment_value_not_payments: {
    en: "Values use completed appointment prices, not collected payments or profit.",
    mk: "Износите се според цените на завршените термини, а не според наплатите или добивката.",
  },
  recorded_history_only: {
    en: "Returning clients are identified from completed visits recorded in OPUS.",
    mk: "Редовните клиенти се утврдени според завршените посети евидентирани во OPUS.",
  },
  weekday_average: {
    en: "Weekday appointment counts and values are averages per observed day; the summary remains a total.",
    mk: "Бројките и износите по ден во неделата се просеци по набљудуван ден; резимето е вкупен износ.",
  },
  capacity_exceeded: {
    en: "Booked time exceeds recorded capacity. Check schedules and appointment durations.",
    mk: "Закажаното време го надминува евидентираниот капацитет. Проверете ги распоредите и траењето на термините.",
  },
};

const errors: Record<string, { en: string; mk: string }> = {
  ANALYST_NOT_CONFIGURED: {
    en: "The business assistant is not available yet. Please try again later.",
    mk: "Деловниот асистент сè уште не е достапен. Обидете се подоцна.",
  },
  ANALYST_BUSY: {
    en: "An analysis is already running for your studio. Please wait for it to finish.",
    mk: "Веќе се подготвува анализа за вашето студио. Почекајте да заврши.",
  },
  ANALYST_RATE_LIMIT: {
    en: "Please wait a minute before asking another question.",
    mk: "Почекајте една минута пред следното прашање.",
  },
  ANALYST_ALLOWANCE_REACHED: {
    en: "Your studio has reached its monthly analysis allowance. It renews on the date shown above.",
    mk: "Вашето студио го достигна месечниот лимит за анализи. Се обновува на датумот прикажан погоре.",
  },
  ANALYST_CONVERSATION_FULL: {
    en: "Start a new conversation to continue. This conversation has reached its limit.",
    mk: "Започнете нов разговор за да продолжите. Овој разговор го достигна лимитот.",
  },
  ANALYST_INVALID_MESSAGE: {
    en: "Enter a question of up to 2,000 characters.",
    mk: "Внесете прашање до 2.000 знаци.",
  },
  ANALYST_ACCESS_CHANGED: {
    en: "Your access has changed. Please refresh the page.",
    mk: "Вашиот пристап е променет. Освежете ја страницата.",
  },
  ANALYST_CONTEXT_LIMIT: {
    en: "This analysis is too large. Try a shorter period or a more focused question.",
    mk: "Анализата е преголема. Изберете пократок период или поконкретно прашање.",
  },
};
export function analystWarning(code: string, language: DashboardLanguage) {
  return warnings[code]?.[language] ?? code;
}
export function analystError(error: unknown, language: DashboardLanguage) {
  const text = error instanceof Error ? error.message : String(error);
  const code = text.match(/ANALYST_[A-Z_]+/)?.[0] ?? "";
  return (
    errors[code]?.[language] ??
    (language === "mk"
      ? "Анализата не можеше да се заврши. Одговорот не е одземен од вашиот лимит. Обидете се повторно."
      : "The analysis could not be completed. This answer was not deducted from your allowance. Please try again.")
  );
}
