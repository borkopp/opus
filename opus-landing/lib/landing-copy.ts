import type { Locale } from "./i18n/locale";

const mk = {
  audience: "За салони и студија за убавина во Македонија",
  reassurance: "Бесплатен план · Без кредитна картичка",
  free: "Бесплатно",
  pro: "Со OPUS Pro",
  demoLabel: "Демо студио",
  demoNote: "Илустративен пример со демо податоци.",
  howItWorks: "Како работи",
  journey: {
    eyebrow: "ОД ВАШИОТ ЛИНК ДО НОВ ТЕРМИН",
    title: "Вашето студио.",
    accent: "Подготвено за закажување.",
    description:
      "Од првата услуга до првиот онлајн термин. Погледнете како се поврзува сè.",
    steps: [
      {
        title: "Поставете го студиото",
        description:
          "Додајте ги услугите, цените и работното време. Вие одлучувате кога клиентите можат да закажат.",
      },
      {
        title: "Споделете го линкот",
        description:
          "Вашиот веб-сајт е вклучен. Ставете го линкот во Instagram или испратете го во порака.",
      },
      {
        title: "Пречекајте го следниот клиент",
        description:
          "Клиентот избира слободен термин, а закажувањето се појавува во вашиот календар. Пробајте со демо термин.",
      },
    ],
    studio: "Luna Studio",
    services: "Вашите услуги",
    hours: "Работно време",
    weekdays: "Понеделник – петок",
    service: "Маникир со гел",
    secondService: "Обликување веѓи",
    thirdService: "Ламинација на трепки",
    minutes: "мин.",
    currency: "ден.",
    ready: "Подготвено за онлајн закажување",
    linkLabel: "Еден линк. Сите ваши услуги.",
    linkHint: "За Instagram, пораки и секој клиент што прашува за термин.",
    chooseTime: "Изберете демо термин",
    tomorrow: "Утре",
    confirm: "Потврдете демо термин",
    tryBooking: "Пробајте демо закажување",
    confirmed: "Терминот е во календарот.",
    confirmedDetail:
      "Клиентот добива потврда. Вашиот тим го гледа новиот термин.",
    calendar: "Календар на студиото",
    client: "Сара П.",
    booked: "Закажано",
    restart: "Пробајте повторно",
    noBooking: "Ова е демо. Нема да се создаде вистински термин.",
  },
  freeSummary: {
    label: "Вклучено во бесплатниот план",
    items: [
      { value: "0", suffix: "ден.", label: "Без месечна претплата" },
      { value: "∞", suffix: "", label: "Неограничени термини" },
      { value: "1", suffix: "веб-сајт", label: "Ваш сопствен линк" },
      { value: "4", suffix: "лица", label: "1 сопственик + 3 вработени" },
    ],
  },
  devices: {
    eyebrow: "СЕ ВКЛОПУВА ВО ВАШИОТ ДЕН",
    title: "На рецепција.",
    accent: "И во движење.",
    description:
      "Проверете го следниот термин од телефон или организирајте ја неделата на компјутер. OPUS работи во вашиот прелистувач.",
    benefits: [
      "Без инсталирање апликација",
      "Распоредот се ажурира за целиот тим",
      "Пристап според улогата во студиото",
    ],
    alt: "Сопственичка на студио го прегледува распоредот на таблет",
    notification: "Нов термин во календарот",
  },
  pricingNote:
    "Бесплатен: 1 сопственик + 3 вработени. Pro: AI, автоматизација и простор за поголем тим.",
  faqContact: "Имате уште прашања?",
  faqContactLink: "Разговарајте со нас",
};

type LandingCopy = typeof mk;

const en: LandingCopy = {
  audience: "For beauty salons and studios in Macedonia",
  reassurance: "Free plan · No credit card required",
  free: "Included free",
  pro: "With OPUS Pro",
  demoLabel: "Demo studio",
  demoNote: "Illustrative preview with sample data.",
  howItWorks: "How it works",
  journey: {
    eyebrow: "FROM YOUR LINK TO YOUR NEXT BOOKING",
    title: "Your studio.",
    accent: "Ready to take bookings.",
    description:
      "From your first service to your first online appointment. See how it all comes together.",
    steps: [
      {
        title: "Make it your studio",
        description:
          "Add your services, prices, and working hours. You decide when clients can book.",
      },
      {
        title: "Share your booking link",
        description:
          "Your own website is included. Add the link to your Instagram bio or send it in a message.",
      },
      {
        title: "Welcome your next client",
        description:
          "Clients choose an available time and the booking appears in your calendar. Try a sample appointment.",
      },
    ],
    studio: "Luna Studio",
    services: "Your services",
    hours: "Working hours",
    weekdays: "Monday – Friday",
    service: "Gel manicure",
    secondService: "Brow shaping",
    thirdService: "Lash lift",
    minutes: "min",
    currency: "MKD",
    ready: "Ready for online bookings",
    linkLabel: "One link. All your services.",
    linkHint:
      "For your Instagram bio, messages, and every client asking for an appointment.",
    chooseTime: "Choose a sample appointment",
    tomorrow: "Tomorrow",
    confirm: "Confirm sample booking",
    tryBooking: "Try a sample booking",
    confirmed: "It’s in your calendar.",
    confirmedDetail:
      "Your client gets a confirmation. Your team sees the new appointment.",
    calendar: "Studio calendar",
    client: "Sara P.",
    booked: "Booked",
    restart: "Try again",
    noBooking: "This is a demo. No real appointment will be created.",
  },
  freeSummary: {
    label: "Included in your Free plan",
    items: [
      { value: "0", suffix: "MKD", label: "No monthly subscription" },
      { value: "∞", suffix: "", label: "Unlimited appointments" },
      { value: "1", suffix: "website", label: "Your own booking link" },
      { value: "4", suffix: "people", label: "1 owner + 3 staff members" },
    ],
  },
  devices: {
    eyebrow: "FITS THE WAY YOU WORK",
    title: "At the front desk.",
    accent: "And on the move.",
    description:
      "Check your next appointment on your phone or plan the week on your computer. OPUS works right in your browser.",
    benefits: [
      "No app to install",
      "One schedule, updated for the whole team",
      "Access based on each person’s role",
    ],
    alt: "A studio owner reviewing her schedule on a tablet",
    notification: "New appointment in your calendar",
  },
  pricingNote:
    "Free: 1 owner + 3 staff members. Pro: AI, automation, and room for a bigger team.",
  faqContact: "Still have a question?",
  faqContactLink: "Talk to us",
};

export const landingCopy: Record<Locale, LandingCopy> = { mk, en };
