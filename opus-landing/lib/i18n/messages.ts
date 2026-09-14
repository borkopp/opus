import "server-only";

import type { Locale } from "./locale";

const mkMessages = {
  metadata: {
    home: {
      title: "OPUS — Бесплатна платформа за закажување за салони",
      description:
        "Бесплатна платформа за салони за убавина во Македонија: календар, тим, услуги, сопствен веб-сајт и неограничени онлајн термини.",
    },
    pricing: {
      title: "Цени — OPUS",
      description:
        "Водете го студиото бесплатно без лимит на термини. OPUS Pro додава AI рецепција, оптимизатор на празни термини и напредна автоматизација.",
      socialDescription:
        "Бесплатен план за секојдневната работа и OPUS Pro за AI, автоматизација и раст.",
    },
    contact: {
      title: "Контакт — OPUS",
      description:
        "Контактирајте го тимот на OPUS за онлајн закажување во вашето студио за убавина.",
    },
  },
  accessibility: {
    openMenu: "Отвори мени",
    closeMenu: "Затвори мени",
    toggleTheme: "Промени тема",
    switchToEnglish: "Префрли на англиски",
    switchToMacedonian: "Префрли на македонски",
  },
  nav: {
    platform: "Платформа",
    pricing: "Цени",
    contact: "Контакт",
    startFree: "Започнете бесплатно",
  },
  footer: {
    copyright: "Copyright OPUS 2026. Сите права задржани.",
    pagesTitle: "Страници",
    legalTitle: "Правно",
    accountTitle: "Најава",
    privacy: "Политика за приватност",
    terms: "Услови за користење",
    cookies: "Политика за колачиња",
    signIn: "Најава",
  },
  hero: {
    badge: "Бесплатна платформа за салони за убавина",
    titleFirst: "Помалку пораки.",
    titleSecond: "Повеќе",
    titleAccent: "закажани термини.",
    description:
      "Бесплатна платформа за закажување за салони за убавина во Македонија. Календар, сопствен веб-сајт и неограничени термини.",
    startFree: "Започнете бесплатно",
    learnMore: "Дознај повеќе",
    dashboardAlt: "OPUS календар и контролна табла",
    dashboardDarkAlt: "OPUS календар и контролна табла во темен приказ",
  },
  featuresOne: {
    heading: "Помалку обврски.",
    headingAccent: "Повеќе простор за клиенти.",
    description:
      "Календар, веб-сајт и тим во бесплатниот план. AI рецепција и автоматизација со OPUS Pro — сè поврзано со вашите термини.",
    cards: {
      calendar: {
        title: "Сите термини, без хаос",
        description:
          "Прегледајте го денот и целиот тим на едно место. OPUS спречува преклопување и ви помага навреме да реагирате на промени.",
      },
      website: {
        title: "Сопствен веб-сајт за закажување",
        description:
          "Вашите услуги, цени и слободни термини на yourstudio.opus.mk. Споделете го линкот и овозможете им на клиентите сами да закажат.",
      },
      ai: {
        title: "Одговор и кога сте зафатени",
        description:
          "Одговара на прашања, проверува слободни термини и помага при закажување — автоматски, на македонски, 24/7.",
      },
      operations: {
        title: "Тим, услуги и работно време",
        description:
          "Организирајте услуги, цени, смени, паузи и слободни денови за секој член од тимот.",
      },
    },
    highlights: {
      calendar: {
        title: "Календар без преклопувања",
        description:
          "Прегледен дневен и неделен распоред на целиот тим, со автоматска заштита од двојно резервирање на термини.",
      },
      email: {
        title: "Потврди и потсетници по е-пошта",
        description:
          "Клиентите добиваат потврда за закажувањето и навремен потсетник, а секоја промена е јасно комуницирана.",
      },
      guest: {
        title: "Брзо закажување без регистрација",
        description:
          "Клиентите го отвораат вашиот линк од Instagram или порака, го потврдуваат својот контакт и закажуваат без да креираат профил.",
      },
    },
  },
  demos: {
    calendar: {
      staff: ["Марко", "Ана"],
      bookings: [
        { title: "Потстрижување", details: "Петар • Платено" },
        { title: "Фејд + Брада", details: "Иван • 11:30" },
        { title: "Шишање деца", details: "Матеј • Неплатено" },
        { title: "Седење", details: "Никола • Целосен третман" },
        { title: "Фарбање", details: "Елена • Депозит" },
        { title: "Шминка", details: "Сара • Неплатено" },
        { title: "Маникир + Педикир", details: "Јована • Платено" },
        { title: "Стил на коса", details: "Кристина" },
      ],
    },
    website: {
      location: "Скопје, Центар",
      open: "Отворено",
      service: "Маникир со гел-лак",
      duration: "45 мин.",
      price: "800 ден.",
      tomorrow: "Утре, 14:30",
      book: "Закажи",
      newBooking: "Нова резервација",
      bookingDetails: "Сара П. • Утре во 14:30",
    },
    team: {
      service: "Машко шишање",
      price: "600 ден.",
      duration: "30 мин.",
      newService: "Нова услуга",
      services: "Услуги",
      team: "Тим",
      discount: "20% Попуст",
      birthday: "Среќен роденден!",
    },
    chat: [
      {
        name: "Клиент",
        text: "Здраво, имате ли слободен термин за денес?",
      },
      {
        name: "AI Асистент",
        text: "Здраво! Имаме слободно во 16:30. Да го резервирам?",
      },
      { name: "Клиент", text: "Одлично, може. Фала!" },
    ],
    notifications: [
      {
        type: "Потсетник",
        message: "Термин кај Марко за 1 час",
        time: "14:30",
      },
      {
        type: "Резервација",
        message: "Нов термин од Ана",
        time: "Закажано: 18:00",
      },
    ],
    gap: {
      active: "AI Оптимизатор Активен",
      found: "Пронајдена дупка: 60 мин",
      revenue: "+1,200 ден.",
      candidate: "Ана К.",
      idealCandidate: "Идеален кандидат",
      message:
        "„Здраво Ана! Имаме слободен термин во 11:00 кај Марко. Сакаш ли да го резервираш?“",
      complete: "Скенирањето е завршено",
    },
    analysis: {
      customer: "Мартина Ј.",
      lifetimeValue: "LTV: 14,500 ден.",
      appointment: "Шишање + Фенирање • 14:00",
      heading: "Анализа на клиент",
      noteTitle: "Белешка од асистент",
      note: "Спомна минатиот пат дека скалпот и е осетлив. Сака мек притисок при миење.",
      upsellTitle: "Предлог за продажба (Upsell)",
      upsell:
        "Обично прави и фарбање на коренот; понудете и нов третман за сјај (+800 ден).",
      likelihood: "Веројатност за доаѓање",
    },
    devices: {
      screenAlt: "OPUS контролна табла",
      connected: "Поврзано",
      airpodsConnected: "Календарот е усогласен",
      userAvatarAlt: "Кориснички аватар",
      regions: [
        "Северна Америка",
        "Европа",
        "Азија и Пацифик",
        "Јужна Америка",
      ],
    },
  },
  aiSection: {
    question: "Кој е мојот најслаб ден овој месец?",
    analysisLabel: "Анализа на податоци",
    answerBefore: "Според пополнетоста на календарот,",
    answerDay: "вторник",
    answerAfter: "е вашиот најслаб ден со 12% пополнетост.",
    tuesday: "Вторник (12%)",
    versusAverage: "-65% vs просек",
    weekendAverage: "Викенд просек (88%)",
    suggestion:
      "Предлог: Понудете попуст од 20% за термините меѓу 14:00 и 17:00.",
    heading: "Посветете се на клиентот.",
    headingAccent: "AI го пречекува следниот.",
    description:
      "OPUS Pro одговара на прашања за закажување, помага да ги пополните откажаните термини и открива можности во календарот. Вие ја задржувате контролата.",
    features: [
      {
        title: "AI рецепција 24/7",
        description:
          "Одговара на прашања, проверува достапност и помага при закажување преку веб-чет, Instagram и WhatsApp — со предавање на разговорот на човек кога е потребно.",
      },
      {
        title: "Оптимизатор на празни термини",
        description:
          "Ги открива празнините во календарот, предлага соодветни клиенти и подготвува порака за одобрување за полесно повторно пополнување на терминот.",
      },
      {
        title: "Паметни предлози за секој клиент",
        description:
          "Ги поврзува претходните посети, омилените услуги и белешките за да предложи релевантно повторно закажување или дополнителна услуга.",
      },
      {
        title: "AI анализа на студиото",
        description:
          "Прашајте го OPUS за пополнетоста, откажувањата, најбараните услуги и слабите делови од неделата и добијте јасен одговор од вашите податоци.",
      },
    ],
  },
  stats: {
    heading: "Бесплатно значи",
    headingAccent: "бесплатно",
    description:
      "Без пробен рок, без лимит на термини и без скриени услови. Pro го вклучувате кога ќе посакате AI и напредна автоматизација.",
    items: [
      {
        suffix: "",
        label: "Неограничени термини",
        description: "Бесплатниот план нема месечен лимит на закажувања.",
      },
      {
        suffix: " ден.",
        label: "Бесплатен план",
        description: "Без временско ограничување и без кредитна картичка.",
      },
      {
        suffix: " линк",
        label: "Сопствен веб-сајт",
        description:
          "Споделете го вашиот OPUS линк и примајте закажувања директно.",
      },
      {
        suffix: "/7",
        label: "AI рецепција со Pro",
        description: "Одговори и помош при закажување во секое време од денот.",
      },
    ],
  },
  featuresTwo: {
    heading: "Вашето студио, на",
    headingAccent: "било кој уред",
    description:
      "Проверете го распоредот, направете промена или одговорете на откажување од телефон, таблет или компјутер.",
    devices: [
      {
        title: "Распоредот во вашиот џеб",
        description:
          "Следете нови резервации и промени во распоредот додека сте во движење.",
      },
      {
        title: "Целосна контрола на компјутер",
        description:
          "Уредувајте услуги, работно време, вработени и термини од еден преглед.",
      },
      {
        title: "Работете од каде било",
        description:
          "Користете ја контролната табла на уред прилагоден за допир.",
      },
    ],
    blocks: [
      {
        title: "Пристап само за вашиот тим",
        description:
          "Податоците на студиото се одделени од другите бизниси, а пристапот се контролира преку кориснички улоги.",
      },
      {
        title: "Промените се гледаат веднаш",
        description:
          "Нови термини, откажувања и промени во календарот се појавуваат кај овластените членови на тимот во реално време.",
      },
    ],
  },
  pricing: {
    heading: "Бесплатно за работа.",
    headingAccent: "Pro за раст.",
    description:
      "Започнете со основните алатки, бесплатно без временски лимит. Изберете Pro за AI рецепција, пополнување откажани термини и поголем тим.",
    plans: [
      {
        title: "Бесплатен",
        badge: "Засекогаш",
        description:
          "Сè што ви треба за секојдневно водење на студиото, без ограничување на бројот на термини.",
        price: "0",
        currency: "ден.",
        period: "/ засекогаш",
        features: [
          "Неограничени термини, услуги и клиенти",
          "Сопствен веб-сајт (yourstudio.opus.mk)",
          "Календар, работно време, 1 сопственик + 3 вработени",
          "Заштита од преклопување на термини",
          "Потврди и потсетници по е-пошта",
          "Галерија со најмногу 3 фотографии",
        ],
        buttonText: "Започнете бесплатно",
      },
      {
        title: "OPUS Pro",
        badge: "AI и раст",
        description:
          "Сè од бесплатниот план, плус AI и автоматизација за помалку празни термини и помалку рачна комуникација.",
        price: "1.190",
        currency: "ден.",
        period: "/ месечно",
        features: [
          "AI рецепција 24/7 и 500 AI одговори месечно",
          "Оптимизатор на празни термини",
          "Автоматско пополнување по откажување",
          "Напредни мејлови и маркетинг алатки",
          "Поголем тим со повеќе кориснички профили и улоги",
          "Напредна аналитика и приоритетна поддршка",
        ],
        buttonText: "Контактирајте нѐ",
      },
    ],
  },
  faq: {
    heading: "Пред да",
    headingAccent: "започнете",
    headingEnd: "",
    description:
      "Практични одговори за вашето студио, вашите клиенти и вашиот план.",
    sections: [
      {
        title: "Првите чекори",
        items: [
          {
            question: "За какви студија е наменет OPUS?",
            answer:
              "За мали салони за коса и убавина, студија за нокти, трепки и веѓи, шминкери и студија за масажа во Македонија. Можете да работите сами или со тим.",
          },
          {
            question: "Што ми треба за да започнам?",
            answer:
              "Додајте ги услугите, цените, тимот и работното време. Потоа објавете го вашиот OPUS веб-сајт и споделете го линкот. Не ви треба постоечки веб-сајт.",
          },
          {
            question:
              "Можам ли да продолжам да закажувам по телефон и Instagram?",
            answer:
              "Да. Внесете ги постоечките и телефонски договорените термини во календарот. Онлајн закажувањата пристигнуваат во истиот распоред, а клиентите гледаат само слободни термини.",
          },
          {
            question: "Дали на клиентите им треба профил или апликација?",
            answer:
              "Не им треба апликација или кориснички профил. Го отвораат вашиот линк, избираат услуга и слободен термин и ги внесуваат потребните контактни податоци за да го потврдат закажувањето.",
          },
        ],
      },
      {
        title: "Бесплатниот план",
        items: [
          {
            question: "Дали бесплатниот план има временски лимит?",
            answer:
              "Не. Не е пробен период, не бара кредитна картичка и нема месечен лимит на термини. Pro е избор кога ќе ви требаат AI и дополнителна автоматизација.",
          },
          {
            question: "Колку луѓе можат да го користат бесплатниот план?",
            answer:
              "Еден активен сопственик и најмногу 3 активни вработени — вкупно 4 лица. Вклучени се календар, услуги, клиенти, работно време, сопствен OPUS веб-сајт и галерија со најмногу 3 фотографии.",
          },
          {
            question: "Што се случува ако го откажам Pro?",
            answer:
              "Сметката се враќа на бесплатниот план. Термините, клиентите, услугите и историјата се зачувуваат. Pro автоматизациите се исклучуваат, а повторно важат ограничувањата на бесплатниот план.",
          },
        ],
      },
      {
        title: "AI и комуникација",
        items: [
          {
            question: "Што презема AI рецепцијата?",
            answer:
              "Со OPUS Pro, AI одговара на прашања за услуги и цени, проверува слободни термини и помага при закажување преку веб-чет, Instagram и WhatsApp. Кога е потребна човечка одлука, разговорот го презема вашиот тим.",
          },
          {
            question: "Како помага OPUS кога ќе се откаже термин?",
            answer:
              "Оптимизаторот ја пронаоѓа празнината и предлага соодветни клиенти што се согласиле да добиваат понуди. Вие ја прегледувате и одобрувате подготвената порака пред да се испрати.",
          },
          {
            question: "Дали клиентите добиваат потврди и потсетници?",
            answer:
              "Да. Бесплатниот план вклучува потврди, известувања за промени и потсетници по е-пошта. Pro додава повеќе контрола врз потсетниците и известувањата за тимот.",
          },
        ],
      },
    ],
  },
  cta: {
    heading: "Започнете да примате",
    headingAccent: "онлајн термини",
    headingEnd: "уште денес",
    description:
      "Вашите услуги. Вашиот линк. Вашиот следен клиент. Започнете со бесплатниот план и посветете се на работата што ја сакате.",
    button: "Започнете бесплатно",
    alternateHeading: "Бесплатно за секојдневната работа.",
    alternateHeadingAccent: "Pro кога сакате повеќе.",
    alternateDescription:
      "Започнете без кредитна картичка и без лимит на термини. Активирајте OPUS Pro кога ќе ви требаат AI рецепција, оптимизација и напредна автоматизација.",
  },
  contact: {
    heading: "Контактирајте",
    headingAccent: "нè",
    description:
      "Тука сме да ви помогнеме да го трансформирате вашиот бизнис. Испратете ни порака и нашиот тим ќе ве контактира во најбрз можен рок.",
    directContact: "Директен контакт",
    email: "Е-пошта",
    location: "Локација",
    locationValue: "Скопје, Македонија",
    phone: "Телефон",
    fullName: "Име и презиме",
    namePlaceholder: "Вашето име",
    business: "Име на вашиот локал / бизнис",
    businessPlaceholder: "Пр. Салон за убавина 'Опус'",
    message: "Вашата порака",
    messagePlaceholder: "Напишете ја вашата порака тука...",
    submit: "Испрати порака",
    submitting: "Се испраќа...",
    successTitle: "Пораката е успешно испратена!",
    successDescription:
      "Ви благодариме што нè контактиравте. Нашиот тим ќе ве контактира во најбрз можен рок.",
    sendAnother: "Испрати нова порака",
    errorMessage:
      "Се случи грешка при испраќањето на пораката. Ве молиме обидете се повторно или контактирајте нè директно.",
  },
};

export type Messages = typeof mkMessages;

const enMessages = {
  metadata: {
    home: {
      title: "OPUS — Free booking platform for beauty studios",
      description:
        "A free booking platform for beauty studios in Macedonia: calendar, team, services, your own website, and unlimited online appointments.",
    },
    pricing: {
      title: "Pricing — OPUS",
      description:
        "Run your studio for free with unlimited appointments. OPUS Pro adds an AI receptionist, a gap optimizer, and advanced automation.",
      socialDescription:
        "A free plan for daily operations and OPUS Pro for AI, automation, and growth.",
    },
    contact: {
      title: "Contact — OPUS",
      description:
        "Contact the OPUS team about bringing online booking to your beauty studio.",
    },
  },
  accessibility: {
    openMenu: "Open menu",
    closeMenu: "Close menu",
    toggleTheme: "Toggle theme",
    switchToEnglish: "Switch to English",
    switchToMacedonian: "Switch to Macedonian",
  },
  nav: {
    platform: "Platform",
    pricing: "Pricing",
    contact: "Contact",
    startFree: "Start for free",
  },
  footer: {
    copyright: "Copyright OPUS 2026. All rights reserved.",
    pagesTitle: "Pages",
    legalTitle: "Legal",
    accountTitle: "Account",
    privacy: "Privacy policy",
    terms: "Terms of use",
    cookies: "Cookie policy",
    signIn: "Sign in",
  },
  hero: {
    badge: "Free platform for beauty studios",
    titleFirst: "Fewer messages.",
    titleSecond: "More",
    titleAccent: "booked appointments.",
    description:
      "A free booking platform for beauty studios in Macedonia. Calendar, your own website, and unlimited appointments.",
    startFree: "Start for free",
    learnMore: "Learn more",
    dashboardAlt: "OPUS calendar and dashboard",
    dashboardDarkAlt: "OPUS calendar and dashboard in dark mode",
  },
  featuresOne: {
    heading: "A calmer day.",
    headingAccent: "A fuller calendar.",
    description:
      "Your calendar, website, and team are included free. OPUS Pro adds AI reception and automation, all connected to your appointments.",
    cards: {
      calendar: {
        title: "Every appointment, without the chaos",
        description:
          "See the day and your entire team in one place. OPUS prevents overlaps and helps you respond to changes in time.",
      },
      website: {
        title: "Your own booking website",
        description:
          "Your services, prices, and available times at yourstudio.opus.mk. Share the link and let clients book when it suits them.",
      },
      ai: {
        title: "An answer, even when you’re busy",
        description:
          "It answers questions, checks availability, and helps with bookings — automatically, in Macedonian, 24/7.",
      },
      operations: {
        title: "Team, services, and working hours",
        description:
          "Organize services, prices, shifts, breaks, and days off for every team member.",
      },
    },
    highlights: {
      calendar: {
        title: "A calendar without overlaps",
        description:
          "A clear daily and weekly schedule for your entire team, with automatic protection against double bookings.",
      },
      email: {
        title: "Email confirmations and reminders",
        description:
          "Clients receive a booking confirmation and a timely reminder, and every change is communicated clearly.",
      },
      guest: {
        title: "Fast booking without registration",
        description:
          "Clients open your link from Instagram or a message, verify their contact details, and book without creating an account.",
      },
    },
  },
  demos: {
    calendar: {
      staff: ["Marko", "Ana"],
      bookings: [
        { title: "Haircut", details: "Petar • Paid" },
        { title: "Fade + Beard", details: "Ivan • 11:30" },
        { title: "Kids' haircut", details: "Matej • Unpaid" },
        { title: "Styling session", details: "Nikola • Full treatment" },
        { title: "Hair colouring", details: "Elena • Deposit" },
        { title: "Makeup", details: "Sara • Unpaid" },
        { title: "Manicure + Pedicure", details: "Jovana • Paid" },
        { title: "Hairstyling", details: "Kristina" },
      ],
    },
    website: {
      location: "Skopje, Centar",
      open: "Open",
      service: "Gel manicure",
      duration: "45 min",
      price: "800 MKD",
      tomorrow: "Tomorrow, 14:30",
      book: "Book",
      newBooking: "New booking",
      bookingDetails: "Sara P. • Tomorrow at 14:30",
    },
    team: {
      service: "Men's haircut",
      price: "600 MKD",
      duration: "30 min",
      newService: "New service",
      services: "Services",
      team: "Team",
      discount: "20% Off",
      birthday: "Happy birthday!",
    },
    chat: [
      {
        name: "Client",
        text: "Hi, do you have an available appointment today?",
      },
      {
        name: "AI Assistant",
        text: "Hi! We have an opening at 16:30. Should I book it?",
      },
      { name: "Client", text: "Perfect, yes. Thanks!" },
    ],
    notifications: [
      {
        type: "Reminder",
        message: "Appointment with Marko in 1 hour",
        time: "14:30",
      },
      {
        type: "Booking",
        message: "New appointment from Ana",
        time: "Scheduled: 18:00",
      },
    ],
    gap: {
      active: "AI Optimizer Active",
      found: "Gap found: 60 min",
      revenue: "+1,200 MKD",
      candidate: "Ana K.",
      idealCandidate: "Ideal match",
      message:
        "“Hi Ana! We have an opening at 11:00 with Marko. Would you like to book it?”",
      complete: "Scan complete",
    },
    analysis: {
      customer: "Martina J.",
      lifetimeValue: "LTV: 14,500 MKD",
      appointment: "Haircut + Blow-dry • 14:00",
      heading: "Customer analysis",
      noteTitle: "Assistant note",
      note: "She mentioned last time that her scalp is sensitive. She prefers gentle pressure while washing.",
      upsellTitle: "Upsell suggestion",
      upsell:
        "She usually books a root touch-up too; offer the new shine treatment as well (+800 MKD).",
      likelihood: "Likelihood to attend",
    },
    devices: {
      screenAlt: "OPUS dashboard",
      connected: "Connected",
      airpodsConnected: "Calendar synced",
      userAvatarAlt: "User avatar",
      regions: ["North America", "Europe", "Asia Pacific", "South America"],
    },
  },
  aiSection: {
    question: "Which day has been my weakest this month?",
    analysisLabel: "Data analysis",
    answerBefore: "Based on calendar occupancy,",
    answerDay: "Tuesday",
    answerAfter: "is your weakest day at 12% occupancy.",
    tuesday: "Tuesday (12%)",
    versusAverage: "-65% vs average",
    weekendAverage: "Weekend average (88%)",
    suggestion:
      "Suggestion: Offer 20% off appointments between 14:00 and 17:00.",
    heading: "Stay with your client.",
    headingAccent: "Let AI handle the next.",
    description:
      "OPUS Pro answers booking enquiries, helps refill cancellations, and finds opportunities in your calendar. You stay in control.",
    features: [
      {
        title: "24/7 AI receptionist",
        description:
          "Answers questions, checks availability, and helps with bookings through web chat, Instagram, and WhatsApp — handing the conversation to a person when needed.",
      },
      {
        title: "Open-slot optimizer",
        description:
          "Finds gaps in the calendar, suggests suitable clients, and prepares a message for approval so the slot can be filled more easily.",
      },
      {
        title: "Smart suggestions for every client",
        description:
          "Connects previous visits, favorite services, and notes to suggest a relevant rebooking or additional service.",
      },
      {
        title: "AI studio analysis",
        description:
          "Ask OPUS about occupancy, cancellations, popular services, and weaker parts of the week and get a clear answer from your data.",
      },
    ],
  },
  stats: {
    heading: "Free means",
    headingAccent: "free",
    description:
      "No trial period, no appointment limit, and no hidden conditions. Turn on Pro when you want AI and advanced automation.",
    items: [
      {
        suffix: "",
        label: "Unlimited appointments",
        description: "The Free plan has no monthly booking limit.",
      },
      {
        suffix: " MKD",
        label: "Free plan",
        description: "No time limit and no credit card required.",
      },
      {
        suffix: " link",
        label: "Your own website",
        description: "Share your OPUS link and receive bookings directly.",
      },
      {
        suffix: "/7",
        label: "AI receptionist with Pro",
        description: "Replies and booking help at any time of day.",
      },
    ],
  },
  featuresTwo: {
    heading: "Your studio, on",
    headingAccent: "any device",
    description:
      "Check the schedule, make a change, or respond to a cancellation from your phone, tablet, or computer.",
    devices: [
      {
        title: "Your schedule in your pocket",
        description:
          "Keep up with new bookings and schedule changes while you are on the move.",
      },
      {
        title: "Full control on desktop",
        description:
          "Manage services, working hours, staff, and appointments from one view.",
      },
      {
        title: "Work from anywhere",
        description: "Use the dashboard on a touch-friendly device.",
      },
    ],
    blocks: [
      {
        title: "Access only for your team",
        description:
          "Your studio's data is separated from other businesses, and access is controlled through user roles.",
      },
      {
        title: "Changes appear immediately",
        description:
          "New appointments, cancellations, and calendar changes appear for authorized team members in real time.",
      },
    ],
  },
  pricing: {
    heading: "Free to run.",
    headingAccent: "Pro to grow.",
    description:
      "Start with the essentials, free for as long as you need. Choose Pro for AI reception, cancellation recovery, and a bigger team.",
    plans: [
      {
        title: "Free",
        badge: "Forever",
        description:
          "Everything you need to run your studio every day, with no limit on the number of appointments.",
        price: "0",
        currency: "MKD",
        period: "/ forever",
        features: [
          "Unlimited appointments, services, and clients",
          "Your own website (yourstudio.opus.mk)",
          "Calendar, working hours, 1 owner + 3 staff",
          "Protection against overlapping appointments",
          "Email confirmations and reminders",
          "A gallery with up to 3 photos",
        ],
        buttonText: "Start for free",
      },
      {
        title: "OPUS Pro",
        badge: "AI and growth",
        description:
          "Everything in Free, plus AI and automation for fewer empty slots and less manual communication.",
        price: "1,190",
        currency: "MKD",
        period: "/ month",
        features: [
          "24/7 AI receptionist and 500 AI replies per month",
          "Open-slot optimizer",
          "Automatic refill after a cancellation",
          "Advanced email and marketing tools",
          "A bigger team with more user accounts and roles",
          "Advanced analytics and priority support",
        ],
        buttonText: "Contact us",
      },
    ],
  },
  faq: {
    heading: "Before you",
    headingAccent: "get started",
    headingEnd: "",
    description:
      "Practical answers about your studio, your clients, and your plan.",
    sections: [
      {
        title: "Getting started",
        items: [
          {
            question: "Who is OPUS made for?",
            answer:
              "Small hair and beauty salons, nail studios, lash and brow studios, makeup artists, and massage studios in Macedonia. You can work on your own or with a team.",
          },
          {
            question: "What do I need to get started?",
            answer:
              "Add your services, prices, team, and working hours. Then publish your OPUS website and share the link. You do not need an existing website.",
          },
          {
            question: "Can I keep taking bookings by phone and Instagram?",
            answer:
              "Yes. Add your existing appointments and phone bookings to the calendar. Online bookings arrive in the same schedule, and clients only see available times.",
          },
          {
            question: "Do clients need an account or an app?",
            answer:
              "Neither. Clients open your link, choose a service and available time, then enter the required contact details to confirm their booking.",
          },
        ],
      },
      {
        title: "Your Free plan",
        items: [
          {
            question: "Does the Free plan expire?",
            answer:
              "No. It is not a trial, does not require a credit card, and has no monthly appointment limit. Pro is optional when you want AI and additional automation.",
          },
          {
            question: "How many people can use the Free plan?",
            answer:
              "One active owner and up to 3 active staff members — 4 people in total. Your calendar, services, clients, working hours, OPUS website, and a gallery with up to 3 photos are included.",
          },
          {
            question: "What happens if I cancel Pro?",
            answer:
              "Your account returns to the Free plan. Appointments, clients, services, and history stay saved. Pro automation is switched off and the Free plan limits apply again.",
          },
        ],
      },
      {
        title: "AI and communication",
        items: [
          {
            question: "What does the AI receptionist take care of?",
            answer:
              "With OPUS Pro, AI answers questions about services and prices, checks available times, and helps with bookings through web chat, Instagram, and WhatsApp. Your team takes over when a conversation needs a human decision.",
          },
          {
            question: "How does OPUS help when someone cancels?",
            answer:
              "The optimizer spots the opening and suggests suitable clients who agreed to receive offers. You review and approve the prepared message before it is sent.",
          },
          {
            question: "Do clients receive confirmations and reminders?",
            answer:
              "Yes. Free includes email confirmations, notices about changes, and appointment reminders. Pro adds more control over reminders and team notifications.",
          },
        ],
      },
    ],
  },
  cta: {
    heading: "Start taking",
    headingAccent: "online bookings",
    headingEnd: "today",
    description:
      "Your services. Your booking link. Your next client. Start with the Free plan and make room for the work you love.",
    button: "Start for free",
    alternateHeading: "Free for daily operations.",
    alternateHeadingAccent: "Pro when you want more.",
    alternateDescription:
      "Start without a credit card and with unlimited appointments. Turn on OPUS Pro when you need an AI receptionist, optimization, and advanced automation.",
  },
  contact: {
    heading: "Contact",
    headingAccent: "us",
    description:
      "We're here to help you bring your bookings online. Send us a message and our team will get back to you as soon as possible.",
    directContact: "Direct contact",
    email: "Email",
    location: "Location",
    locationValue: "Skopje, Macedonia",
    phone: "Phone",
    fullName: "Full name",
    namePlaceholder: "Your name",
    business: "Studio / business name",
    businessPlaceholder: "e.g. Opus Beauty Studio",
    message: "Your message",
    messagePlaceholder: "Write your message here...",
    submit: "Send message",
    submitting: "Sending...",
    successTitle: "Message sent successfully!",
    successDescription:
      "Thank you for contacting us. Our team will get back to you as soon as possible.",
    sendAnother: "Send another message",
    errorMessage:
      "Something went wrong while sending your message. Please try again or contact us directly.",
  },
} satisfies Messages;

const messagesByLocale: Record<Locale, Messages> = {
  mk: mkMessages,
  en: enMessages,
};

export function getMessages(locale: Locale): Messages {
  return messagesByLocale[locale];
}
