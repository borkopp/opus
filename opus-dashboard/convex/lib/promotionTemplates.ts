export type PromotionLanguage = "mk" | "en";
export const REPLY_TOKENS = [
  "studio_name",
  "booking_link",
  "address",
  "phone",
  "hours",
  "services",
] as const;
export type ReplyToken = (typeof REPLY_TOKENS)[number];
export type ReplyValues = Record<ReplyToken, string>;
export const MAX_SAVED_REPLIES = 50;

export function unsupportedReplyTokens(body: string) {
  return [...body.matchAll(/\{\{([^{}]+)\}\}/g)]
    .map((match) => match[1].trim())
    .filter((token) => !REPLY_TOKENS.includes(token as ReplyToken));
}

export function renderReplyTemplate(body: string, values: ReplyValues) {
  const missing = new Set<string>();
  const text = body.replace(
    /\{\{\s*([^{}]+?)\s*\}\}/g,
    (original, token: string) => {
      const value = values[token as ReplyToken];
      if (!value) {
        missing.add(token);
        return original;
      }
      return value;
    },
  );
  return { text, missing: [...missing] };
}

export function starterReplies(language: PromotionLanguage) {
  const mk = language === "mk";
  return [
    {
      key: "booking",
      title: mk ? "Закажување" : "Book an appointment",
      body: mk
        ? "Здраво! Изберете услуга и слободен термин во {{studio_name}} преку линкот:\n{{booking_link}}\nНе ви треба профил или апликација."
        : "Hello! Choose a service and an available appointment at {{studio_name}} here:\n{{booking_link}}\nNo account or app needed.",
    },
    {
      key: "prices",
      title: mk ? "Услуги и цени" : "Services and prices",
      body: mk
        ? "Здраво! Ова се нашите услуги и цени:\n\n{{services}}\n\nСлободните термини се тука: {{booking_link}}"
        : "Hello! Here are our services and prices:\n\n{{services}}\n\nFind an available appointment here: {{booking_link}}",
    },
    {
      key: "directions",
      title: mk ? "Како до нас" : "Directions",
      body: mk
        ? "Ќе нè најдете на {{address}}.\nЗа дополнителни насоки јавете се на {{phone}}.\nВе очекуваме во {{studio_name}}!"
        : "You can find us at {{address}}.\nCall {{phone}} if you need directions.\nSee you at {{studio_name}}!",
    },
    {
      key: "hours",
      title: mk ? "Работно време" : "Opening hours",
      body: mk
        ? "Нашето работно време:\n{{hours}}\n\nЗа слободни термини: {{booking_link}}"
        : "Our opening hours:\n{{hours}}\n\nFind an available appointment: {{booking_link}}",
    },
  ];
}
