import type { DashboardLanguage } from "./types";
import { ConvexError } from "convex/values";

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
  "Enter your name using 1 to 100 characters.":
    "Внесете го вашето име со 1 до 100 знаци.",
  "Choose a JPG, PNG or WebP photo under 20 MB.":
    "Изберете JPG, PNG или WebP фотографија помала од 20 MB.",
  "Choose a smaller JPG, PNG or WebP photo.":
    "Изберете помала фотографија во JPG, PNG или WebP формат.",
  "This photo could not be read. Try a JPG, PNG or WebP photo.":
    "Фотографијата не може да се прочита. Обидете се со JPG, PNG или WebP.",
  "A photo is already being read. Try again in a moment.":
    "Веќе се чита фотографија. Обидете се повторно за кратко.",
  "Photo limit reached. Try again tomorrow or add services manually.":
    "Го достигнавте дневниот лимит за фотографии. Обидете се утре или внесете ги услугите рачно.",
  "Photo import is temporarily unavailable. You can add services manually.":
    "Увозот од фотографија е привремено недостапен. Можете да ги внесете услугите рачно.",
  "The photo could not be read. Try a clearer photo or add services manually.":
    "Фотографијата не може да се прочита. Обидете се со појасна фотографија или внесете ги услугите рачно.",
  "Review the prices and durations before adding services.":
    "Проверете ги цените и времетраењата пред да ги додадете услугите.",
  "Choose between 1 and 50 services.": "Изберете од 1 до 50 услуги.",
  "Check every service name, price and duration.":
    "Проверете ги името, цената и времетраењето на секоја услуга.",
  "A service with this name already exists. Rename it or remove it from the import.":
    "Веќе постои услуга со ова име. Преименувајте ја или отстранете ја од увозот.",
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
    error instanceof ConvexError && typeof error.data === "string"
      ? error.data
      : error instanceof Error
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
    "Име на сопственикот",
    "Внесете го името што клиентите ќе го гледаат кога закажуваат кај вас.",
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
