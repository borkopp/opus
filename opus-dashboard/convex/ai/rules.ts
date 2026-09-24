import { z } from "zod";

export const STUDIO_CONTEXT_LIMIT = 12_000;
export const MESSAGE_LIMIT = 2_000;
export const REPLY_LIMIT = 1_000;
export const REPLY_WINDOW_MS = 24 * 60 * 60_000;
export const LEASE_MS = 3 * 60_000;

export const aiReplySchema = z.object({
  message: z.string().trim().min(1).max(REPLY_LIMIT),
  confidenceScore: z.number().finite().min(0).max(1),
  handoff: z.boolean(),
});
export type AiReply = z.infer<typeof aiReplySchema>;

export function parseReply(text: string): AiReply | null {
  try {
    const result = aiReplySchema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function isExplicitConfirmation(text: string): boolean {
  // A model cannot authorize a write. Accept only a standalone response to a
  // persisted, successfully sent booking proposal; qualifiers must be clarified.
  return /^(yes|confirm|yes confirm|confirm booking|yes please|да|потврдувам|да потврдувам|потврди|da|potvrduvam|da potvrduvam)[.!\s]*$/iu.test(
    text.trim(),
  );
}

export function responseLanguage(language: string | undefined, text: string) {
  if (language === "en" || language === "mk") return language;
  return /[а-шѓќѕјљњџ]|\b(zdravo|sakam|termin|da|potvrduvam|nokti|blagodaram)\b/iu.test(
    text,
  )
    ? "mk"
    : "en";
}

export function handoffReply(language: "mk" | "en", phone?: string): string {
  const message =
    language === "mk"
      ? "Ќе го препуштам разговорот на тимот во студиото за да ви помогне."
      : "I’ll pass this conversation to the studio team so they can help.";
  return phone
    ? `${message} ${language === "mk" ? "Телефон" : "Phone"}: ${phone}`
    : message;
}

type Hours = { dayOfWeek: number; startTime: string; endTime: string };
export function withinReplyHours(
  settings: {
    timezone: string;
    aiWorkingHoursEnabled?: boolean;
    aiWorkingHours?: Hours[];
  },
  now = Date.now(),
): boolean {
  if (!settings.aiWorkingHoursEnabled) return true;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: settings.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    parts.weekday,
  );
  const time = `${parts.hour}:${parts.minute}`;
  return (settings.aiWorkingHours ?? []).some(
    (h) => h.dayOfWeek === dayOfWeek && time >= h.startTime && time < h.endTime,
  );
}

export function aiSettingsError(settings: {
  aiPersonaName: string;
  aiConfidenceThreshold: number;
  aiStudioContext?: string;
  aiSystemPrompt?: string;
  aiGreetingMessage?: string;
  aiAwayMessage?: string;
  aiHandoffPhoneNumber?: string;
  aiWorkingHoursEnabled?: boolean;
  aiWorkingHours?: Hours[];
}): string | null {
  if (!settings.aiPersonaName.trim() || settings.aiPersonaName.length > 60)
    return "Enter an assistant name of 1–60 characters.";
  if (
    !Number.isFinite(settings.aiConfidenceThreshold) ||
    settings.aiConfidenceThreshold < 0.7 ||
    settings.aiConfidenceThreshold > 1
  )
    return "Confidence must be between 0.7 and 1.";
  if ((settings.aiStudioContext?.length ?? 0) > STUDIO_CONTEXT_LIMIT)
    return "Studio context must be 12,000 characters or fewer.";
  if ((settings.aiSystemPrompt?.length ?? 0) > 4_000)
    return "Custom instructions must be 4,000 characters or fewer.";
  if (
    [settings.aiGreetingMessage, settings.aiAwayMessage].some(
      (s) => (s?.length ?? 0) > REPLY_LIMIT,
    )
  )
    return "Greeting and away messages must be 1,000 characters or fewer.";
  if (
    settings.aiHandoffPhoneNumber &&
    !/^\+?[\d ()-]{7,30}$/.test(settings.aiHandoffPhoneNumber)
  )
    return "Enter a valid handoff phone number.";
  const hours = settings.aiWorkingHours ?? [];
  if (
    hours.length > 7 ||
    new Set(hours.map((h) => h.dayOfWeek)).size !== hours.length ||
    hours.some(
      (h) =>
        !Number.isInteger(h.dayOfWeek) ||
        h.dayOfWeek < 0 ||
        h.dayOfWeek > 6 ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.startTime) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.endTime) ||
        h.startTime >= h.endTime,
    )
  )
    return "Choose one valid start and end time for each selected day.";
  if (
    settings.aiWorkingHoursEnabled &&
    (!hours.length || !settings.aiAwayMessage?.trim())
  )
    return "Choose at least one reply day and enter an away message.";
  return null;
}

export type InstagramEvent = {
  accountId: string;
  senderId: string;
  messageId: string;
  text: string;
  timestamp: number;
  unsupported: boolean;
  echo: boolean;
};
const object = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
export function parseInstagramEvents(
  payload: unknown,
  now = Date.now(),
): InstagramEvent[] {
  const body = object(payload);
  if (body.object !== "instagram" || !Array.isArray(body.entry)) return [];
  const events: InstagramEvent[] = [];
  for (const rawEntry of body.entry) {
    const entry = object(rawEntry);
    if (typeof entry.id !== "string" || !Array.isArray(entry.messaging))
      continue;
    for (const rawEvent of entry.messaging) {
      const event = object(rawEvent),
        message = object(event.message);
      const sender = object(event.sender).id,
        recipient = object(event.recipient).id;
      const echo = message.is_echo === true;
      if (
        typeof sender !== "string" ||
        typeof recipient !== "string" ||
        typeof message.mid !== "string" ||
        !message.mid ||
        message.is_deleted === true
      )
        continue;
      if ((!echo && recipient !== entry.id) || (echo && sender !== entry.id))
        continue;
      if (
        typeof event.timestamp !== "number" ||
        !Number.isFinite(event.timestamp) ||
        event.timestamp > now + 60_000
      )
        continue;
      const text = typeof message.text === "string" ? message.text.trim() : "";
      events.push({
        accountId: entry.id,
        senderId: echo ? recipient : sender,
        messageId: message.mid,
        text: text.slice(0, MESSAGE_LIMIT),
        timestamp: event.timestamp,
        echo,
        unsupported:
          !text ||
          text.length > MESSAGE_LIMIT ||
          Array.isArray(message.attachments),
      });
    }
  }
  return events;
}
