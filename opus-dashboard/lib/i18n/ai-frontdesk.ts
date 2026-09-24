import type { DashboardLanguage } from "./types";

const HANDOFF_REASONS_MK: Record<string, string> = {
  "Staff takeover": "Разговорот е преземен од тимот.",
  "A team member replied in Instagram. AI is paused.":
    "Член на тимот одговори на Instagram. AI е паузиран.",
  "The AI needs the studio team to answer this question.":
    "Тимот во студиото треба да одговори на ова прашање.",
  "The assistant could not complete this request. Please review the conversation.":
    "Асистентот не успеа да го заврши барањето. Прегледајте го разговорот.",
  "Review this attachment or long message in Instagram.":
    "Прегледајте го прилогот или долгата порака на Instagram.",
  "This conversation reached the automatic reply limit.":
    "Овој разговор го достигна ограничувањето за автоматски одговори.",
  "Automatic replies are unavailable or the reply window has expired.":
    "Автоматските одговори не се достапни или истече рокот за одговарање.",
  "Automatic reply allowance or Instagram reply window reached.":
    "Достигнато е ограничувањето за автоматски одговори или истече рокот за одговарање на Instagram.",
  "Reply was not sent. Check the channel connection and Instagram reply window.":
    "Одговорот не е испратен. Проверете ја врската со Instagram и рокот за одговарање.",
  "Delivery could not be confirmed. Check Instagram before replying to avoid a duplicate.":
    "Испораката не е потврдена. Проверете на Instagram пред да одговорите за да не испратите иста порака двапати.",
  "Instagram rejected the reply. The team needs to follow up.":
    "Instagram го одби одговорот. Тимот треба да го продолжи разговорот.",
  "Delivery stopped. Check Instagram before replying.":
    "Испораката е запрена. Проверете на Instagram пред да одговорите.",
  "Message processing stopped. Check Instagram before replying.":
    "Обработката на пораката е запрена. Проверете на Instagram пред да одговорите.",
};

export function getHandoffReason(language: DashboardLanguage, reason: string) {
  return language === "mk" ? (HANDOFF_REASONS_MK[reason] ?? reason) : reason;
}
