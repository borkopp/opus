import type { DashboardLanguage } from "./types";

interface DashboardNotificationCopyInput {
  type: string;
  title: string;
  body: string;
}

interface DashboardNotificationCopy {
  title: string;
  body: string;
}

function translateNotificationTitle(
  language: "mk" | "sq",
  type: string,
  fallback: string,
): string {
  if (language === "sq") {
    switch (type) {
      case "ai_handoff":
        return "Biseda kërkon vëmendje";
      case "new_booking":
        return fallback === "Booking Rescheduled"
          ? "Termin i ricaktuar"
          : "Termin i ri";
      case "booking_cancelled":
        return "Termin i anuluar";
      case "no_show":
        return "Mosparaqitje";
      default:
        return fallback;
    }
  }

  switch (type) {
    case "ai_handoff":
      return "Разговорот бара внимание";
    case "new_booking":
      return fallback === "Booking Rescheduled"
        ? "Презакажан термин"
        : "Нов термин";
    case "booking_cancelled":
      return "Откажан термин";
    case "no_show":
      return "Непојавување";
    default:
      return fallback;
  }
}

const MACEDONIAN_DATE_TOKEN: Record<string, string> = {
  Mon: "пон.",
  Tue: "вто.",
  Wed: "сре.",
  Thu: "чет.",
  Fri: "пет.",
  Sat: "саб.",
  Sun: "нед.",
  Jan: "јан.",
  Feb: "фев.",
  Mar: "мар.",
  Apr: "апр.",
  May: "мај",
  Jun: "јун.",
  Jul: "јул.",
  Aug: "авг.",
  Sep: "сеп.",
  Sept: "сеп.",
  Oct: "окт.",
  Nov: "ное.",
  Dec: "дек.",
};

const ALBANIAN_DATE_TOKEN: Record<string, string> = {
  Mon: "hën.",
  Tue: "mar.",
  Wed: "mër.",
  Thu: "enj.",
  Fri: "pre.",
  Sat: "sht.",
  Sun: "die.",
  Jan: "jan.",
  Feb: "shk.",
  Mar: "mar.",
  Apr: "pri.",
  May: "maj",
  Jun: "qer.",
  Jul: "kor.",
  Aug: "gus.",
  Sep: "sht.",
  Sept: "sht.",
  Oct: "tet.",
  Nov: "nën.",
  Dec: "dhj.",
};

function translateAppointmentLabel(
  label: string,
  language: "mk" | "sq",
): string {
  const tokenMap =
    language === "sq" ? ALBANIAN_DATE_TOKEN : MACEDONIAN_DATE_TOKEN;
  const atReplacement = language === "sq" ? " në " : " во ";

  return label
    .replace(
      /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b/g,
      (token) => tokenMap[token] ?? token,
    )
    .replace(" at ", atReplacement);
}

function translateNotificationBody(
  language: "mk" | "sq",
  type: string,
  body: string,
): string {
  if (language === "sq") {
    if (type === "ai_handoff")
      return "Një klient po pret përgjigje nga ekipi juaj. Hapni bisedën në kutinë e AI.";
    if (type === "new_booking") {
      const match = body.match(/^(.+?) booked (.+?) with (.+?) for (.+)$/);
      if (match) {
        const [, customer, service, staff, appointment] = match;
        return `${customer} rezervoi ${service} me ${staff} për ${translateAppointmentLabel(appointment, "sq")}.`;
      }

      const rescheduled = body.match(
        /^(.+?)'s (.+?) with (.+?) was rescheduled to (.+)$/,
      );
      if (rescheduled) {
        const [, customer, service, staff, appointment] = rescheduled;
        return `Termini i ${customer} për ${service} me ${staff} u ricaktua për ${translateAppointmentLabel(appointment, "sq")}.`;
      }
    }

    if (type === "booking_cancelled") {
      const match = body.match(
        /^The (.+?) booking for (.+?) on (.+?) was cancelled$/,
      );
      if (match) {
        const [, service, customer, appointment] = match;
        return `Termini i ${customer} për ${service}, i caktuar për ${translateAppointmentLabel(appointment, "sq")}, u anulua.`;
      }
    }

    if (type === "no_show") {
      const match = body.match(/^(.+?) didn't show up for (.+?) on (.+)$/);
      if (match) {
        const [, customer, service, appointment] = match;
        return `${customer} nuk u paraqit për ${service} më ${translateAppointmentLabel(appointment, "sq")}.`;
      }
    }

    return body;
  }

  if (type === "ai_handoff")
    return "Клиент чека одговор од вашиот тим. Отворете го разговорот во AI сандачето.";
  if (type === "new_booking") {
    const match = body.match(/^(.+?) booked (.+?) with (.+?) for (.+)$/);
    if (match) {
      const [, customer, service, staff, appointment] = match;
      return `${customer} закажа ${service} кај ${staff} за ${translateAppointmentLabel(appointment, "mk")}.`;
    }

    const rescheduled = body.match(
      /^(.+?)'s (.+?) with (.+?) was rescheduled to (.+)$/,
    );
    if (rescheduled) {
      const [, customer, service, staff, appointment] = rescheduled;
      return `Терминот на ${customer} за ${service} кај ${staff} е презакажан за ${translateAppointmentLabel(appointment, "mk")}.`;
    }
  }

  if (type === "booking_cancelled") {
    const match = body.match(
      /^The (.+?) booking for (.+?) on (.+?) was cancelled$/,
    );
    if (match) {
      const [, service, customer, appointment] = match;
      return `Терминот на ${customer} за ${service}, закажан за ${translateAppointmentLabel(appointment, "mk")}, беше откажан.`;
    }
  }

  if (type === "no_show") {
    const match = body.match(/^(.+?) didn't show up for (.+?) on (.+)$/);
    if (match) {
      const [, customer, service, appointment] = match;
      return `${customer} не се појави на терминот за ${service} на ${translateAppointmentLabel(appointment, "mk")}.`;
    }
  }

  return body;
}

/**
 * Localizes the known booking notification templates at render time so both
 * existing and newly-created dashboard notifications follow the selected UI
 * language without changing the persisted audit-facing notification payload.
 */
export function getDashboardNotificationCopy(
  language: DashboardLanguage,
  notification: DashboardNotificationCopyInput,
): DashboardNotificationCopy {
  if (language === "en") {
    return {
      title: notification.title,
      body: notification.body,
    };
  }

  return {
    title: translateNotificationTitle(language, notification.type, notification.title),
    body: translateNotificationBody(language, notification.type, notification.body),
  };
}
