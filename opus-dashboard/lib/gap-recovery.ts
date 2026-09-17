import { ConvexError } from "convex/values";

export function recoveryErrorMessage(
  error: unknown,
  t: (en: string, mk: string) => string,
) {
  const message =
    error instanceof ConvexError && typeof error.data === "string"
      ? error.data
      : error instanceof Error
        ? error.message
        : "";
  const translations: [string, string][] = [
    [
      "This offer is no longer eligible. Refresh the openings and choose another customer.",
      "Понудата повеќе не е соодветна. Освежете ги термините и изберете друг клиент.",
    ],
    [
      "Opening-offer email delivery is not configured.",
      "Испраќањето понуди по е-пошта не е конфигурирано.",
    ],
    [
      "An offer is already active for this opening. Wait for a response or expiry.",
      "Веќе има активна понуда за овој термин. Почекајте одговор или истекување.",
    ],
    [
      "An offer is already active for this opening.",
      "Веќе има активна понуда за овој термин.",
    ],
    [
      "This customer or opening is not eligible for an offer.",
      "Клиентот или терминот не ги исполнува условите за понуда.",
    ],
    [
      "No suitable service fits, or the customer already has an upcoming appointment.",
      "Нема соодветна услуга или клиентот веќе има иден термин.",
    ],
    [
      "Enable recovery, publish your studio website, and choose a date within the next seven days.",
      "Овозможете пополнување, објавете ја веб-страницата и изберете датум во следните седум дена.",
    ],
    [
      "Add a valid email address to this customer first.",
      "Прво додајте валидна адреса за е-пошта на клиентот.",
    ],
    [
      "This email cannot be retried.",
      "Оваа порака не може повторно да се испрати.",
    ],
  ];
  const known = translations.find(([en]) => message.includes(en));
  return known
    ? t(...known)
    : t(
        "Could not update the opening. Refresh and try again.",
        "Терминот не можеше да се ажурира. Освежете и обидете се повторно.",
      );
}

export function recoveryStatusLabel(
  status: string,
  t: (en: string, mk: string) => string,
) {
  const labels: Record<string, [string, string]> = {
    proposed: ["For review", "За преглед"],
    queued: ["Queued", "Во ред за испраќање"],
    sent: ["Provider accepted", "Прифатено за испраќање"],
    delivered: ["Delivered", "Доставено"],
    failed: ["Delivery failed", "Неуспешна испорака"],
    expired: ["No longer available", "Повеќе не е достапно"],
    booked: ["Booked", "Резервирано"],
    booking_cancelled: ["Booking cancelled", "Резервацијата е откажана"],
  };
  return t(...(labels[status] ?? ["Closed", "Затворено"]));
}
