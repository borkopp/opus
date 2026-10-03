import { ConvexError } from "convex/values";

export function recoveryErrorMessage(
  error: unknown,
  t: (en: string, mk: string, sq?: string) => string,
) {
  const message =
    error instanceof ConvexError && typeof error.data === "string"
      ? error.data
      : error instanceof Error
        ? error.message
        : "";
  const translations: [string, string, string][] = [
    [
      "This offer is no longer eligible. Refresh the openings and choose another customer.",
      "Понудата повеќе не е соодветна. Освежете ги термините и изберете друг клиент.",
      "Kjo ofertë nuk është më e vlefshme. Rifreskoni terminet dhe zgjidhni një klient tjetër.",
    ],
    [
      "Opening-offer email delivery is not configured.",
      "Испраќањето понуди по е-пошта не е конфигурирано.",
      "Dërgimi i ofertave me email nuk është i konfiguruar.",
    ],
    [
      "An offer is already active for this opening. Wait for a response or expiry.",
      "Веќе има активна понуда за овој термин. Почекајте одговор или истекување.",
      "Një ofertë është tashmë aktive për këtë termin të lirë. Prisni përgjigje ose skadimin.",
    ],
    [
      "An offer is already active for this opening.",
      "Веќе има активна понуда за овој термин.",
      "Një ofertë është tashmë aktive për këtë termin të lirë.",
    ],
    [
      "This customer or opening is not eligible for an offer.",
      "Клиентот или терминот не ги исполнува условите за понуда.",
      "Ky klient ose ky termin nuk plotëson kushtet për ofertë.",
    ],
    [
      "No suitable service fits, or the customer already has an upcoming appointment.",
      "Нема соодветна услуга или клиентот веќе има иден термин.",
      "Nuk përshtatet asnjë shërbim, ose klienti tashmë ka një takim të ardhshëm.",
    ],
    [
      "Enable recovery, publish your studio website, and choose a date within the next seven days.",
      "Овозможете пополнување, објавете ја веб-страницата и изберете датум во следните седум дена.",
      "Aktivizoni rikuperimin, publikoni faqen e studios dhe zgjidhni një datë brenda shtatë ditëve të ardhshme.",
    ],
    [
      "Add a valid email address to this customer first.",
      "Прво додајте валидна адреса за е-пошта на клиентот.",
      "Shtoni fillimisht një adresë të vlefshme emaili për këtë klient.",
    ],
    [
      "This email cannot be retried.",
      "Оваа порака не може повторно да се испрати.",
      "Ky email nuk mund të ridërgohet.",
    ],
  ];
  const known = translations.find(([en]) => message.includes(en));
  return known
    ? t(...known)
    : t(
        "Could not update the opening. Refresh and try again.",
        "Терминот не можеше да се ажурира. Освежете и обидете се повторно.",
        "Nuk mund të përditësohej termini i lirë. Rifreskoni dhe provoni përsëri.",
      );
}

export function recoveryStatusLabel(
  status: string,
  t: (en: string, mk: string, sq?: string) => string,
) {
  const labels: Record<string, [string, string, string]> = {
    proposed: ["For review", "За преглед", "Për shqyrtim"],
    queued: ["Queued", "Во ред за испраќање", "Në radhë dërgimi"],
    sent: ["Provider accepted", "Прифатено за испраќање", "Pranuar nga ofruesi"],
    delivered: ["Delivered", "Доставено", "Dorëzuar"],
    failed: ["Delivery failed", "Неуспешна испорака", "Dështoi dërgimi"],
    expired: ["No longer available", "Повеќе не е достапно", "Nuk është më e disponueshme"],
    booked: ["Booked", "Резервирано", "Rezervuar"],
    booking_cancelled: ["Booking cancelled", "Резервацијата е откажана", "Rezervimi u anulua"],
  };
  return t(...(labels[status] ?? ["Closed", "Затворено", "Mbyllur"]));
}
