import type { Metric } from "@/convex/analyst/contracts";
import type { DashboardLanguage } from "./types";

export const analystMetricLabels: Record<
  Metric,
  { en: string; mk: string; sq: string }
> = {
  completed_value: {
    en: "Completed appointment value",
    mk: "Вредност на завршени термини",
    sq: "Vlera e termineve të përfunduara",
  },
  appointments: { en: "Appointments", mk: "Термини", sq: "Terminet" },
  completed_appointments: {
    en: "Completed appointments",
    mk: "Завршени термини",
    sq: "Terminet e përfunduara",
  },
  cancellations: {
    en: "Cancelled appointments",
    mk: "Откажани термини",
    sq: "Terminet e anuluara",
  },
  no_shows: {
    en: "Missed appointments",
    mk: "Недоаѓања",
    sq: "Mosparaqitjet",
  },
  cancellation_rate: {
    en: "Cancellation rate",
    mk: "Стапка на откажување",
    sq: "Shkalla e anulimeve",
  },
  no_show_rate: {
    en: "No-show rate",
    mk: "Стапка на недоаѓање",
    sq: "Shkalla e mosparaqitjes",
  },
  utilisation: {
    en: "Booked capacity",
    mk: "Зафатеност",
    sq: "Kapaciteti i rezervuar",
  },
  returning_clients: {
    en: "Returning clients",
    mk: "Клиенти со претходна посета",
    sq: "Klientë të kthyer",
  },
  returning_client_share: {
    en: "Returning client share",
    mk: "Удел на редовни клиенти",
    sq: "Përqindja e klientëve të kthyer",
  },
};

const warnings: Record<string, { en: string; mk: string; sq: string }> = {
  historical_capacity_unavailable: {
    en: "Historical working hours are not recorded for all these dates. Capacity is unavailable where hours cannot be verified; weekday averages may include closed days.",
    mk: "Нема евиденција за работното време за сите датуми. За тие денови зафатеноста не е достапна, а просекот по ден може да вклучува неработни денови.",
    sq: "Orari historik i punës nuk është i regjistruar për të gjitha këto data. Kapaciteti nuk është i disponueshëm aty ku orët nuk mund të verifikohen; mesataret ditore mund të përfshijnë ditët e mbyllura.",
  },
  small_sample: {
    en: "Few appointments in this period. Treat patterns as tentative.",
    mk: "Има малку термини во периодов. Заклучоците се прелиминарни.",
    sq: "Pak termine në këtë periudhë. Merrini modelet si tentative.",
  },
  unresolved_appointments: {
    en: "Some past appointments are still marked confirmed. Update their outcomes for a more complete picture.",
    mk: "Дел од минатите термини сè уште се означени како потврдени. Ажурирајте го нивниот исход за поточна анализа.",
    sq: "Disa termine të kaluara janë ende të shënuara si të konfirmuara. Përditësoni rezultatet e tyre për një pamje më të plotë.",
  },
  includes_current_or_future_day: {
    en: "This period includes today or future dates; outcomes are not final.",
    mk: "Периодов вклучува денешни или идни датуми; исходите не се конечни.",
    sq: "Kjo periudhë përfshin ditën e sotme ose data të ardhshme; rezultatet nuk janë përfundimtare.",
  },
  mixed_currencies: {
    en: "Appointments use different currencies. A combined monetary total is unavailable.",
    mk: "Термините се во различни валути. Заедничкиот паричен износ не е достапен.",
    sq: "Terminet përdorin valuta të ndryshme. Një shumë e përbashkët monetare nuk është e disponueshme.",
  },
  comparison_currency_mismatch: {
    en: "The periods use different currencies. Monetary change is unavailable.",
    mk: "Периодите користат различни валути. Паричната промена не е достапна.",
    sq: "Periudhat përdorin valuta të ndryshme. Ndryshimi monetar nuk është i disponueshëm.",
  },
  combined_services: {
    en: "Combined services stay together because the booking has one total price.",
    mk: "Комбинираните услуги се прикажани заедно бидејќи терминот има една вкупна цена.",
    sq: "Shërbimet e kombinuara qëndrojnë së bashku sepse rezervimi ka një çmim total.",
  },
  appointment_value_not_payments: {
    en: "Values use completed appointment prices, not collected payments or profit.",
    mk: "Износите се според цените на завршените термини, а не според наплатите или добивката.",
    sq: "Vlerat përdorin çmimet e termineve të përfunduara, jo pagesat e mbledhura ose fitimin.",
  },
  recorded_history_only: {
    en: "Returning clients are identified from completed visits recorded in OPUS.",
    mk: "Редовните клиенти се утврдени според завршените посети евидентирани во OPUS.",
    sq: "Klientët e kthyer identifikohen nga vizitat e përfunduara të regjistruara në OPUS.",
  },
  weekday_average: {
    en: "Weekday appointment counts and values are averages per observed day; the summary remains a total.",
    mk: "Бројките и износите по ден во неделата се просеци по набљудуван ден; резимето е вкупен износ.",
    sq: "Numri dhe vlerat e termineve për ditët e javës janë mesatare për çdo ditë të vëzhguar; përmbledhja mbetet një total.",
  },
  capacity_exceeded: {
    en: "Booked time exceeds recorded capacity. Check schedules and appointment durations.",
    mk: "Закажаното време го надминува евидентираниот капацитет. Проверете ги распоредите и траењето на термините.",
    sq: "Koha e rezervuar tejkalon kapacitetin e regjistruar. Kontrolloni oraret dhe kohëzgjatjet e termineve.",
  },
};

const errors: Record<string, { en: string; mk: string; sq: string }> = {
  ANALYST_NOT_CONFIGURED: {
    en: "The business assistant could not start a new analysis. Please try again later.",
    mk: "Деловниот асистент не успеа да започне нова анализа. Обидете се подоцна.",
    sq: "Asistenti i biznesit nuk mundi të fillonte një analizë të re. Ju lutemi provoni përsëri më vonë.",
  },
  ANALYST_BUSY: {
    en: "An analysis is already running for your studio. Please wait for it to finish.",
    mk: "Веќе се подготвува анализа за вашето студио. Почекајте да заврши.",
    sq: "Një analizë tashmë po ekzekutohet për studion tuaj. Ju lutemi prisni të përfundojë.",
  },
  ANALYST_RATE_LIMIT: {
    en: "Please wait a minute before asking another question.",
    mk: "Почекајте една минута пред следното прашање.",
    sq: "Ju lutemi prisni një minutë para se të bëni një pyetje tjetër.",
  },
  ANALYST_ALLOWANCE_REACHED: {
    en: "Your studio has reached its monthly analysis allowance. It renews on the date shown above.",
    mk: "Вашето студио го достигна месечниот лимит за анализи. Се обновува на датумот прикажан погоре.",
    sq: "Studioja juaj ka arritur kufirin mujor të analizave. Ai rinovohet në datën e shfaqur më sipër.",
  },
  ANALYST_CONVERSATION_FULL: {
    en: "Start a new conversation to continue. This conversation has reached its limit.",
    mk: "Започнете нов разговор за да продолжите. Овој разговор го достигна лимитот.",
    sq: "Filloni një bisedë të re për të vazhduar. Kjo bisedë ka arritur kufirin e saj.",
  },
  ANALYST_INVALID_MESSAGE: {
    en: "Enter a question of up to 2,000 characters.",
    mk: "Внесете прашање до 2.000 знаци.",
    sq: "Shkruani një pyetje me deri në 2,000 karaktere.",
  },
  ANALYST_ACCESS_CHANGED: {
    en: "Your access has changed. Please refresh the page.",
    mk: "Вашиот пристап е променет. Освежете ја страницата.",
    sq: "Qasja juaj ka ndryshuar. Ju lutemi rifreskoni faqen.",
  },
  ANALYST_CONTEXT_LIMIT: {
    en: "This analysis is too large. Try a shorter period or a more focused question.",
    mk: "Анализата е преголема. Изберете пократок период или поконкретно прашање.",
    sq: "Kjo analizë është shumë e madhe. Provoni një periudhë më të shkurtër ose një pyetje më të përqendruar.",
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
    (language === "sq"
      ? "Analiza nuk mund të përfundonte. Kjo përgjigje nuk u zbrit nga kufiri juaj. Ju lutemi provoni përsëri."
      : language === "mk"
        ? "Анализата не можеше да се заврши. Одговорот не е одземен од вашиот лимит. Обидете се повторно."
        : "The analysis could not be completed. This answer was not deducted from your allowance. Please try again.")
  );
}
