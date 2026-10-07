import type { DashboardLanguage } from "./types";
import { getTranslations } from "./types";
import mk from "./mk";
import al from "./al";

export const MACEDONIAN_DATE_TOKEN = mk.notifications.dateTokens;
export const ALBANIAN_DATE_TOKEN = al.notifications.dateTokens;

interface DashboardNotificationCopyInput {
  type: string;
  title: string;
  body: string;
}

interface DashboardNotificationCopy {
  title: string;
  body: string;
}

function translateAppointmentLabel(
  label: string,
  tokens: Record<string, string>,
  atReplacement: string,
): string {
  return label
    .replace(
      /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b/g,
      (token) => tokens[token] ?? token,
    )
    .replace(" at ", atReplacement);
}

function translateNotificationTitle(
  language: DashboardLanguage,
  type: string,
  fallback: string,
): string {
  const dict = getTranslations(language);
  if (type === "new_booking" && fallback === "Booking Rescheduled") {
    return dict.notifications.titles.booking_rescheduled;
  }
  return (
    dict.notifications.titles[
      type as keyof typeof dict.notifications.titles
    ] ?? fallback
  );
}

function translateNotificationBody(
  language: DashboardLanguage,
  type: string,
  body: string,
): string {
  const dict = getTranslations(language);
  const { dateTokens, at, bodies } = dict.notifications;

  if (type === "ai_handoff") {
    return bodies.ai_handoff;
  }

  if (type === "new_booking") {
    const match = body.match(/^(.+?) booked (.+?) with (.+?) for (.+)$/);
    if (match) {
      const [, customer, service, staff, appointment] = match;
      const localizedDate = translateAppointmentLabel(
        appointment,
        dateTokens,
        at,
      );
      return bodies.new_booking(customer, service, staff, localizedDate);
    }

    const rescheduled = body.match(
      /^(.+?)'s (.+?) with (.+?) was rescheduled to (.+)$/,
    );
    if (rescheduled) {
      const [, customer, service, staff, appointment] = rescheduled;
      const localizedDate = translateAppointmentLabel(
        appointment,
        dateTokens,
        at,
      );
      return bodies.rescheduled(customer, service, staff, localizedDate);
    }
  }

  if (type === "booking_cancelled") {
    const match = body.match(
      /^The (.+?) booking for (.+?) on (.+?) was cancelled$/,
    );
    if (match) {
      const [, service, customer, appointment] = match;
      const localizedDate = translateAppointmentLabel(
        appointment,
        dateTokens,
        at,
      );
      return bodies.cancelled(customer, service, localizedDate);
    }
  }

  if (type === "no_show") {
    const match = body.match(/^(.+?) didn't show up for (.+?) on (.+)$/);
    if (match) {
      const [, customer, service, appointment] = match;
      const localizedDate = translateAppointmentLabel(
        appointment,
        dateTokens,
        at,
      );
      return bodies.no_show(customer, service, localizedDate);
    }
  }

  return body;
}

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
    title: translateNotificationTitle(
      language,
      notification.type,
      notification.title,
    ),
    body: translateNotificationBody(
      language,
      notification.type,
      notification.body,
    ),
  };
}
