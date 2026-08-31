const GENERIC_BOOKING_ERROR =
  "Резервацијата не можеше да се зачува. Обидете се повторно.";

const PUBLIC_BOOKING_ERRORS = [
  [
    "This business is not currently accepting bookings.",
    "Студиото моментално не прима онлајн резервации.",
  ],
  ["Service not available.", "Услугата повеќе не е достапна."],
  [
    "Organization settings are not available.",
    "Поставките за онлајн резервација моментално не се достапни.",
  ],
  ["Staff member not available.", "Членот од тимот повеќе не е достапен."],
  [
    "This staff member cannot perform this service.",
    "Избраниот член од тимот не ја извршува оваа услуга.",
  ],
  [
    "This time slot is outside working hours or no longer available.",
    "Овој термин повеќе не е достапен. Изберете друг термин.",
  ],
  [
    "This time slot is no longer available. Please choose another.",
    "Овој термин штотуку беше резервиран. Изберете друг термин.",
  ],
  ["Booking time must be in the future.", "Изберете иден термин."],
  [
    "Booking date is outside the allowed booking window.",
    "Избраниот датум е надвор од периодот достапен за резервации.",
  ],
  ["Booking time is invalid.", "Избраниот термин не е валиден."],
  [
    "Too many booking attempts. Please wait a few minutes and try again.",
    "Има премногу обиди за резервација. Почекајте неколку минути и обидете се повторно.",
  ],
  [
    "Enter a customer name between 2 and 100 characters.",
    "Внесете име и презиме од 2 до 100 знаци.",
  ],
  ["Enter a valid phone number.", "Внесете валиден телефонски број."],
  ["Enter a valid email address.", "Внесете валидна е-пошта."],
  [
    "The email and phone number belong to different customer records.",
    "Е-поштата и телефонскиот број се поврзани со различни клиенти. Контактирајте го студиото.",
  ],
  [
    "Too many verification codes requested. Please try again later.",
    "Побаравте премногу кодови. Обидете се повторно подоцна.",
  ],
  [
    "Please wait before requesting another verification code.",
    "Почекајте една минута пред да побарате нов код.",
  ],
  [
    "Verification email could not be sent. Please try again.",
    "Кодот не можеше да се испрати. Проверете ја е-поштата и обидете се повторно.",
  ],
  [
    "Enter the six-digit verification code.",
    "Внесете го шестцифрениот код од е-поштата.",
  ],
  [
    "The verification code has expired. Request a new code.",
    "Кодот истече. Побарајте нов код.",
  ],
  [
    "The verification code is incorrect.",
    "Кодот не е точен. Проверете ја е-поштата и обидете се повторно.",
  ],
  [
    "Too many incorrect codes. Request a new code.",
    "Има премногу неточни обиди. Побарајте нов код.",
  ],
  [
    "This verification code can no longer be used.",
    "Овој код повеќе не важи. Побарајте нов код.",
  ],
  [
    "Booking notes must be 1,000 characters or fewer.",
    "Забелешката може да содржи најмногу 1.000 знаци.",
  ],
] as const;

export function publicBookingErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : "";
  const match = PUBLIC_BOOKING_ERRORS.find(([source]) =>
    rawMessage.includes(source),
  );
  return match?.[1] ?? GENERIC_BOOKING_ERROR;
}
