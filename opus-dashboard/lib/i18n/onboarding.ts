import type { DashboardLanguage } from "./types";
import { ConvexError } from "convex/values";

export const beautyCategories = [
  [
    "barbershop",
    "Barbershop",
    "Берберница",
    "Frizer për meshkuj",
    "Fade haircut",
    "Фејд шишање",
    "Qethje fade",
  ],
  [
    "hair_salon",
    "Hair salon",
    "Фризерски салон",
    "Sallon flokësh",
    "Wash and blow-dry",
    "Миење и фенирање",
    "Larje dhe tharje",
  ],
  [
    "nail_salon",
    "Nail salon",
    "Салон за нокти",
    "Sallon thonjsh",
    "Gel manicure",
    "Гел маникир",
    "Manikyr me xhel",
  ],
  [
    "spa",
    "Spa",
    "Спа",
    "Spa",
    "Relaxing massage",
    "Релакс масажа",
    "Masazh relaksues",
  ],
  [
    "beauty_salon",
    "Beauty salon",
    "Салон за убавина",
    "Sallon bukurie",
    "Facial treatment",
    "Третман на лице",
    "Trajtim fytyre",
  ],
  [
    "lash_studio",
    "Lash studio",
    "Студио за трепки",
    "Studio qerpikësh",
    "Lash extensions",
    "Надградба на трепки",
    "Zgjatje qerpikësh",
  ],
  [
    "brow_bar",
    "Brow bar",
    "Студио за веѓи",
    "Studio vetullash",
    "Brow shaping",
    "Обликување веѓи",
    "Formësim vetullash",
  ],
  [
    "tattoo_studio",
    "Tattoo studio",
    "Студио за тетоважи",
    "Studio tatuazhesh",
    "Tattoo consultation",
    "Консултација за тетоважа",
    "Konsultim për tatuazh",
  ],
  [
    "massage_therapy",
    "Massage therapy",
    "Масажа",
    "Terapia me masazh",
    "Relaxing massage",
    "Релакс масажа",
    "Masazh relaksues",
  ],
  [
    "wellness_center",
    "Wellness center",
    "Велнес центар",
    "Qendër mirëqenieje",
    "Wellness massage",
    "Велнес масажа",
    "Masazh mirëqenieje",
  ],
  [
    "personal_trainer",
    "Personal trainer",
    "Личен тренер",
    "Trajner personal",
    "Personal training",
    "Индивидуален тренинг",
    "Trajnim individual",
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

export const DAYS_SQ = [
  "E hënë",
  "E martë",
  "E mërkurë",
  "E enjte",
  "E premte",
  "E shtunë",
  "E diel",
];

export const DAYS_SHORT_EN = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

export const DAYS_SHORT_MK = [
  "Пон",
  "Вто",
  "Сре",
  "Чет",
  "Пет",
  "Саб",
  "Нед",
];

export const DAYS_SHORT_SQ = [
  "Hën",
  "Mar",
  "Mër",
  "Enj",
  "Pre",
  "Sht",
  "Die",
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

const errors_sq: Record<string, string> = {
  "Enter your name using 1 to 100 characters.":
    "Shkruani emrin tuaj duke përdorur 1 deri në 100 karaktere.",
  "Choose a JPG, PNG or WebP photo under 20 MB.":
    "Zgjidhni një foto JPG, PNG ose WebP nën 20 MB.",
  "Choose a smaller JPG, PNG or WebP photo.":
    "Zgjidhni një foto më të vogël JPG, PNG ose WebP.",
  "This photo could not be read. Try a JPG, PNG or WebP photo.":
    "Kjo foto nuk mund të lexohej. Provoni një foto JPG, PNG ose WebP.",
  "A photo is already being read. Try again in a moment.":
    "Një foto tashmë po lexohet. Provoni përsëri pas një momenti.",
  "Photo limit reached. Try again tomorrow or add services manually.":
    "Kufiri i fotove u arrit. Provoni përsëri nesër ose shtoni shërbimet manualisht.",
  "Photo import is temporarily unavailable. You can add services manually.":
    "Importimi nga foto është përkohësisht i padisponueshëm. Mund t'i shtoni shërbimet manualisht.",
  "The photo could not be read. Try a clearer photo or add services manually.":
    "Fotoja nuk mund të lexohej. Provoni një foto më të qartë ose shtoni shërbimet manualisht.",
  "Review the prices and durations before adding services.":
    "Rishikoni çmimet dhe kohëzgjatjet para se të shtoni shërbimet.",
  "Choose between 1 and 50 services.":
    "Zgjidhni midis 1 dhe 50 shërbimeve.",
  "Check every service name, price and duration.":
    "Kontrolloni emrin, çmimin dhe kohëzgjatjen e çdo shërbimi.",
  "A service with this name already exists. Rename it or remove it from the import.":
    "Një shërbim me këtë emër tashmë ekziston. Riemërtojeni ose hiqeni nga importi.",
  "Choose an address from the suggestions.":
    "Zgjidhni një adresë nga sugjerimet.",
  "Choose a result that includes both an address and city.":
    "Zgjidhni një rezultat që përfshin adresën dhe qytetin.",
  "This address is too long. Choose a more specific result.":
    "Kjo adresë është shumë e gjatë. Zgjidhni një rezultat më specifik.",
  "Choose a location in North Macedonia.":
    "Zgjidhni një vendndodhje në Maqedoninë e Veriut.",
  "The selected map pin is invalid. Choose the location again.":
    "Pika e zgjedhur në hartë është e pavlefshme. Zgjidhni vendndodhjen përsëri.",
  "Address search failed.":
    "Kërkimi i adresës dështoi. Kontrolloni lidhjen dhe provoni përsëri.",
  "Address search is too long.":
    "Kërkimi i adresës është shumë i gjatë.",
  "Mapbox is not configured.":
    "Kërkimi i adresave është përkohësisht i padisponueshëm.",
  "No usable address was found at this pin. Choose another point.":
    "Nuk u gjet asnjë adresë e përdorshme në këtë pikë. Zgjidhni një pikë tjetër.",
  "Wait for the map pin to finish updating.":
    "Prisni që përditësimi i pikës në hartë të përfundojë.",
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
  if (language === "sq") {
    return (
      errors_sq[message] ??
      "Ndodhi një problem. Kontrolloni të dhënat dhe provoni përsëri."
    );
  }
  return language === "mk"
    ? (errors[message] ??
        "Се појави проблем. Проверете ги податоците и обидете се повторно.")
    : message;
}

export const requirementCopy: Record<string, [string, string, string]> = {
  business_identity: [
    "Име и категорија",
    "Внесете го името и категоријата на студиото.",
    "Shkruani emrin dhe kategorinë e studios.",
  ],
  location: [
    "Потврдена локација",
    "Потврдете ја адресата и ознаката на мапата.",
    "Konfirmoni adresën dhe pikën në hartë.",
  ],
  provider: [
    "Име на сопственикот",
    "Внесете го името што клиентите ќе го гледаат кога закажуваат кај вас.",
    "Shkruani emrin që klientët do ta shohin kur të rezervojnë me ju.",
  ],
  service: [
    "Услуга за закажување",
    "Додајте активна услуга и доделете ја на член од тимот.",
    "Shtoni një shërbim aktiv dhe caktojeni tek një anëtar i ekipit.",
  ],
  availability: [
    "Работно време",
    "Поставете го работното време и достапноста на тимот.",
    "Vendosni orarin e punës dhe disponueshmërinë e ekipit.",
  ],
  booking_settings: [
    "Поставки за закажување",
    "Проверете ги времетраењето и периодот за закажување.",
    "Kontrolloni kohëzgjatjen dhe dritaren e rezervimit.",
  ],
  website_logo: [
    "Лого на студиото",
    "Прикачете го логото по кое клиентите ќе ве препознаат.",
    "Ngarkoni logon me të cilën klientët do t'ju njohin.",
  ],
  website_banner: [
    "Насловна фотографија",
    "Прикачете фотографија за врвот на вашата веб-страница.",
    "Ngarkoni një foto për krye të faqes tuaj të internetit.",
  ],
  website_tagline: [
    "Краток опис",
    "Претставете го вашето студио со една кратка реченица.",
    "Prezantoni studion tuaj me një fjali të shkurtër.",
  ],
  website_phone: [
    "Контакт телефон",
    "Додајте телефонски број на кој клиентите ќе можат да ве контактираат.",
    "Shtoni një numër telefoni ku klientët mund t'ju kontaktojnë.",
  ],
};
