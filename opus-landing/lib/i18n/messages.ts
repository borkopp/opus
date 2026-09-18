import type { Locale } from "./locale";

export const mkMessages = {
  metadata: {
    home: {
      title: "OPUS — Повеќе време за вашиот занает.",
      description:
        "Ваш сопствен бесплатен веб-сајт за закажување, прегледен тимски календар и AI што му помага на вашиот бизнис за убавина да расте. Создадено за студија во Македонија.",
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
    ai: "OPUS AI",
    howItWorks: "Како функционира",
    pricing: "Цени",
    contact: "Контакт",
    newBadge: "НОВО",
    login: "Најава",
    startFree: "Започнете бесплатно",
    language: "Јазик",
  },
  hero: {
    previewLabel: "Илустративен приказ на календарот и веб-сајтот за закажување на OPUS.",
    titleLine1: "Вашето студио,",
    titleLine2: "Со модерен начин на закажување",
    descriptionLine1:
      "Сопствен веб-сајт за закажување, прегледен календар и вештачка интелигенција на ваша страна.",
    descriptionLine2: "",
    createWebsite: "Креирајте бесплатен веб-сајт",
    learnMore: "Дознајте повеќе",
    badgeFree: "Бесплатно",
    badgeNoCard: "Без картичка",
    badgeForStudio: "За вашето студио",
    noteBookingTitle: "Нов термин. Без пораки.",
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
    calendarFooterText: "Сè на своето место.",
    calendarView: "Отворете го календарот",
    phoneStudioName: "АТЕЉЕ",
    phoneStudioType: "СТУДИО ЗА УБАВИНА",
    phoneLocation: "СКОПЈЕ, МАКЕДОНИЈА",
    phoneHeading: "Момент за вас.",
    phoneSubheading: "Убава коса. Добра енергија. Време за вас.",
    phoneTabServices: "Услуги",
    phoneTabTeam: "Наш тим",
    phoneTabAbout: "За нас",
    phoneService1: "Потстрижување и фен",
    phoneService1Sub: "60 мин · од 900 ден.",
    phoneService2: "Нијансирање и нега",
    phoneService2Sub: "90 мин · од 1.800 ден.",
    phoneService3: "Брзо освежување",
    phoneService3Sub: "30 мин · од 500 ден.",
    phoneButton: "Закажете термин",
    phonePowered: "Со поддршка од",
    noteAiTitle: "Следната добра идеја за вашиот бизнис.",
    noteAiDesc: "Прашајте го OPUS AI за вашиот бизнис.",
    audiences: [
      "Фризерски салони",
      "Берберници",
      "Студија за нокти",
      "Шминкери",
      "Студија за масажа",
    ],
  },
  productTour: {
    headingLine1: "Од „Имате слободен термин?“",
    headingLine2: "до „Се гледаме тогаш.“",
    subheading: "Оставете го линкот да се погрижи за распоредот.",
    includedInFree: "Вклучено во бесплатниот план",
    cta: "Креирајте бесплатен веб-сајт",
    tabs: {
      website: {
        label: "Веб-сајт за закажување",
        title: "Вашето студио. Подготвено за закажување.",
        description:
          "Убава веб-страница на која клиентите избираат услуга и термин. Без профил. Без апликација.",
        serviceName: "Потстрижување и фен",
        serviceDetail: "60 мин · 900 ден.",
      },
      calendar: {
        label: "Тимски календар",
        title: "Еден тим. Јасен преглед на денот.",
        description:
          "Секој термин во еден заеднички календар, со работно време, паузи и без преклопување.",
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
        title: "Секоја посета. Забележана.",
        description:
          "Контакти и историја на посети на едно место, за секоја следна посета да биде попријатна и поперсонализирана.",
        clientName: "Елена Петрова",
        clientRemembered: "Клиентот што го познавате.",
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
    headingLine1: "Одличен бизнис.",
    headingLine2: "Едноставен ден.",
    subheading: "Сè што му треба на вашето студио — на едно место.",
    bookingTitle1: "Вашето студио.",
    bookingTitle2: "Еден елегантен линк.",
    bookingDesc1: "Веб-сајт за закажување со вашиот личен печат.",
    bookingDesc2: "Достапен секогаш кога ќе им притреба на вашите клиенти.",
    calendarTitle1: "Еден тим.",
    calendarTitle2: "Јасен преглед.",
    calendarDesc:
      "Термини, паузи и слободни денови. Совршено синхронизирани, без преклопување.",
    clientsTitle1: "Секој клиент.",
    clientsTitle2: "Познато лице.",
    clientsDesc1: "Контакт податоци и историја на посети.",
    clientsDesc2: "Поперсонализирано и потопло искуство.",
    remindersTitle1: "Мал потсетник.",
    remindersTitle2: "Една обврска помалку.",
    remindersDesc1: "Потврди и потсетници по е-пошта.",
    remindersDesc2: "Клиентите секогаш добиваат навремени информации.",
    summaryUnlimited: "Неограничени термини",
    summaryServices: "Неограничени услуги и клиенти",
    summaryDevices: "Достапно на секој уред",
  },
  intelligence: {
    headingLine1: "Го познавате вашиот занает.",
    headingLine2: "Сега, запознајте го вашиот бизнис.",
    subheading1: "Нова перспектива за вашето студио, со помош на AI.",
    subheading2: "Помалку претпоставки. Повеќе простор за раст.",
    usageNote:
      "AI функционалностите се вклучени во Pro и подлежат на ограничувања за користење.",
    analyst: {
      name: "Бизнис аналитичар",
      title: ["Добри прашања.", "Појасни одлуки."],
      description:
        "Поставувајте прашања за термините, пополнетоста, откажувањата и обрасците во работењето. Нова перспектива за вашето студио.",
      note: "200 одговори месечно, од кои до 20 детални анализи.",
      artCopy: "Малку јасност.<br />Свет од можности.",
      yourAnalyst: "Вашиот бизнис аналитичар",
      subtitle: "Добри прашања. Појасни одлуки.",
      sampleHeading: "ПРИМЕР ЗА РАЗГОВОР",
      sampleNote:
        "Илустративни податоци · Одговорите се засноваат на податоци од вашето студио.",
      limit1: "200 одговори / месечно",
      limit2: "До 20 детални анализи",
      days: ["П", "В", "С", "Ч", "П", "С"],
      chip: "Увиди од податоците за вашето студио",
      examples: [
        {
          label: "Најзафатени денови?",
          question: "Кога е најзафатено во моето студио?",
          answer:
            "Во оваа примерна недела, најзафатен ви е петокот. Во вторник имате најмногу слободни термини.",
        },
        {
          label: "Обрасци на откажување?",
          question: "Како изгледаат откажувањата на термини?",
          answer:
            "Во овој пример, најмногу откажувања има во вторник. Проверете колку порано клиентите откажуваат за подобро да го испланирате контактот со нив.",
        },
        {
          label: "Простор за раст?",
          question: "Каде моето студио има простор за раст?",
          answer:
            "Според овој пример, најмногу слободно време имате во понеделник и вторник. Размислете за понуда за нов термин за постојните клиенти.",
        },
      ],
    },
    receptionist: {
      name: "AI рецепционер",
      title: ["Секогаш тука.", "Дури и кога сте зафатени."],
      description:
        "Вашиот 24/7 AI рецепционер се грижи за комуникацијата преку веб-чет, Instagram и WhatsApp.",
      note: "Вклучени 500 одговори месечно.",
      channels: ["Веб-чет", "Instagram", "WhatsApp"],
    },
    rebooking: {
      name: "Персонализирано повторно закажување",
      title: ["Следната посета.", "Уште поперсонална."],
      description:
        "AI ги користи претходните посети за да предложи соодветен термин за следната посета и дополнителни услуги за секој клиент.",
      note: "Предлози што ви помагаат да одлучите што најмногу му одговара на клиентот.",
      chip: "Прилагодено на историјата на посети",
    },
    recovery: {
      name: "Пополнување празни термини",
      title: ["Слободен термин.", "Нова можност."],
      description:
        "Најдете соодветни клиенти за слободен термин, прегледајте го предлогот и сами одобрете ја секоја понуда пред да се испрати по е-пошта.",
      note: "Не бара AI. Не закажува автоматски.",
      flow: ["Пронајди", "Прегледај", "Одобри"],
    },
  },
  carousel: {
    headingLine1: "Вашиот занает. Вашите луѓе.",
    headingLine2: "Студио токму како вашето.",
    subheading:
      "За луѓето поради кои другите се чувствуваат најубаво. Најдете го своето место во поедноставен работен ден.",
    footer: "Вашиот занает. Со малку повеќе леснотија.",
    slides: [
      {
        title: "Фризерски салони",
        desc: "Од првото шишање до целосна трансформација. Ослободете време за она што го правите најдобро.",
      },
      {
        title: "Берберници",
        desc: "Свежи фејдови. Познати лица. Јасен распоред за вашиот стол да биде постојано зафатен.",
      },
      {
        title: "Студија за нокти",
        desc: "За малите детали што прават голема разлика. Секој термин, совршено организиран.",
      },
      {
        title: "Шминкери",
        desc: "Секој изглед започнува со добра подготовка. Дајте му на секој клиент свој посебен момент.",
      },
      {
        title: "Студија за масажа",
        desc: "Посмирен начин да го водите денот. Дајте им простор на клиентите да забават и да се опуштат.",
      },
    ],
    prev: "Претходен тип на студио",
    next: "Следен тип на студио",
    statusOf: "од",
  },
  howItWorks: {
    headingLine1: "Неколку детали.",
    headingLine2: "Новиот начин на закажување.",
    subheadingLine1:
      "Без изработка на веб-страница. Без комплицирано поставување.",
    subheadingLine2: "Само вашето студио, подготвено да го споделите.",
    step1Title: "Поставете го студиото.",
    step1Desc:
      "Внесете ги услугите, цените, тимот и работното време. Поставете ги вашите паузи и слободни денови.",
    step2Title: "Објавете. Споделете. Веќе сте онлајн.",
    step2Desc:
      "Објавете го вашиот бесплатен веб-сајт и споделете го линкот на Instagram, во био или преку порака.",
    step3Title: "Нека закажувањата доаѓаат кај вас.",
    step3Desc:
      "Клиентите избираат термин без да создаваат профил. Новите термини се појавуваат директно во вашиот календар.",
    cta: "Поставете го вашето студио.",
  },
  pricing: {
    headingLine1: "Вашата амбиција.",
    headingLine2: "Вашето темпо. Вашиот план.",
    subheadingLine1:
      "Започнете бесплатно. Надградете кога ќе бидете подготвени.",
    subheadingLine2: "Без притисок. Само можности.",
    note: "Вашиот веб-сајт за закажување е бесплатен. Изберете Pro за алатки што ве водат чекор понатаму.",
    free: {
      name: "Бесплатен план",
      price: "0",
      currency: "ден.",
      desc: "Сè што ви треба за следниот клиент.",
      cta: "Креирајте бесплатен веб-сајт",
      label: "Навистина бесплатен план. Без истекување.",
      features: [
        "Неограничени термини, услуги и клиенти",
        "Ваш веб-сајт на yourstudio.opus.mk",
        "Закажување за клиенти — без кориснички профил",
        "Еден сопственик + тројца членови на тимот",
        "Тимски календар без преклопување на термините",
        "Работно време, паузи и слободни денови",
        "Детали за клиенти и историја на посети",
        "Потврди за термини и потсетници по е-пошта",
        "Галерија со најмногу 3 фотографии",
        "Пристап од телефон, таблет и компјутер",
      ],
      end: "Без кредитна картичка. Без пробен рок.",
    },
    pro: {
      name: "Pro",
      price: "1.190",
      currency: "ден. / месечно",
      desc: "Сите основни алатки, плус паметни алатки за раст.",
      cta: "Започнете со Pro",
      label: "Сè од бесплатниот план, плус:",
      features: [
        "Поголем тим",
        "Пополнување на слободни и откажани термини",
        "Напредна аналитика за студиото",
        "Поголема контрола врз е-поштата, маркетингот и известувањата",
        "Приоритетна поддршка",
      ],
      aiAnalystTitle: "AI-аналитичар за вашиот бизнис",
      aiAnalystSub: "200 одговори месечно, од кои до 20 детални анализи",
      aiReceptionistTitle: "24/7 AI рецепционер",
      aiReceptionistSub: "Веб-чет, Instagram, WhatsApp · 500 одговори месечно",
      aiRebookingTitle: "Персонализирани AI-предлози",
      aiRebookingSub:
        "Нова посета и дополнителни услуги според претходните посети",
      end: "AI функционалностите подлежат на ограничувања за користење.",
    },
  },
  faq: {
    headingLine1: "Добри прашања.",
    headingLine2: "Едноставни одговори.",
    subheadingLine1: "Неколку работи што можеби ве интересираат",
    subheadingLine2: "пред да започнете.",
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
          "Прашајте за вашите термини, пополнетоста, откажувањата и обрасците во работењето. Pro вклучува 200 одговори месечно, од кои до 20 детални анализи, во рамките на лимитите за користење. Аналитичарот ви помага да го разберете вашиот бизнис и да донесете подобри одлуки.",
      },
      {
        question:
          "Дали пополнувањето на празни термини закажува клиенти автоматски?",
        answer:
          "Не. Функцијата предлага соодветни клиенти за отворените термини. Вие ја прегледувате и одобрувате секоја понуда по е-пошта. Овој процес не бара AI и не закажува автоматски без ваша дозвола.",
      },
      {
        question: "Кои канали ги поддржува AI рецепционерот?",
        answer:
          "AI рецепционерот во Pro поддржува веб-чет, Instagram и WhatsApp, со 500 одговори месечно. Вашите клиенти можат да добијат одговори во секое време.",
      },
      {
        question: "Дали OPUS е создаден за мојот тип на студио?",
        answer:
          "OPUS е создаден за салони за коса, берберници, студија за нокти, шминкери и студија за масажа во Македонија. Достапен е на телефон, таблет и компјутер — за самостојни професионалци и мали тимови.",
      },
    ],
  },
  finalCta: {
    headingLine1: "Помалку администрација.",
    headingLine2: "Повеќе убави денови.",
    subheadingLine1: "Вашиот бесплатен веб-сајт за закажување ве очекува.",
    subheadingLine2: "Ајде да му го дадеме вашиот личен печат.",
    cta: "Креирајте бесплатен веб-сајт",
    small: "Бесплатно. Не е потребна кредитна картичка.",
  },
  footer: {
    sloganLine1: "Малку повеќе време",
    sloganLine2: "за она што го сакате.",
    meetOpus: "Запознајте го OPUS",
    features: "Функции",
    intelligence: "OPUS интелигенција",
    pricing: "Цени",
    nextChapter: "Вашето следно поглавје",
    howItWorks: "Како функционира",
    faq: "Чести прашања",
    createWebsite: "Креирајте го вашиот веб-сајт",
    madeForYou: "Создадено за вас.",
    madeForYouSub1: "Внимателно создадено за студија",
    madeForYouSub2: "за убавина во Македонија.",
    copyright: "© 2026 OPUS. Малку повеќе можности.",
    tagline: "Убавината е ваша грижа. Едноставноста е наша.",
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
      title: "OPUS — More time for your craft.",
      description:
        "Your own free booking website, one organized team calendar, and AI that helps your beauty business grow. Made for studios in Macedonia.",
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
    ai: "OPUS AI",
    howItWorks: "How it works",
    pricing: "Pricing",
    contact: "Contact",
    newBadge: "NEW",
    login: "Log in",
    startFree: "Start for free",
    language: "Language",
  },
  hero: {
    previewLabel: "Illustrative preview of the OPUS calendar and booking website.",
    titleLine1: "Your craft. Your studio.",
    titleLine2: "A little more effortless.",
    descriptionLine1:
      "Your own booking website, a calmer calendar, and AI on your side.",
    descriptionLine2:
      "Meet the space where your beauty business comes together.",
    createWebsite: "Create your free website",
    learnMore: "Learn more",
    badgeFree: "Free",
    badgeNoCard: "No credit card",
    badgeForStudio: "Made for your studio",
    noteBookingTitle: "A new booking. Zero messages.",
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
    calendarFooterText: "Everything in its right place.",
    calendarView: "View calendar",
    phoneStudioName: "ATELIER",
    phoneStudioType: "BEAUTY STUDIO",
    phoneLocation: "SKOPJE, MACEDONIA",
    phoneHeading: "A moment for you.",
    phoneSubheading: "Good hair. Good energy. Your time.",
    phoneTabServices: "Services",
    phoneTabTeam: "Our team",
    phoneTabAbout: "About",
    phoneService1: "Cut & blow-dry",
    phoneService1Sub: "60 min · from 900 MKD",
    phoneService2: "Color & care",
    phoneService2Sub: "90 min · from 1,800 MKD",
    phoneService3: "A little refresh",
    phoneService3Sub: "30 min · from 500 MKD",
    phoneButton: "Find your moment",
    phonePowered: "Made possible with",
    noteAiTitle: "Your next good idea, found.",
    noteAiDesc: "Ask OPUS AI about your business.",
    audiences: [
      "Hair salons",
      "Barbershops",
      "Nail studios",
      "Makeup artists",
      "Massage studios",
    ],
  },
  productTour: {
    headingLine1: "From “Are you free?”",
    headingLine2: "to “See you then.”",
    subheading: "Let your link do the scheduling.",
    includedInFree: "Included in Free",
    cta: "Create your free website",
    tabs: {
      website: {
        label: "Booking website",
        title: "Your studio. Ready to book.",
        description:
          "A beautiful website where clients choose a service and a time. No account. No app.",
        serviceName: "Cut & blow-dry",
        serviceDetail: "60 min · 900 MKD",
      },
      calendar: {
        label: "Team calendar",
        title: "One team. One clear day.",
        description:
          "Every appointment in one shared calendar, with working hours, breaks, and protection against overlaps.",
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
        title: "Every visit. Remembered.",
        description:
          "Keep client details and past visits together, so the next appointment feels a little more personal.",
        clientName: "Elena Petrova",
        clientRemembered: "Your client, remembered.",
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
    headingLine1: "A beautiful business.",
    headingLine2: "A beautifully simple day.",
    subheading: "Everything your studio needs, together in one place.",
    bookingTitle1: "Your studio.",
    bookingTitle2: "One beautiful link.",
    bookingDesc1: "A booking website that feels like you.",
    bookingDesc2: "Ready whenever your clients are.",
    calendarTitle1: "One team.",
    calendarTitle2: "One clear picture.",
    calendarDesc:
      "Appointments, breaks, and days off. Beautifully in sync, with protection against overlaps.",
    clientsTitle1: "Every client.",
    clientsTitle2: "A familiar face.",
    clientsDesc1: "Contact details and visit history.",
    clientsDesc2: "A more personal touch.",
    remindersTitle1: "A little reminder.",
    remindersTitle2: "One less thing to do.",
    remindersDesc1: "Email confirmations and reminders.",
    remindersDesc2: "We’ll keep your clients in the loop.",
    summaryUnlimited: "Unlimited appointments",
    summaryServices: "Unlimited services & clients",
    summaryDevices: "Works on every device",
  },
  intelligence: {
    headingLine1: "You know your craft.",
    headingLine2: "Now, know your business.",
    subheading1: "A fresh perspective on your studio, powered by AI.",
    subheading2: "Less guesswork. More room to grow.",
    usageNote: "AI features are included in Pro and subject to usage limits.",
    analyst: {
      name: "Business analyst",
      title: ["Good questions.", "Clearer decisions."],
      description:
        "Ask questions about bookings, occupancy, cancellations, and business patterns. A fresh perspective on your studio.",
      note: "200 answers per month, up to 20 detailed.",
      artCopy: "A little clarity.<br />A world of possibility.",
      yourAnalyst: "Your business analyst",
      subtitle: "Good questions. Clearer decisions.",
      sampleHeading: "EXPLORE A SAMPLE CONVERSATION",
      sampleNote: "Illustrative data · Your answers use your studio’s data.",
      limit1: "200 answers / month",
      limit2: "Up to 20 detailed analyses",
      days: ["M", "T", "W", "T", "F", "S"],
      chip: "Insights from your studio’s data",
      examples: [
        {
          label: "My busiest days?",
          question: "When is my studio busiest?",
          answer:
            "In this sample week, Friday is your busiest day. Tuesday has the most space for new appointments.",
        },
        {
          label: "Cancellation patterns?",
          question: "What do my cancellation patterns look like?",
          answer:
            "In this sample, Tuesday has the most cancellations. Look at how far in advance clients cancel to plan your follow-up.",
        },
        {
          label: "Room to grow?",
          question: "Where does my studio have room to grow?",
          answer:
            "This sample shows the most available time on Monday and Tuesday. Consider testing a relevant rebooking offer for past clients.",
        },
      ],
    },
    receptionist: {
      name: "AI receptionist",
      title: ["Always there.", "Even when you’re busy."],
      description:
        "Your 24/7 AI receptionist keeps conversations moving on web chat, Instagram, and WhatsApp.",
      note: "500 replies included per month.",
      channels: ["Web chat", "Instagram", "WhatsApp"],
    },
    rebooking: {
      name: "Personalized rebooking",
      title: ["The next visit.", "A little more personal."],
      description:
        "AI uses previous visits to suggest thoughtful rebookings and relevant service upgrades for each client.",
      note: "Suggestions to help you decide what fits.",
      chip: "Personalized to their visit history",
    },
    recovery: {
      name: "Opening recovery",
      title: ["An open slot.", "A new opportunity."],
      description:
        "Find suitable clients for an opening, review the suggestion, and approve each email offer yourself.",
      note: "No AI required. No automatic bookings.",
      flow: ["Find", "Review", "Approve"],
    },
  },
  carousel: {
    headingLine1: "Your craft. Your people.",
    headingLine2: "Your kind of studio.",
    subheading:
      "For the people who make people feel their best. Find your place in a simpler studio day.",
    footer: "Your craft. A little more effortless.",
    slides: [
      {
        title: "Hair salons",
        desc: "From the first trim to a full transformation. Make room for every kind of good hair day.",
      },
      {
        title: "Barbershops",
        desc: "Fresh cuts. Familiar faces. A clear schedule that keeps your chair moving.",
      },
      {
        title: "Nail studios",
        desc: "For the little details that make a big difference. Every appointment, beautifully organized.",
      },
      {
        title: "Makeup artists",
        desc: "Every look starts with a little preparation. Give each client their moment.",
      },
      {
        title: "Massage studios",
        desc: "A calmer way to manage your day. Make space for your clients to slow down.",
      },
    ],
    prev: "Previous studio type",
    next: "Next studio type",
    statusOf: "of",
  },
  howItWorks: {
    headingLine1: "A few details.",
    headingLine2: "A whole new way to book.",
    subheadingLine1: "No website project. No complicated setup.",
    subheadingLine2: "Just your studio, ready to share.",
    step1Title: "Make yourself at home.",
    step1Desc:
      "Add your services, prices, team, and working hours. Set your breaks and days off.",
    step2Title: "Publish. Share. You’re live.",
    step2Desc:
      "Publish your free website and add your link to Instagram, your bio, or a message.",
    step3Title: "Let the bookings come to you.",
    step3Desc:
      "Clients choose a time without an account. New bookings appear in your calendar.",
    cta: "Let’s set up your studio",
  },
  pricing: {
    headingLine1: "Your ambition.",
    headingLine2: "Your pace. Your plan.",
    subheadingLine1: "A generous free start. A little extra when you’re ready.",
    subheadingLine2: "No pressure. Just possibilities.",
    note: "Your booking website is free. Choose Pro for the tools that take you further.",
    free: {
      name: "Free",
      price: "0",
      currency: "MKD",
      desc: "Everything you need to welcome your next client.",
      cta: "Create your free website",
      label: "A real free plan. No expiry.",
      features: [
        "Unlimited appointments, services, and clients",
        "Your own yourstudio.opus.mk website",
        "Guest booking — no client account needed",
        "One owner + 3 staff members",
        "Team calendar with overlap protection",
        "Working hours, breaks, and days off",
        "Client details and visit history",
        "Email confirmations and reminders",
        "Gallery with up to 3 photos",
        "Phone, tablet, and desktop access",
      ],
      end: "No credit card. No trial countdown.",
    },
    pro: {
      name: "Pro",
      price: "1,190",
      currency: "MKD / month",
      desc: "The everyday essentials, plus intelligence to grow.",
      cta: "Get started with Pro",
      label: "Everything in Free, plus:",
      features: [
        "A larger team",
        "Opening and cancellation recovery",
        "Advanced studio analytics",
        "More email, marketing, and notification controls",
        "Priority support",
      ],
      aiAnalystTitle: "AI business analyst",
      aiAnalystSub: "200 answers/month, up to 20 detailed",
      aiReceptionistTitle: "24/7 AI receptionist",
      aiReceptionistSub: "Web chat, Instagram, WhatsApp · 500 replies/month",
      aiRebookingTitle: "Personalized AI recommendations",
      aiRebookingSub: "Rebooking and upsells based on previous visits",
      end: "AI features are subject to usage limits.",
    },
  },
  faq: {
    headingLine1: "Good questions.",
    headingLine2: "Simple answers.",
    subheadingLine1: "A few things you might be wondering",
    subheadingLine2: "before making yourself at home.",
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
          "Ask about your bookings, occupancy, cancellations, and business patterns. Pro includes 200 answers per month, with up to 20 detailed analyses, subject to usage limits. The analyst helps you understand your business and make decisions.",
      },
      {
        question: "Does opening recovery book clients automatically?",
        answer:
          "No. Opening recovery suggests suitable clients for empty appointments. You review and approve every email offer. This workflow doesn’t require AI and doesn’t automatically book appointments.",
      },
      {
        question: "Which channels does the AI receptionist support?",
        answer:
          "The Pro AI receptionist supports web chat, Instagram, and WhatsApp, with 500 replies per month. It gives your clients a way to get answers around the clock.",
      },
      {
        question: "Is OPUS made for my kind of studio?",
        answer:
          "OPUS is built for beauty salons, barbershops, nail studios, makeup artists, and massage studios in Macedonia. It works on phone, tablet, and desktop, for solo professionals and small teams.",
      },
    ],
  },
  finalCta: {
    headingLine1: "Less admin.",
    headingLine2: "More beautiful days.",
    subheadingLine1: "Your free booking website is waiting.",
    subheadingLine2: "Let’s make it feel like you.",
    cta: "Create your free website",
    small: "Free. No credit card needed.",
  },
  footer: {
    sloganLine1: "A little more time",
    sloganLine2: "for what you love.",
    meetOpus: "Meet OPUS",
    features: "Features",
    intelligence: "OPUS Intelligence",
    pricing: "Pricing",
    nextChapter: "Your next chapter",
    howItWorks: "How it works",
    faq: "Common questions",
    createWebsite: "Create your website",
    madeForYou: "Made for you.",
    madeForYouSub1: "Thoughtfully built for beauty",
    madeForYouSub2: "businesses in Macedonia.",
    copyright: "© 2026 OPUS. A little more possibility.",
    tagline: "Beauty is your business. Simplicity is ours.",
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
