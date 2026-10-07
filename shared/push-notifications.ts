/** JSON-only preferences shared by the studio web and native applications. */
export type PushEvent =
  | "new_booking"
  | "booking_changed"
  | "booking_cancelled"
  | "booking_reminder"
  | "no_show"
  | "ai_handoff";
export type PushPreferences = {
  mobileEnabled: boolean;
  browserEnabled: boolean;
  newBookings: boolean;
  changes: boolean;
  cancellations: boolean;
  reminders: boolean;
  noShows: boolean;
  aiHandoffs: boolean;
  scope: "mine" | "studio";
  reminderMinutes: number;
  sound: boolean;
  showPreview: boolean;
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
};
export type PushSettings = {
  preferences: PushPreferences;
  ownOnly: boolean;
  aiAvailable: boolean;
  timezone: string;
  mobileAvailable: boolean;
  browserAvailable: boolean;
  browserPublicKey: string | null;
  devices: { id: string; kind: "expo" | "web"; lastSeenAt: number }[];
};
export const PUSH_REMINDER_MINUTES = [15, 30, 60, 120, 1440] as const;
export function defaultPushPreferences(ownOnly = false): PushPreferences {
  return {
    mobileEnabled: true,
    browserEnabled: true,
    newBookings: true,
    changes: true,
    cancellations: true,
    reminders: true,
    noShows: false,
    aiHandoffs: !ownOnly,
    scope: ownOnly ? "mine" : "studio",
    reminderMinutes: 30,
    sound: true,
    showPreview: false,
    quietHours: false,
    quietStart: "22:00",
    quietEnd: "08:00",
  };
}
export const PUSH_EVENT_OPTIONS = [
  {
    key: "newBookings",
    en: "New appointments",
    mk: "Нови термини",
    sq: "Termine të reja",
  },
  {
    key: "changes",
    en: "Rescheduled appointments",
    mk: "Презакажани термини",
    sq: "Termine të ricaktuara",
  },
  {
    key: "cancellations",
    en: "Cancellations",
    mk: "Откажувања",
    sq: "Anulime",
  },
  {
    key: "reminders",
    en: "Upcoming appointment reminders",
    mk: "Потсетници за претстојни термини",
    sq: "Rikujtues për terminet e ardhshme",
  },
  { key: "noShows", en: "No-shows", mk: "Непојавувања", sq: "Mosparaqitje" },
  {
    key: "aiHandoffs",
    en: "AI front desk needs attention",
    mk: "AI рецепцијата бара внимание",
    sq: "Recepsioni AI kërkon vëmendje",
  },
] as const;
export function pushEventEnabled(
  preferences: PushPreferences,
  event: PushEvent,
) {
  const key = {
    new_booking: "newBookings",
    booking_changed: "changes",
    booking_cancelled: "cancellations",
    booking_reminder: "reminders",
    no_show: "noShows",
    ai_handoff: "aiHandoffs",
  } as const;
  return preferences[key[event]];
}
export function inQuietHours(
  preferences: PushPreferences,
  now: number,
  timezone: string,
) {
  if (!preferences.quietHours) return false;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const current = `${parts.find((p) => p.type === "hour")!.value}:${parts.find((p) => p.type === "minute")!.value}`;
  return preferences.quietStart < preferences.quietEnd
    ? current >= preferences.quietStart && current < preferences.quietEnd
    : current >= preferences.quietStart || current < preferences.quietEnd;
}
