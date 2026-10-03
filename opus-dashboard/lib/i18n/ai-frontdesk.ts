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

const HANDOFF_REASONS_SQ: Record<string, string> = {
  "Staff takeover": "Biseda u mor në dorëzim nga ekipi.",
  "A team member replied in Instagram. AI is paused.":
    "Një anëtar i ekipit u përgjigj në Instagram. AI është pezulluar.",
  "The AI needs the studio team to answer this question.":
    "Ekipi i studios duhet t'i përgjigjet kësaj pyetjeje.",
  "The assistant could not complete this request. Please review the conversation.":
    "Asistenti nuk mundi ta plotësonte këtë kërkesë. Ju lutemi rishikoni bisedën.",
  "Review this attachment or long message in Instagram.":
    "Rishikoni këtë bashkëngjitje ose mesazh të gjatë në Instagram.",
  "This conversation reached the automatic reply limit.":
    "Kjo bisedë ka arritur kufirin e përgjigjeve automatike.",
  "Automatic replies are unavailable or the reply window has expired.":
    "Përgjigjet automatike nuk janë të disponueshme ose dritarja e përgjigjes ka skaduar.",
  "Automatic reply allowance or Instagram reply window reached.":
    "Kufiri i përgjigjeve automatike ose dritarja e Instagramit u arrit.",
  "Reply was not sent. Check the channel connection and Instagram reply window.":
    "Përgjigja nuk u dërgua. Kontrolloni lidhjen e kanalit dhe dritaren e Instagramit.",
  "Delivery could not be confirmed. Check Instagram before replying to avoid a duplicate.":
    "Dërgimi nuk mund të konfirmohej. Kontrolloni Instagramin para se të përgjigjeni për të shmangur dublikimin.",
  "Instagram rejected the reply. The team needs to follow up.":
    "Instagrami e refuzoi përgjigjen. Ekipi duhet të vazhdojë bisedën.",
  "Delivery stopped. Check Instagram before replying.":
    "Dërgimi u ndalua. Kontrolloni Instagramin para se të përgjigjeni.",
  "Message processing stopped. Check Instagram before replying.":
    "Përpunimi i mesazhit u ndalua. Kontrolloni Instagramin para se të përgjigjeni.",
};

export function getHandoffReason(language: DashboardLanguage, reason: string) {
  if (language === "sq") {
    return HANDOFF_REASONS_SQ[reason] ?? reason;
  }
  return language === "mk" ? (HANDOFF_REASONS_MK[reason] ?? reason) : reason;
}
