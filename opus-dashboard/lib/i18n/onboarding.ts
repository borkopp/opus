import type { DashboardLanguage } from "./types";

export const beautyCategories = [
  ["barbershop", "Barbershop", "Берберница", "Fade haircut", "Фејд шишање"],
  [
    "hair_salon",
    "Hair salon",
    "Фризерски салон",
    "Wash and blow-dry",
    "Миење и фенирање",
  ],
  ["nail_salon", "Nail salon", "Салон за нокти", "Gel manicure", "Гел маникир"],
  ["spa", "Spa", "Спа", "Relaxing massage", "Релакс масажа"],
  [
    "beauty_salon",
    "Beauty salon",
    "Салон за убавина",
    "Facial treatment",
    "Третман на лице",
  ],
  [
    "lash_studio",
    "Lash studio",
    "Студио за трепки",
    "Lash extensions",
    "Надградба на трепки",
  ],
  ["brow_bar", "Brow bar", "Студио за веѓи", "Brow shaping", "Обликување веѓи"],
  [
    "tattoo_studio",
    "Tattoo studio",
    "Студио за тетоважи",
    "Tattoo consultation",
    "Консултација за тетоважа",
  ],
  [
    "massage_therapy",
    "Massage therapy",
    "Масажа",
    "Relaxing massage",
    "Релакс масажа",
  ],
  [
    "wellness_center",
    "Wellness center",
    "Велнес центар",
    "Wellness massage",
    "Велнес масажа",
  ],
  [
    "personal_trainer",
    "Personal trainer",
    "Личен тренер",
    "Personal training",
    "Индивидуален тренинг",
  ],
] as const;

export const DAYS_MK = [
  "Понеделник",
  "Вторник",
  "Среда",
  "Четврток",
  "Петок",
  "Сабота",
  "Недела",
];

const errors: Record<string, string> = {
  "Choose an address from the suggestions.": "Изберете адреса од предлозите.",
  "Choose a result that includes both an address and city.":
    "Изберете предлог што содржи адреса и град.",
  "This address is too long. Choose a more specific result.":
    "Адресата е предолга. Изберете попрецизен предлог.",
  "Choose a location in North Macedonia.": "Изберете локација во Македонија.",
  "The selected map pin is invalid. Choose the location again.":
    "Ознаката на мапата не е валидна. Изберете ја локацијата повторно.",
  "Address search failed.":
    "Пребарувањето не успеа. Проверете ја врската и обидете се повторно.",
  "Address search is too long.": "Внесете пократка адреса за пребарување.",
  "Mapbox is not configured.": "Пребарувањето адреси е привремено недостапно.",
  "No usable address was found at this pin. Choose another point.":
    "Не е пронајдена адреса на ова место. Изберете друга точка.",
  "Wait for the map pin to finish updating.":
    "Почекајте да заврши ажурирањето на локацијата.",
};

export function onboardingError(
  error: unknown,
  language: DashboardLanguage,
): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Something went wrong. Try again.";
  return language === "mk"
    ? (errors[message] ??
        "Се појави проблем. Проверете ги податоците и обидете се повторно.")
    : message;
}

export const requirementCopy: Record<string, [string, string]> = {
  business_identity: [
    "Име и категорија",
    "Внесете го името и категоријата на студиото.",
  ],
  location: [
    "Потврдена локација",
    "Потврдете ја адресата и ознаката на мапата.",
  ],
  provider: [
    "Активен член на тимот",
    "Вашиот профил е првиот член на тимот што нуди услуги.",
  ],
  service: [
    "Услуга за закажување",
    "Додајте активна услуга и доделете ја на член од тимот.",
  ],
  availability: [
    "Работно време",
    "Поставете го работното време и достапноста на тимот.",
  ],
  booking_settings: [
    "Поставки за закажување",
    "Проверете ги времетраењето и периодот за закажување.",
  ],
  website_logo: [
    "Лого на студиото",
    "Прикачете го логото по кое клиентите ќе ве препознаат.",
  ],
  website_banner: [
    "Насловна фотографија",
    "Прикачете фотографија за врвот на вашата веб-страница.",
  ],
  website_tagline: [
    "Краток опис",
    "Претставете го вашето студио со една кратка реченица.",
  ],
  website_phone: [
    "Контакт телефон",
    "Додајте телефонски број на кој клиентите ќе можат да ве контактираат.",
  ],
};
