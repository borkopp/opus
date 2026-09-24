import type { Locale } from "./locale";

export const mkMessages = {
  metadata: {
    home: {
      title: "OPUS — Онлајн закажување за салони",
      description:
        "OPUS е систем за закажување за салони и студија за убавина во Македонија. Креирајте бесплатен веб-сајт и следете ги термините на целиот тим во еден календар.",
    },
    contact: {
      title: "Контакт OPUS — Малку помош за вашето студио.",
      description:
        "Имате прашање за OPUS? Контактирајте нè за помош со вашиот веб-сајт за закажување, вашиот тим или поставувањето на вашето студио.",
      openGraphDescription:
        "Започнувате или се прилагодувате? Тука сме за вашето студио.",
    },
  },
  accessibility: {
    languageToggle: "Избор на јазик",
    switchToEnglish: "Префрли на англиски",
    switchToMacedonian: "Префрли на македонски",
    openMenu: "Отвори мени",
    closeMenu: "Затвори мени",
    skipToContent: "Прескокни до содржина",
  },
  nav: {
    features: "Функции",
    ai: "Анализи и понуди",
    howItWorks: "Како функционира",
    pricing: "Цени",
    contact: "Контакт",
    newBadge: "НОВО",
    login: "Најава",
    startFree: "Започнете бесплатно",
    language: "Јазик",
  },
  hero: {
    previewLabel:
      "Илустративен приказ на календарот и веб-сајтот за закажување на OPUS.",
    title: "Онлајн закажување за вашиот салон.",
    description:
      "Со OPUS добивате бесплатен веб-сајт каде клиентите сами закажуваат термин. Сите термини на вашиот тим ги гледате во еден календар.",
    createWebsite: "Започни бесплатно",
    learnMore: "Дознај повеќе",
    badgeFree: "Бесплатно",
    badgeNoCard: "Без картичка",
    badgeForStudio: "За салони и студија",
    noteBookingTitle: "Нов онлајн термин",
    noteBookingDesc: "Ева закажа потстрижување за петок.",
    noteBookingTime: "сега",
    calendarGreeting: "Добро утро, Ана",
    calendarDate: "Чет., 17 сеп.",
    calendarTitle: "Денешен календар",
    calendarStaffAna: "Ана",
    calendarStaffMarija: "Марија",
    apt1Title: "Потстрижување и фен",
    apt1Time: "09:00 – 10:00 · Елена П.",
    apt2Title: "Третман за коса",
    apt2Time: "10:30 – 11:15 · Мила С.",
    apt3Title: "Гел маникир",
    apt3Time: "09:30 – 10:30 · Сара К.",
    apt4Title: "Класичен маникир",
    apt4Time: "11:00 – 11:45 · Ева М.",
    calendarFooterText: "Термините на целиот тим.",
    calendarView: "Отворете го календарот",
    phoneStudioName: "АТЕЉЕ",
    phoneStudioType: "СТУДИО ЗА УБАВИНА",
    phoneLocation: "СКОПЈЕ, МАКЕДОНИЈА",
    phoneHeading: "Закажете термин.",
    phoneSubheading: "Изберете услуга и слободен термин.",
    phoneTabServices: "Услуги",
    phoneTabTeam: "Наш тим",
    phoneTabAbout: "За нас",
    phoneService1: "Потстрижување и фен",
    phoneService1Sub: "60 мин · од 900 ден.",
    phoneService2: "Нијансирање и нега",
    phoneService2Sub: "90 мин · од 1.800 ден.",
    phoneService3: "Фенирање",
    phoneService3Sub: "30 мин · од 500 ден.",
    phoneButton: "Закажете термин",
    phonePowered: "Со поддршка од",
    noteAiTitle: "Кои денови се најзафатени?",
    noteAiDesc: "Пример за прашање до AI-аналитичарот.",
    audiences: [
      "Фризерски салони",
      "Берберници",
      "Студија за нокти",
      "Шминкери",
      "Студија за масажа",
    ],
  },
  dashboardPreview: {
    heading: "Вашето студио, на еден поглед.",
    description: "Термини, клиенти и слободни места — сè на едно место.",
    imageAlt:
      "Пример на OPUS контролната табла со денешни термини, пополнетост на календарот и вредност на завршените термини.",
  },
  productTour: {
    heading: "Клиентите закажуваат онлајн.",
    subheading:
      "Споделете го линкот. Клиентите избираат услуга и слободен термин, а OPUS го додава во календарот.",
    includedInFree: "Вклучено во бесплатниот план",
    cta: "Започни бесплатно",
    tabs: {
      website: {
        label: "Веб-сајт за закажување",
        title: "Веб-сајт каде клиентите сами закажуваат.",
        description:
          "Клиентите ги гледаат услугите и цените, избираат слободен термин и закажуваат. Не им треба профил или апликација.",
        serviceName: "Потстрижување и фен",
        serviceDetail: "60 мин · 900 ден.",
      },
      calendar: {
        label: "Тимски календар",
        title: "Сите термини во еден календар.",
        description:
          "Погледнете кој има термин, кај кој член на тимот и во колку часот. Поставете работно време, паузи и слободни денови.",
        todayHeading: "Денешен календар",
        todayDay: "Четврток",
        staffAna: "Ана",
        staffMarija: "Марија",
        apt1: "Потстрижување и фен",
        apt2: "Третман за коса",
        apt3: "Гел маникир",
      },
      clients: {
        label: "Историја на клиенти",
        title: "Податоци и посети за секој клиент.",
        description:
          "Најдете ги контактите на клиентот и проверете кога дошол и која услуга ја користел.",
        clientName: "Елена Петрова",
        clientRemembered: "Податоци за клиентот",
        recentVisits: "Неодамнешни посети",
        visit1: "Потстрижување и фен",
        date1: "14 септември",
        visit2: "Нијансирање и нега",
        date2: "18 август",
        visit3: "Потстрижување и фен",
        date3: "21 јули",
      },
    },
  },
  featuresBento: {
    heading: "Термини, тим и клиенти. Во еден систем.",
    subheading:
      "Закажувајте, менувајте и следете термини од телефон или компјутер.",
    bookingTitle1: "Ваш веб-сајт",
    bookingTitle2: "за закажување.",
    bookingDesc1:
      "Клиентите бираат услуга и време кое им одговара. Поставено од вас.",
    bookingDesc2: "",
    calendarTitle1: "Календар",
    calendarTitle2: "за целиот тим.",
    calendarDesc:
      "Погледнете ги термините на секој вработен. OPUS спречува два термина кај ист вработен во исто време.",
    clientsTitle1: "Контакти и посети",
    clientsTitle2: "на вашите клиенти.",
    clientsDesc1: "",
    clientsDesc2: "Проверете ги претходните термини и услуги.",
    remindersTitle1: "Потврди и потсетници",
    remindersTitle2: "по е-пошта.",
    remindersDesc1: "Испратете им на клиентите детали и потсетник за терминот.",
    remindersDesc2: "",
    summaryUnlimited: "Неограничени термини",
    summaryServices: "Неограничени услуги и клиенти",
    summaryDevices: "Достапно на секој уред",
  },
  intelligence: {
    heading: "Подигнете го вашиот бизнис на следно ниво со AI.",
    subheading: "AI алатки кои ќе ви помогнат да го раширите вашиот бизнис.",
    usageNote:
      "Анализите и понудите се дел од Pro. Проверете со нас дали AI-аналитичарот е активиран за вашето студио. Планираните функции сè уште не се достапни.",
    analyst: {
      name: "AI-аналитичар",
      title: ["Прашајте за термините.", " Добијте одговор со бројки."],
      description:
        "Прашајте кои денови се најзафатени, кои услуги се бараат и колку термини се откажани. Одговорите се засноваат на податоците од вашето студио.",
      note: "200 одговори месечно, од кои до 20 детални анализи.",
      artCopy: "Чатувај со AI за вашиот бизнис",
      yourAnalyst: "Вашиот AI бизнис аналитичар",
      subtitle: "Одговори за термините во вашето студио.",
      sampleHeading: "ПРИМЕР ЗА РАЗГОВОР",
      sampleNote:
        "Илустративни податоци · Одговорите се засноваат на податоци од вашето студио.",
      limit1: "200 одговори / месечно",
      limit2: "До 20 детални анализи",
      days: ["П", "В", "С", "Ч", "П", "С"],
      chip: "Анализа на термините во вашето студио",
      examples: [
        {
          label: "Најзафатени денови?",
          question: "Кога е најзафатено во моето студио?",
          answer:
            "Во оваа примерна недела, најзафатен ви е петокот. Во вторник имате најмногу слободни термини.",
        },
        {
          label: "Кога има откажувања?",
          question: "Кој ден има најмногу откажани термини?",
          answer:
            "Во овој пример, најмногу откажувања има во вторник. Проверете колку време пред терминот клиентите откажуваат.",
        },
        {
          label: "Кога има слободни термини?",
          question: "Кои денови имаат најмногу слободни термини?",
          answer:
            "Во овој пример, најмногу слободни термини има во понеделник и вторник. Можете да им понудите термин на клиенти што веќе го посетиле студиото.",
        },
      ],
    },
    receptionist: {
      name: "AI рецепционер",
      title: ["AI одговори на пораки."],
      description:
        "Планирана помош за одговарање на прашања од клиенти преку веб-чет, Instagram и WhatsApp. Оваа функција сè уште не е достапна.",
      note: "Вклучено во Pro.",
      channels: ["Веб-чет", "Instagram", "WhatsApp"],
    },
    rebooking: {
      name: "AI-предлози за посети",
      title: ["Предлози за следна посета."],
      description:
        "Планирани AI-предлози за следен термин или услуга според претходните посети на клиентот. Оваа функција сè уште не е достапна.",
      note: "Вклучено во Pro.",
      chip: "Предлози според претходни посети",
    },
    recovery: {
      name: "Понуди за слободни термини",
      title: ["Имате слободен термин?", "Понудете го на клиент."],
      description:
        "OPUS предлага клиенти за слободен термин. Вие ја прегледувате и одобрувате понудата по е-пошта, а клиентот одлучува дали ќе закаже.",
      note: "Само за клиенти што дозволиле понуди по е-пошта.",
      flow: ["Изберете", "Прегледајте", "Одобрете"],
    },
  },
  carousel: {
    heading: "За салони и студија што работат со термини.",
    subheading:
      "За фризери, бербери, студија за нокти, шминкери и масери. Користете го сами или со мал тим.",
    footer: "Онлајн закажување и календар за вашиот тим.",
    slides: [
      {
        title: "Фризерски салони",
        desc: "Клиентите избираат услуга, фризер и слободен термин. Вие ги гледате сите закажувања во календарот.",
      },
      {
        title: "Берберници",
        desc: "Примајте термини за потстрижување и брада преку вашиот линк. Следете го распоредот на секој бербер.",
      },
      {
        title: "Студија за нокти",
        desc: "Поставете цени и времетраење за маникир и педикир. Клиентите сами избираат слободен термин.",
      },
      {
        title: "Шминкери",
        desc: "Поставете ги услугите и слободните термини за шминкање. Клиентите закажуваат преку вашиот веб-сајт.",
      },
      {
        title: "Студија за масажа",
        desc: "Поставете ги видовите масажа, времетраењето и паузите. Следете ги термините на секој масер.",
      },
    ],
    prev: "Претходен тип на студио",
    next: "Следен тип на студио",
    statusOf: "од",
  },
  howItWorks: {
    heading: "Почнете со онлајн закажување во три чекори.",
    subheading:
      "Внесете ги услугите и работното време. OPUS го создава вашиот веб-сајт за закажување.",
    step1Title: "1. Внесете ги податоците за студиото.",
    step1Desc:
      "Внесете ги услугите, цените, тимот и работното време. Поставете ги вашите паузи и слободни денови.",
    step2Title: "2. Објавете го веб-сајтот.",
    step2Desc:
      "Објавете го вашиот бесплатен веб-сајт и споделете го линкот на Instagram, во био или преку порака.",
    step3Title: "3. Примајте онлајн закажувања.",
    step3Desc:
      "Клиентите избираат термин без да создаваат профил. Новите термини се појавуваат директно во вашиот календар.",
    cta: "Креирајте бесплатен веб-сајт",
  },
  pricing: {
    heading: "Изберете што му треба на вашето студио.",
    subheading: "Веб-сајтот и календарот се вклучени бесплатно.",
    note: "Не ви треба Pro за да примате онлајн закажувања. Веб-сајтот и календарот се дел од бесплатниот план.",
    free: {
      name: "Бесплатен план",
      price: "0",
      currency: "ден.",
      desc: "Веб-сајт и календар за вас и тројца вработени.",
      cta: "Креирајте бесплатен веб-сајт",
      label: "Вклучено во бесплатниот план:",
      features: [
        "Неограничени термини, услуги и клиенти",
        "Ваш веб-сајт на yourstudio.opus.mk",
        "Закажување за клиенти — без кориснички профил",
        "Еден сопственик + тројца членови на тимот",
        "Тимски календар без преклопување на термините",
        "Поставување работно време, паузи и слободни денови",
        "Детали за клиенти и историја на посети",
        "Потврди за термини по е-пошта",
        "Галерија со најмногу 3 фотографии",
        "Пристап од телефон, таблет и компјутер",
      ],
      end: "Без кредитна картичка. Без пробен рок.",
    },
    pro: {
      name: "Pro",
      price: "1.190",
      currency: "ден. / месечно",
      desc: "Повеќе вработени, извештаи и понуди за слободни термини.",
      cta: "Контактирајте нè за Pro",
      label: "Сè од бесплатниот план, плус:",
      features: [
        "Поголем тим",
        "Потсетници за клиенти по е-пошта пред терминот",
        "SMS потврди и потсетници за термини",
        "Понуди по е-пошта и SMS за слободни и откажани термини",
        "Детални извештаи за термините во студиото",
        "Поголема контрола врз е-поштата, маркетингот и известувањата",
        "Приоритетна поддршка",
      ],
      aiAnalystTitle: "AI Chat",
      aiAnalystSub: "200 одговори месечно, од кои до 20 детални анализи",
      aiReceptionistTitle: "24/7 AI рецепционер",
      aiReceptionistSub:
        "Одговара на пораки (Instagram, WhatsApp, Web-Chat) и закажува термини автоматски.",
      aiRebookingTitle: "AI анализа на клиенти и предлози",
      aiRebookingSub: "",
      end: "Контактирајте нè за активирање на Pro и достапност на AI-аналитичарот.",
    },
    custom: {
      name: "Софтвер по мерка",
      price: "Цена по договор",
      desc: "Од една посебна функција до целосен систем за вашето студио.",
      monthly: "Достапен е и месечен план",
      cta: "Кажете ни ја вашата идеја",
      label: "Градиме според вашите потреби:",
      features: [
        "Функционалности по ваша замисла",
        "Веб-апликации и алатки за вашиот тим",
        "Поврзување со системите што веќе ги користите",
        "Автоматизација на секојдневните задачи",
        "Ваш дизајн, бренд и начин на работа",
        "Развој во фази, според вашите приоритети",
      ],
      end: "Заедно ги договараме обемот, рокот и месечниот план што ви одговара.",
    },
  },
  faq: {
    heading: "Прашања за OPUS. Кратки одговори.",
    subheading: "За цената, закажувањето и користењето со вашиот тим.",
    items: [
      {
        question: "Дали бесплатниот план е навистина бесплатен?",
        answer:
          "Да. Бесплатниот план чини 0 ден., без кредитна картичка и без пробен рок. Добивате неограничени термини, услуги и клиенти, сопствен веб-сајт за закажување и простор за еден сопственик и тројца членови на тимот.",
      },
      {
        question: "Дали на моите клиенти им треба апликација?",
        answer:
          "Не. Клиентите го отвораат вашиот линк за закажување на телефон или компјутер, избираат услуга и термин, ги внесуваат своите податоци и закажуваат. Не им е потребен кориснички профил ниту апликација.",
      },
      {
        question: "Како да добијам сопствен веб-сајт за закажување?",
        answer:
          "Внесете ги вашите услуги, цени, тим и работно време, а потоа објавете. Вашиот веб-сајт ќе биде достапен на yourstudio.opus.mk. Споделете го линкот на Instagram или преку порака, а новите термини веднаш ќе се појавуваат во вашиот календар.",
      },
      {
        question: "Може ли мојот тим да го користи истиот календар?",
        answer:
          "Да. Бесплатниот план вклучува еден сопственик и тројца членови на тимот. Управувајте со термините, достапноста, паузите и слободните денови заедно, без преклопување на термините. Со Pro можете да додадете уште членови во тимот.",
      },
      {
        question: "Што можам да прашам AI-аналитичарот за мојот бизнис?",
        answer:
          "Кога е активиран за вашето студио, аналитичарот одговара на прашања како „Кој ден има најмногу термини?“ и „Колку термини се откажани?“. Нешто слично како Chat-GPT, само за вашиот бизнис. Користи податоци од вашето студио. Не менува термини и не испраќа пораки до клиенти. Pro дозволува 200 одговори месечно, од кои до 20 детални анализи. Контактирајте нè за достапност.",
      },
      {
        question: "Дали OPUS автоматски ги пополнува слободните термини?",
        answer:
          "Не. OPUS предлага клиенти за слободниот термин. Вие ја прегледувате и одобрувате секоја понуда пред да се испрати по е-пошта. Понуди добиваат само клиенти што дале согласност. Клиентот одлучува дали ќе ја прифати понудата и ќе закаже.",
      },
      {
        question: "Дали OPUS е создаден за мојот тип на студио?",
        answer:
          "OPUS е создаден за сите типови на бизниси кои работат со термини. Доколку вашиот занает не е поддржан на нашата платформа, ве молиме контактирајте нѐ.",
      },
    ],
  },
  finalCta: {
    heading: "Креирајте веб-сајт. Примајте термини онлајн.",
    subheading:
      "Внесете ги услугите, цените и работното време. Споделете го линкот со клиентите за да закажат.",
    cta: "Креирајте бесплатен веб-сајт",
    small: "Бесплатно. Не е потребна кредитна картичка.",
  },
  footer: {
    sloganLine1: "Онлајн закажување",
    sloganLine2: "за салони и студија.",
    meetOpus: "За OPUS",
    features: "Функции",
    intelligence: "Анализи и понуди",
    pricing: "Цени",
    nextChapter: "Започнете со OPUS",
    howItWorks: "Како функционира",
    faq: "Чести прашања",
    createWebsite: "Креирајте го вашиот веб-сајт",
    madeForYou: "За салони и студија.",
    madeForYouSub1: "Систем за закажување за бизниси",
    madeForYouSub2: " за убавина.",
    copyright: "© 2026 OPUS.",
    tagline: "Веб-сајт за закажување и календар за вашиот тим.",
    contact: "Контакт",
    privacy: "Приватност",
    terms: "Услови",
    cookieSettings: "Поставки за колачиња",
    backToTop: "Назад на почетокот",
  },
  contactPage: {
    heroTitle1: "Малку помош.",
    heroTitle2: "Вистински разговор.",
    heroSubLine1:
      "Започнувате, го развивате или го планирате следното поглавје?",
    heroSubLine2: "Тука сме за вашето студио.",
    proTitle: "Заинтересирани за Pro?",
    proDescription:
      "Пишете ни за вашето студио и прашајте за функциите, цената и активирањето на Pro планот.",
    detailsTitle: "Ајде да разговараме.",
    emailLabel: "Претпочитате е-пошта?",
    phoneLabel: "Јавете ни се",
    locationLabel: "Малку поблиску до дома",
    locationValue: "Скопје, Македонија",
    faqLink: "Прочитајте ги честите прашања",
    formTitle: "Кажете ни за што размислувате.",
    formDescLine1: "Прашање, повратна информација или помош за почеток.",
    formDescLine2: "Оставете порака и ќе ви одговориме по е-пошта.",
    fieldName: "Вашето име",
    fieldEmail: "Адреса на е-пошта",
    fieldBusiness: "Име на студиото",
    fieldMessage: "Како можеме да помогнеме?",
    placeholderName: "Ана Петрова",
    placeholderEmail: "ana@vashestudio.mk",
    placeholderBusiness: "Вашето студио за убавина",
    placeholderMessage: "Кажете ни малку за вашите планови…",
    optional: "По избор",
    submit: "Испрати порака",
    submitting: "Испраќање на пораката…",
    successTitle: "Пораката е примена.",
    successDesc:
      "Ви благодариме што нè контактиравте. Ќе ви одговориме на наведената е-пошта.",
    sendAnother: "Испрати друга порака",
    errorTitle: "Пораката не можеше да се испрати.",
    errorGeneric:
      "Ве молиме обидете се повторно или пишете на hello@opus.mk. Вашата порака е зачувана.",
    errorRateLimit:
      "Ве молиме почекајте малку пред да се обидете повторно, или пишете ни директно. Вашата порака е зачувана.",
    errorConnection:
      "Проверете ја вашата интернет врска и обидете се повторно, или пишете на hello@opus.mk. Вашата порака е зачувана.",
    privacyNote:
      "Вашите податоци ќе ги користиме исклучиво за да одговориме на пораката.",
    readOur: "Прочитајте ја нашата ",
    privacyLink: "политика за приватност",
  },
};

export type Messages = typeof mkMessages;

export const enMessages: Messages = {
  metadata: {
    home: {
      title: "OPUS — Online booking for salons",
      description:
        "OPUS is a booking system for salons and beauty studios in Macedonia. Create a free website and manage your team’s appointments in one calendar.",
    },
    contact: {
      title: "Contact OPUS — A little help for your studio.",
      description:
        "Have a question about OPUS? Get in touch for help with your booking website, your team, or getting your studio started.",
      openGraphDescription:
        "Getting started or finding your feet? We’re here for your studio.",
    },
  },
  accessibility: {
    languageToggle: "Language selection",
    switchToEnglish: "Switch to English",
    switchToMacedonian: "Switch to Macedonian",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    skipToContent: "Skip to content",
  },
  nav: {
    features: "Features",
    ai: "Reports & offers",
    howItWorks: "How it works",
    pricing: "Pricing",
    contact: "Contact",
    newBadge: "NEW",
    login: "Log in",
    startFree: "Start for free",
    language: "Language",
  },
  hero: {
    previewLabel:
      "Illustrative preview of the OPUS calendar and booking website.",
    title: "Online booking for your salon.",
    description:
      "OPUS gives you a free website where clients book their own appointments. See all your team’s appointments in one calendar.",
    createWebsite: "Start for free",
    learnMore: "Learn more",
    badgeFree: "Free",
    badgeNoCard: "No credit card",
    badgeForStudio: "For salons and studios",
    noteBookingTitle: "New online booking",
    noteBookingDesc: "Eva booked a haircut for Friday.",
    noteBookingTime: "now",
    calendarGreeting: "Good morning, Ana",
    calendarDate: "Thu, 17 Sep",
    calendarTitle: "Today’s calendar",
    calendarStaffAna: "Ana",
    calendarStaffMarija: "Marija",
    apt1Title: "Cut & blow-dry",
    apt1Time: "09:00 – 10:00 · Elena P.",
    apt2Title: "Hair treatment",
    apt2Time: "10:30 – 11:15 · Mila S.",
    apt3Title: "Gel manicure",
    apt3Time: "09:30 – 10:30 · Sara K.",
    apt4Title: "Classic manicure",
    apt4Time: "11:00 – 11:45 · Eva M.",
    calendarFooterText: "Your whole team’s appointments.",
    calendarView: "View calendar",
    phoneStudioName: "ATELIER",
    phoneStudioType: "BEAUTY STUDIO",
    phoneLocation: "SKOPJE, MACEDONIA",
    phoneHeading: "Book an appointment.",
    phoneSubheading: "Choose a service and an available time.",
    phoneTabServices: "Services",
    phoneTabTeam: "Our team",
    phoneTabAbout: "About",
    phoneService1: "Cut & blow-dry",
    phoneService1Sub: "60 min · from 900 MKD",
    phoneService2: "Color & care",
    phoneService2Sub: "90 min · from 1,800 MKD",
    phoneService3: "Blow-dry",
    phoneService3Sub: "30 min · from 500 MKD",
    phoneButton: "Book an appointment",
    phonePowered: "Made possible with",
    noteAiTitle: "Which days are busiest?",
    noteAiDesc: "Example question for the AI analyst.",
    audiences: [
      "Hair salons",
      "Barbershops",
      "Nail studios",
      "Makeup artists",
      "Massage studios",
    ],
  },
  dashboardPreview: {
    heading: "Your studio, at a glance.",
    description:
      "Appointments, clients, and available slots — all in one place.",
    imageAlt:
      "Sample OPUS dashboard showing today's appointments, calendar occupancy, and completed appointment value.",
  },
  productTour: {
    heading: "Clients book online.",
    subheading:
      "Share your link. Clients choose a service and an available time, and OPUS adds the booking to your calendar.",
    includedInFree: "Included in Free",
    cta: "Start for free",
    tabs: {
      website: {
        label: "Booking website",
        title: "A website where clients book themselves.",
        description:
          "Clients see your services and prices, choose an available time, and book. They don’t need an account or an app.",
        serviceName: "Cut & blow-dry",
        serviceDetail: "60 min · 900 MKD",
      },
      calendar: {
        label: "Team calendar",
        title: "All appointments in one calendar.",
        description:
          "See who is booked, with which team member, and at what time. Set working hours, breaks, and days off.",
        todayHeading: "Today’s calendar",
        todayDay: "Thursday",
        staffAna: "Ana",
        staffMarija: "Marija",
        apt1: "Cut & blow-dry",
        apt2: "Hair treatment",
        apt3: "Gel manicure",
      },
      clients: {
        label: "Client history",
        title: "Client details and past visits.",
        description:
          "Find a client’s contact details and check when they visited and which services they booked.",
        clientName: "Elena Petrova",
        clientRemembered: "Client details",
        recentVisits: "Recent visits",
        visit1: "Cut & blow-dry",
        date1: "14 September",
        visit2: "Color & care",
        date2: "18 August",
        visit3: "Cut & blow-dry",
        date3: "21 July",
      },
    },
  },
  featuresBento: {
    heading: "Appointments, team, and clients. In one system.",
    subheading:
      "Add, change, and check appointments from your phone or computer.",
    bookingTitle1: "Your own website",
    bookingTitle2: "for online booking.",
    bookingDesc1:
      "Clients choose a service and a time that suits them, from the options you set.",
    bookingDesc2: "",
    calendarTitle1: "A calendar",
    calendarTitle2: "for your whole team.",
    calendarDesc:
      "See each team member’s appointments. OPUS prevents two bookings for the same person at the same time.",
    clientsTitle1: "Contact details and visits",
    clientsTitle2: "for each client.",
    clientsDesc1: "Keep client contact details in one place.",
    clientsDesc2: "Check previous appointments and services.",
    remindersTitle1: "Confirmations and reminders",
    remindersTitle2: "by email.",
    remindersDesc1: "Send clients their appointment details and a reminder.",
    remindersDesc2: "",
    summaryUnlimited: "Unlimited appointments",
    summaryServices: "Unlimited services & clients",
    summaryDevices: "Works on every device",
  },
  intelligence: {
    heading: "Take your business to the next level with AI.",
    subheading: "AI tools to help you grow your business.",
    usageNote: "AI tools, reports, and appointment offers are included in Pro.",
    analyst: {
      name: "AI business analyst",
      title: ["Ask about your bookings.", "Get answers with numbers."],
      description:
        "Ask which days are busiest, which services clients book, and how many appointments were cancelled. Answers use your studio’s data.",
      note: "200 answers per month, including up to 20 detailed analyses.",
      artCopy: "Chat with AI about your business",
      yourAnalyst: "Your AI business analyst",
      subtitle: "Answers about your studio’s bookings.",
      sampleHeading: "EXPLORE A SAMPLE CONVERSATION",
      sampleNote: "Illustrative data · Your answers use your studio’s data.",
      limit1: "200 answers / month",
      limit2: "Up to 20 detailed analyses",
      days: ["M", "T", "W", "T", "F", "S"],
      chip: "Analysis of your studio’s bookings",
      examples: [
        {
          label: "My busiest days?",
          question: "When is my studio busiest?",
          answer:
            "In this sample week, Friday is your busiest day. Tuesday has the most space for new appointments.",
        },
        {
          label: "When do clients cancel?",
          question: "Which day has the most cancellations?",
          answer:
            "In this example, Tuesday has the most cancellations. Check how far in advance clients cancel their appointments.",
        },
        {
          label: "When do I have empty slots?",
          question: "Which days have the most empty slots?",
          answer:
            "In this example, Monday and Tuesday have the most empty slots. You could offer an appointment to clients who have visited before.",
        },
      ],
    },
    receptionist: {
      name: "AI receptionist",
      title: ["AI replies to messages."],
      description:
        "Your AI receptionist answers client questions through web chat, Instagram, and WhatsApp and books appointments automatically, 24/7.",
      note: "Included in Pro.",
      channels: ["Web chat", "Instagram", "WhatsApp"],
    },
    rebooking: {
      name: "AI rebooking suggestions",
      title: ["Suggestions for a next visit."],
      description:
        "AI suggests a client’s next appointment or service based on their previous visits.",
      note: "Included in Pro.",
      chip: "Suggestions based on past visits",
    },
    recovery: {
      name: "Offers for empty slots",
      title: ["Have an empty slot?", "Offer it to a client."],
      description:
        "OPUS suggests clients for an empty slot. You review and approve the email offer, and the client decides whether to book.",
      note: "Only for clients who have agreed to receive email offers.",
      flow: ["Choose", "Review", "Approve"],
    },
  },
  carousel: {
    heading: "For salons and studios that work by appointment.",
    subheading:
      "For hairdressers, barbers, nail artists, makeup artists, and massage therapists. Use it on your own or with a small team.",
    footer: "Online booking and a calendar for your team.",
    slides: [
      {
        title: "Hair salons",
        desc: "Clients choose a service, stylist, and available time. You see every booking in your calendar.",
      },
      {
        title: "Barbershops",
        desc: "Take haircut and beard appointments through your link. Check each barber’s schedule.",
      },
      {
        title: "Nail studios",
        desc: "Set prices and durations for manicures and pedicures. Clients choose an available appointment themselves.",
      },
      {
        title: "Makeup artists",
        desc: "List your makeup services and available times. Clients book through your website.",
      },
      {
        title: "Massage studios",
        desc: "Set massage types, session lengths, and breaks. Check each therapist’s appointments.",
      },
    ],
    prev: "Previous studio type",
    next: "Next studio type",
    statusOf: "of",
  },
  howItWorks: {
    heading: "Start taking online bookings in three steps.",
    subheading:
      "Add your services and working hours. OPUS creates your booking website.",
    step1Title: "1. Add your studio details.",
    step1Desc:
      "Add your services, prices, team, and working hours. Set your breaks and days off.",
    step2Title: "2. Publish your website.",
    step2Desc:
      "Publish your free website and add your link to Instagram, your bio, or a message.",
    step3Title: "3. Receive online bookings.",
    step3Desc:
      "Clients choose a time without an account. New bookings appear in your calendar.",
    cta: "Create your free website",
  },
  pricing: {
    heading: "Choose what works for your studio.",
    subheading: "Your booking website and calendar are included for free.",
    note: "You don’t need Pro to take online bookings. Your website and calendar are part of the Free plan.",
    free: {
      name: "Free",
      price: "0",
      currency: "MKD",
      desc: "A website and calendar for you and three staff members.",
      cta: "Create your free website",
      label: "Included in the Free plan:",
      features: [
        "Unlimited appointments, services, and clients",
        "Your own yourstudio.opus.mk website",
        "Guest booking — no client account needed",
        "One owner + 3 staff members",
        "Team calendar with overlap protection",
        "Set working hours, breaks, and days off",
        "Client details and visit history",
        "Appointment confirmations by email",
        "Gallery with up to 3 photos",
        "Phone, tablet, and desktop access",
      ],
      end: "No credit card. No trial countdown.",
    },
    pro: {
      name: "Pro",
      price: "1,190",
      currency: "MKD / month",
      desc: "More staff, reports, and offers for empty slots.",
      cta: "Contact us about Pro",
      label: "Everything in Free, plus:",
      features: [
        "A larger team",
        "Client email reminders before appointments",
        "SMS confirmations and appointment reminders",
        "Email offers for empty and cancelled slots",
        "Detailed reports on your studio’s appointments",
        "More email, marketing, and notification controls",
        "Priority support",
      ],
      aiAnalystTitle: "AI Chat",
      aiAnalystSub:
        "200 answers per month, including up to 20 detailed analyses",
      aiReceptionistTitle: "24/7 AI receptionist",
      aiReceptionistSub:
        "Answers messages on Instagram, WhatsApp, and web chat and books appointments automatically.",
      aiRebookingTitle: "AI client analysis and suggestions",
      aiRebookingSub: "",
      end: "Contact us to activate Pro.",
    },
    custom: {
      name: "Custom software",
      price: "Custom pricing",
      desc: "From one specific feature to a complete system for your studio.",
      monthly: "Monthly plans available",
      cta: "Tell us your idea",
      label: "Built around your needs:",
      features: [
        "Custom features based on your ideas",
        "Web apps and tools for your team",
        "Connections to systems you already use",
        "Automation for everyday tasks",
        "Your design, brand, and way of working",
        "Development in phases around your priorities",
      ],
      end: "We agree on the scope, timeline, and monthly plan that works for you.",
    },
  },
  faq: {
    heading: "Questions about OPUS. Short answers.",
    subheading: "About pricing, booking, and using OPUS with your team.",
    items: [
      {
        question: "Is the Free plan really free?",
        answer:
          "Yes. Free is 0 MKD, with no credit card and no trial expiry. You get unlimited appointments, services, and clients, your own booking website, and space for one owner plus three staff members.",
      },
      {
        question: "Do my clients need to download an app?",
        answer:
          "No. Clients open your booking link on their phone or computer, select a service and time, enter their details, and book. They don’t need an account or an app.",
      },
      {
        question: "How do I get my own booking website?",
        answer:
          "Add your services, prices, team, and working hours, then publish. Your website lives at yourstudio.opus.mk. Share that link on Instagram or in messages, and bookings appear in your calendar.",
      },
      {
        question: "Can my team use the same calendar?",
        answer:
          "Yes. The Free plan includes one owner and three staff members. Manage appointments, availability, breaks, and days off together, with protection against overlapping appointments. Pro supports a larger team.",
      },
      {
        question: "What can I ask the AI business analyst?",
        answer:
          "The analyst answers questions such as “Which day has the most bookings?” and “How many appointments were cancelled?” Think of it as ChatGPT for your business, using your studio’s data. It does not change appointments or message clients. Pro includes 200 answers per month, including up to 20 detailed analyses.",
      },
      {
        question: "Does OPUS fill empty slots automatically?",
        answer:
          "No. OPUS suggests clients for an empty slot. You review and approve each offer before it is emailed. Only clients who agreed to receive offers can be contacted. The client decides whether to accept and book.",
      },
      {
        question: "Is OPUS made for my kind of studio?",
        answer:
          "OPUS is built for all types of businesses that work by appointment. If your type of business isn’t supported on our platform, please contact us.",
      },
    ],
  },
  finalCta: {
    heading: "Create your website. Take bookings online.",
    subheading:
      "Add your services, prices, and working hours. Share your link so clients can book.",
    cta: "Create your free website",
    small: "Free. No credit card needed.",
  },
  footer: {
    sloganLine1: "Online booking",
    sloganLine2: "for salons and studios.",
    meetOpus: "About OPUS",
    features: "Features",
    intelligence: "Reports & offers",
    pricing: "Pricing",
    nextChapter: "Get started",
    howItWorks: "How it works",
    faq: "Common questions",
    createWebsite: "Create your website",
    madeForYou: "For salons and studios.",
    madeForYouSub1: "A booking system for beauty",
    madeForYouSub2: "businesses in Macedonia.",
    copyright: "© 2026 OPUS.",
    tagline: "A booking website and calendar for your team.",
    contact: "Contact",
    privacy: "Privacy",
    terms: "Terms",
    cookieSettings: "Cookie settings",
    backToTop: "Back to top",
  },
  contactPage: {
    heroTitle1: "A little help.",
    heroTitle2: "A real conversation.",
    heroSubLine1:
      "Getting started, finding your feet, or planning your next chapter?",
    heroSubLine2: "We’re here for your studio.",
    proTitle: "Interested in Pro?",
    proDescription:
      "Tell us about your studio and ask about Pro features, pricing, and getting started.",
    detailsTitle: "Let’s talk.",
    emailLabel: "Prefer email?",
    phoneLabel: "Give us a call",
    locationLabel: "A little closer to home",
    locationValue: "Skopje, North Macedonia",
    faqLink: "Explore common questions",
    formTitle: "Tell us what’s on your mind.",
    formDescLine1: "A question, some feedback, or help getting started.",
    formDescLine2: "Leave a message and we’ll get back to you by email.",
    fieldName: "Your name",
    fieldEmail: "Email address",
    fieldBusiness: "Studio name",
    fieldMessage: "How can we help?",
    placeholderName: "Ana Petrova",
    placeholderEmail: "ana@yourstudio.mk",
    placeholderBusiness: "Your little corner of the beauty world",
    placeholderMessage: "Tell us a little about what you have in mind…",
    optional: "Optional",
    submit: "Send message",
    submitting: "Sending your message…",
    successTitle: "Message received.",
    successDesc:
      "Thanks for reaching out. We’ll reply to the email address you shared.",
    sendAnother: "Send another message",
    errorTitle: "Your message couldn’t be sent.",
    errorGeneric:
      "Please try again or email hello@opus.mk. Your message is still here.",
    errorRateLimit:
      "Please wait a little before trying again, or email us directly. Your message is still here.",
    errorConnection:
      "Please check your connection and try again, or email hello@opus.mk. Your message is still here.",
    privacyNote: "We’ll use your details to reply to your message.",
    readOur: "Read our ",
    privacyLink: "privacy policy",
  },
};

const messagesByLocale: Record<Locale, Messages> = {
  mk: mkMessages,
  en: enMessages,
};

export function getMessages(locale: Locale): Messages {
  return messagesByLocale[locale] ?? messagesByLocale.mk;
}
