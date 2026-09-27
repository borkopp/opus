import type { Locale } from "./locale";

export const mkMessages = {
  metadata: {
    home: {
      title: "OPUS — Систем за закажување за салони",
      description:
        "OPUS е систем за закажување за салони и студија за убавина. Добивате веб-страница каде клиентите закажуваат и календар за вашиот тим. Започнете бесплатно.",
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
    ai: "AI алатки",
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
    title: "Систем за закажување за вашиот салон.",
    description:
      "Со OPUS добивате веб-страница каде клиентите избираат услуга и слободен термин. Веб-страницата и календарот се бесплатни.",
    createWebsite: "Започнете бесплатно",
    learnMore: "Како работи OPUS",
    badgeFree: "Бесплатен план",
    badgeNoCard: "Без картичка",
    badgeForStudio: "За вас и вашиот тим",
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
    noteAiTitle: "Закажување преку вашиот линк",
    noteAiDesc: "Клиентите избираат слободен термин.",
    audiences: [
      "Фризерски салони",
      "Берберници",
      "Студија за нокти",
      "Шминкери",
      "Студија за масажа",
    ],
  },
  dashboardPreview: {
    heading: "Вака ги гледате термините во OPUS.",
    description:
      "Отворете го OPUS на телефон или компјутер. Видете кој клиент доаѓа, за која услуга и во колку часот.",
    imageAlt:
      "Пример на OPUS контролната табла со денешни термини, пополнетост на календарот и вредност на завршените термини.",
  },
  productTour: {
    heading: "Што добивате со OPUS?",
    subheading:
      "Веб-страница за вашите клиенти и календар за вас. Со Pro добивате и историја на посетите на секој клиент.",
    includedInFree: "Вклучено во бесплатниот план",
    includedInPro: "Вклучено во Pro",
    cta: "Започнете бесплатно",
    tabs: {
      website: {
        label: "Веб-сајт за закажување",
        title: "Клиентите закажуваат преку вашиот линк.",
        description:
          "Клиентот го отвора линкот, избира услуга, датум и слободен термин, па го потврдува закажувањето. Не му треба профил или апликација.",
        serviceName: "Потстрижување и фен",
        serviceDetail: "60 мин · 900 ден.",
      },
      calendar: {
        label: "Календар за термини",
        title: "Вие ги следите сите термини.",
        description:
          "Онлајн закажувањата се појавуваат во календарот. Термините договорени по телефон или порака ги внесувате сами. Можете да преместите или откажете термин.",
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
        title: "Проверете ги претходните посети.",
        description:
          "Со Pro, најдете клиент по име, е-пошта или телефон. Видете кои услуги ги користел и кога има следен термин.",
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
    heading: "За секојдневната работа во салонот.",
    subheading:
      "Поставете ги услугите и работното време. Примајте нови термини и менувајте ги постојните.",
    bookingTitle1: "Веб-страница",
    bookingTitle2: "за закажување.",
    bookingDesc1: "Прикажете ги услугите и цените.",
    bookingDesc2: "Клиентите бираат од слободните термини.",
    calendarTitle1: "Термини",
    calendarTitle2: "за тимот.",
    calendarDesc:
      "Секој член на тимот има свој распоред. OPUS спречува два термина кај ист вработен во исто време.",
    clientsTitle1: "Вашите",
    clientsTitle2: "клиенти.",
    clientsDesc1: "Контакти во секој термин.",
    clientsDesc2: "Историја на посети со Pro.",
    remindersTitle1: "Известувања",
    remindersTitle2: "по е-пошта.",
    remindersDesc1: "Потврди за секој термин.",
    remindersDesc2: "Потсетници со Pro.",
    summaryUnlimited: "Неограничени термини",
    summaryServices: "Неограничени услуги и клиенти",
    summaryDevices: "На телефон и компјутер",
  },
  promotion: {
    heading: "Споделете го линкот за закажување.",
    description:
      "Ставете го линкот во Instagram био, испратете го во порака или поставете QR-код во салонот.",
    qr: {
      label: "QR-код за закажување",
      title: "QR-код за вашиот салон.",
      description:
        "Преземете QR-код или готов A5 постер за печатење. Клиентите го скенираат и ја отвораат вашата веб-страница за закажување.",
      imageAlt: "Пример за A5 постер од OPUS со QR-код за онлајн закажување.",
      caption: "Пример за постер · Подготвен за печатење",
    },
    story: {
      label: "Instagram Story",
      title: "Објавете слободен термин на Instagram.",
      description:
        "Изберете слободен термин. OPUS подготвува слика со услугата, цената и времето. Преземете ја и објавете ја како Story со вашиот линк.",
      imageAlt:
        "Пример за Instagram Story од OPUS со услуга, датум, час и цена на слободен термин.",
      caption: "Пример за Story · 1080 × 1920",
    },
    included: "Вклучено во бесплатниот план",
    customization:
      "Ваши бои, име на студиото и линк. Достапно откако ќе ја објавите веб-страницата.",
    cta: "Започнете бесплатно",
  },
  intelligence: {
    heading: "AI за вашиот бизнис.",
    subheading:
      "AI одговара на пораки, ви дава препораки и ви помага подобро да го разберете вашиот бизнис.",
    usageNote:
      "AI Chat, AI Frontdesk и останатите алатки се вклучени во Pro. Користете ги директно од вашата сметка.",
    analyst: {
      name: "AI Chat",
      title: ["AI Chat"],
      description:
        "Прашајте го AI за вашиот бизнис. Добијте препораки, анализи и идеи за подобрување врз основа на податоците од вашиот салон.",
      note: "200 одговори месечно, од кои до 20 детални анализи.",
      artCopy: "Прашајте го AI за вашиот бизнис.",
      yourAnalyst: "AI Chat",
      subtitle: "Одговори, препораки и увид во вашиот бизнис.",
      sampleHeading: "ПРИМЕР ЗА РАЗГОВОР",
      sampleNote:
        "Илустративни податоци · Одговорите се засноваат на податоци од вашето студио.",
      limit1: "200 одговори / месечно",
      limit2: "До 20 детални анализи",
      days: ["П", "В", "С", "Ч", "П", "С"],
      chip: "AI препораки за вашиот бизнис",
      examples: [
        {
          label: "Најзафатени денови?",
          question: "Кога е најзафатено во моето студио?",
          answer:
            "Во оваа примерна недела, најзафатен ви е петокот. Во вторник имате најмногу слободни термини.",
        },
        {
          label: "Како да ги намалам откажувањата?",
          question: "Што можам да направам за да имам помалку откажувања?",
          answer:
            "Во овој пример, најмногу откажувања има во вторник. Пробајте потсетници пред терминот и следете дали бројот на откажувања се намалува.",
        },
        {
          label: "Како да пополнам повеќе термини?",
          question: "Што ми препорачуваш за да пополнам повеќе термини?",
          answer:
            "Во овој пример, најмногу слободни термини има во понеделник и вторник. Можете да им понудите термин на клиенти што веќе го посетиле студиото.",
        },
      ],
    },
    receptionist: {
      name: "AI Frontdesk",
      title: ["AI Frontdesk"],
      description:
        "AI одговара на Instagram пораките додека вие се посветувате на клиентите. Одговара за услуги, цени и слободни термини, а закажува откако клиентот ќе потврди.",
      note: "Поврзете го вашиот професионален Instagram профил од поставките.",
      channels: ["Instagram"],
    },
    rebooking: {
      name: "Историја на клиенти",
      title: ["Видете кој клиент кога бил."],
      description:
        "Најдете ги контактите, претходните посети и следните термини на клиентот во именикот на вашиот салон.",
      note: "Вклучено во Pro.",
      chip: "Контакти и претходни посети",
    },
    recovery: {
      name: "Понуди за слободни термини",
      title: ["Понудете слободен термин."],
      description:
        "OPUS предлага на кои клиенти да им понудите слободен термин. Вие ја одобрувате секоја понуда по е-пошта. Клиентот одлучува дали ќе закаже.",
      note: "Само за клиенти што дозволиле понуди по е-пошта.",
      flow: ["Изберете", "Прегледајте", "Одобрете"],
    },
  },
  carousel: {
    heading: "За салони и студија за убавина.",
    subheading:
      "За фризери, бербери, нокти, трепки и веѓи, шминка и масажа. За самостојна работа и за салони со поголем тим.",
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
    heading: "Како да започнете?",
    subheading:
      "Додајте ги услугите, објавете ја веб-страницата и споделете го линкот.",
    step1Title: "1. Додајте ги услугите.",
    step1Desc:
      "Внесете ги името и адресата на салонот, услуга со цена и времетраење и вашето работно време. Другите услуги и тимот можете да ги додадете подоцна.",
    step2Title: "2. Споделете го вашиот линк.",
    step2Desc:
      "OPUS ја создава вашата веб-страница. Прегледајте ја, објавете ја и ставете го линкот во Instagram био или испратете го на клиентите.",
    step3Title: "3. Следете ги термините.",
    step3Desc:
      "Клиентите закажуваат преку линкот. Вие ги гледате термините во календарот и можете да ги преместите или откажете.",
    cta: "Започнете бесплатно",
  },
  pricing: {
    heading: "Колку чини OPUS?",
    comparePlans: "Споредете ги сите функции",
    subheading:
      "Започнете бесплатно. Pro е 1.190 ден. месечно за дополнителни алатки и поголем тим.",
    note: "Онлајн закажувањето, веб-страницата и календарот се бесплатни. Pro е по избор.",
    free: {
      name: "Бесплатен план",
      price: "0",
      currency: "ден.",
      desc: "Онлајн закажување и календар за вас и до 3 вработени.",
      cta: "Започнете бесплатно",
      label: "Вклучено во бесплатниот план:",
      features: [
        "Неограничени термини, услуги и клиенти",
        "Ваша веб-страница за закажување",
        "Клиентите закажуваат без профил или апликација",
        "Сопственик и до 3 вработени",
        "Тимски календар без преклопување на термините",
        "Поставување работно време, паузи и слободни денови",
        "Контакт на клиентот во секој термин",
        "Потврди за термини по е-пошта",
        "Галерија со најмногу 3 фотографии",
        "QR-код и Instagram Story за промоција",
        "Пристап од телефон, таблет и компјутер",
      ],
      end: "Без кредитна картичка. Без пробен рок.",
    },
    pro: {
      name: "Pro",
      price: "1.190",
      currency: "ден. / месечно",
      desc: "AI алатки, поголем тим, историја на клиенти и потсетници.",
      cta: "Изберете Pro",
      label: "Сè од бесплатниот план, плус:",
      features: [
        "До 12 членови на тимот",
        "Галерија со најмногу 15 фотографии",
        "Именик на клиенти со историја и статистика на посети",
        "Потсетници за клиенти по е-пошта пред терминот",
        "SMS потврди и потсетници, со вклучување од поставките",
        "Понуди по е-пошта за слободни термини, со ваше одобрение",
        "Детални извештаи за термините во студиото",
        "Поголема контрола врз е-поштата, маркетингот и известувањата",
        "Приоритетна поддршка",
      ],
      aiAnalystTitle: "AI Chat",
      aiAnalystSub:
        "Прашајте го AI за вашиот бизнис и добијте препораки и анализи. 200 одговори месечно, од кои до 20 детални анализи.",
      aiReceptionistTitle: "AI Frontdesk",
      aiReceptionistSub:
        "AI одговара на Instagram пораките додека вие се посветувате на клиентите.",
      end: "Користете ги Pro алатките директно од вашата сметка.",
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
    heading: "Чести прашања.",
    subheading: "Што е OPUS, како се користи и што е бесплатно.",
    items: [
      {
        question: "Што е OPUS?",
        answer:
          "OPUS е систем за закажување за салони и студија за убавина. Добивате своја веб-страница каде клиентите закажуваат и календар каде ги следите термините на вашиот тим. Го користите преку интернет, на телефон или компјутер.",
      },
      {
        question: "Што добивам бесплатно?",
        answer:
          "Веб-страница за закажување, календар, неограничени термини и услуги, QR-код и слики за Instagram Story. Бесплатниот план е за сопственик и до 3 вработени. Не ви треба картичка и нема пробен рок.",
      },
      {
        question: "Како клиентите закажуваат?",
        answer:
          "Го споделувате вашиот линк на Instagram, во порака или преку QR-код. Клиентот избира услуга и слободен термин, ги внесува податоците и ја потврдува е-поштата. Закажаниот термин се појавува во вашиот календар. Не му треба профил или апликација.",
      },
      {
        question: "Можам ли да внесам термин договорен по телефон или порака?",
        answer:
          "Да. Отворете го календарот и внесете ги клиентот, услугата и времето. Рачно внесените и онлајн закажаните термини ги гледате во истиот календар.",
      },
      {
        question: "Дали ми треба сопствен веб-сајт?",
        answer:
          "Не. OPUS ви создава веб-страница со услугите, цените и слободните термини на адреса како yourstudio.opus.mk. Ја објавувате и го споделувате линкот со клиентите.",
      },
      {
        question: "За какви салони е OPUS?",
        answer:
          "За фризерски салони, берберници, студија за нокти, трепки и веѓи, шминкери и студија за масажа. Можете да го користите сами или со тим.",
      },
      {
        question: "Кога ми треба Pro?",
        answer:
          "За AI Chat, AI Frontdesk, повеќе од 4 членови во тимот, историја на клиенти и потсетници. Pro е 1.190 ден. месечно и поддржува до 12 членови. AI и SMS ги поставувате сами од вашата сметка. За основното закажување доволен е бесплатниот план.",
      },
      {
        question: "Дали OPUS сам испраќа понуди за слободни термини?",
        answer:
          "Не. Со Pro, OPUS предлага клиенти за слободен термин. Вие ја прегледувате и одобрувате секоја понуда пред да се испрати по е-пошта. Понуди добиваат само клиенти што дале согласност.",
      },
    ],
  },
  finalCta: {
    heading: "Примајте термини преку вашиот линк.",
    subheading:
      "Додајте ги услугите и работното време. Објавете ја бесплатната веб-страница и споделете ја со клиентите.",
    cta: "Започнете бесплатно",
    small: "Бесплатно. Не е потребна кредитна картичка.",
  },
  footer: {
    sloganLine1: "Онлајн закажување",
    sloganLine2: "за салони и студија.",
    meetOpus: "За OPUS",
    features: "Функции",
    intelligence: "AI алатки",
    pricing: "Цени",
    nextChapter: "Започнете со OPUS",
    howItWorks: "Како функционира",
    faq: "Чести прашања",
    createWebsite: "Започнете бесплатно",
    madeForYou: "За салони и студија.",
    madeForYouSub1: "Систем за закажување за салони",
    madeForYouSub2: " и студија за убавина.",
    copyright: "© 2026 OPUS.",
    tagline: "Веб-страница за клиентите. Календар за вашиот салон.",
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
      title: "OPUS — Appointment booking system for salons",
      description:
        "OPUS is an appointment booking system for salons and beauty studios. Get a website where clients book and a calendar for your team. Start for free.",
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
    ai: "AI tools",
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
    title: "A booking system for your salon.",
    description:
      "OPUS gives you a website where clients choose a service and an available time. The website and calendar are free.",
    createWebsite: "Start for free",
    learnMore: "How OPUS works",
    badgeFree: "Free plan",
    badgeNoCard: "No credit card",
    badgeForStudio: "For you and your team",
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
    noteAiTitle: "Bookings through your link",
    noteAiDesc: "Clients choose an available time.",
    audiences: [
      "Hair salons",
      "Barbershops",
      "Nail studios",
      "Makeup artists",
      "Massage studios",
    ],
  },
  dashboardPreview: {
    heading: "This is where you see your bookings.",
    description:
      "Open OPUS on your phone or computer. See which client is coming, what they booked, and when.",
    imageAlt:
      "Sample OPUS dashboard showing today's appointments, calendar occupancy, and completed appointment value.",
  },
  productTour: {
    heading: "What do you get with OPUS?",
    subheading:
      "A website for your clients and a calendar for you. Pro also includes each client’s visit history.",
    includedInFree: "Included in Free",
    includedInPro: "Included in Pro",
    cta: "Start for free",
    tabs: {
      website: {
        label: "Booking website",
        title: "Clients book through your link.",
        description:
          "Your client opens the link, chooses a service, date, and available time, then confirms the booking. No account or app needed.",
        serviceName: "Cut & blow-dry",
        serviceDetail: "60 min · 900 MKD",
      },
      calendar: {
        label: "Appointment calendar",
        title: "You manage every appointment.",
        description:
          "Online bookings appear in your calendar. Add phone and message bookings yourself. Move or cancel appointments when plans change.",
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
        title: "Check a client’s past visits.",
        description:
          "With Pro, find a client by name, email, or phone. See which services they booked and when their next appointment is.",
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
    heading: "For the daily work in your salon.",
    subheading:
      "Set your services and working hours. Take new bookings and update existing appointments.",
    bookingTitle1: "Your booking",
    bookingTitle2: "website.",
    bookingDesc1: "Show your services and prices.",
    bookingDesc2: "Clients choose from your available times.",
    calendarTitle1: "See your",
    calendarTitle2: "team’s day.",
    calendarDesc: "Each team member has their own schedule and reminders.",
    clientsTitle1: "Your",
    clientsTitle2: "clients.",
    clientsDesc1: "Contact details on each booking.",
    clientsDesc2: "Visit history with Pro.",
    remindersTitle1: "Confirmations and reminders by email.",
    remindersTitle2: "",
    remindersDesc1: "Confirmations for each booking.",
    remindersDesc2: "Reminders with Pro.",
    summaryUnlimited: "Unlimited appointments",
    summaryServices: "Unlimited services & clients",
    summaryDevices: "On your phone and computer",
  },
  promotion: {
    heading: "Share your booking link.",
    description:
      "Add your link to your Instagram bio, send it in a message, or display a QR code in your salon.",
    qr: {
      label: "Booking QR code",
      title: "A QR code for your salon.",
      description:
        "Download a QR code or an A5 sign to print. Clients scan it to open your booking website.",
      imageAlt:
        "Example OPUS A5 counter sign with a QR code for online booking.",
      caption: "Example counter sign · Ready to print",
    },
    story: {
      label: "Instagram Story",
      title: "Post an available time on Instagram.",
      description:
        "Choose an available appointment. OPUS creates an image with the service, price, and time. Download it and post it as a Story with your link.",
      imageAlt:
        "Example OPUS Instagram Story showing an available appointment with a service, date, time, and price.",
      caption: "Example Story · 1080 × 1920",
    },
    included: "Included in the Free plan",
    customization:
      "Your colors, studio name, and link. Available once your booking website is published.",
    cta: "Start for free",
  },
  intelligence: {
    heading: "AI for your business.",
    subheading:
      "AI answers messages, gives you recommendations, and helps you understand your business.",
    usageNote:
      "AI Chat, AI Frontdesk, and the other tools are included in Pro. Use them directly from your account.",
    analyst: {
      name: "AI Chat",
      title: ["AI Chat"],
      description:
        "Ask AI questions about your business. Get recommendations, explore trends, and find ways to improve using your salon’s data.",
      note: "200 answers per month, including up to 20 detailed analyses.",
      artCopy: "Ask AI about your business.",
      yourAnalyst: "AI Chat",
      subtitle: "Answers, recommendations, and business insights.",
      sampleHeading: "EXPLORE A SAMPLE CONVERSATION",
      sampleNote: "Illustrative data · Your answers use your studio’s data.",
      limit1: "200 answers / month",
      limit2: "Up to 20 detailed analyses",
      days: ["M", "T", "W", "T", "F", "S"],
      chip: "AI recommendations for your business",
      examples: [
        {
          label: "My busiest days?",
          question: "When is my studio busiest?",
          answer:
            "In this sample week, Friday is your busiest day. Tuesday has the most space for new appointments.",
        },
        {
          label: "How can I reduce cancellations?",
          question: "What can I do to reduce cancellations?",
          answer:
            "In this example, Tuesday has the most cancellations. Try appointment reminders and track whether cancellations decrease.",
        },
        {
          label: "How can I fill more slots?",
          question:
            "What would you recommend to help me fill more appointments?",
          answer:
            "In this example, Monday and Tuesday have the most empty slots. You could offer an appointment to clients who have visited before.",
        },
      ],
    },
    receptionist: {
      name: "AI Frontdesk",
      title: ["AI Frontdesk"],
      description:
        "AI answers your Instagram DMs while you focus on clients. It handles questions about services, prices, and available times, and books after the client confirms.",
      note: "Connect your professional Instagram account in settings.",
      channels: ["Instagram"],
    },
    rebooking: {
      name: "Client history",
      title: ["See each client’s past visits."],
      description:
        "Find a client’s contact details, past visits, and upcoming appointments in your salon’s client directory.",
      note: "Included in Pro.",
      chip: "Contact details and past visits",
    },
    recovery: {
      name: "Offers for empty slots",
      title: ["Offer an available appointment."],
      description:
        "OPUS suggests which clients to offer an available appointment. You approve each email offer. The client decides whether to book.",
      note: "Only for clients who have agreed to receive email offers.",
      flow: ["Choose", "Review", "Approve"],
    },
  },
  carousel: {
    heading: "For salons and beauty studios.",
    subheading:
      "For hair, barbering, nails, lashes and brows, makeup, and massage. For independent professionals and salons with larger teams.",
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
    heading: "How do you get started?",
    subheading: "Add your services, publish your website, and share your link.",
    step1Title: "1. Add your services.",
    step1Desc:
      "Enter your salon’s name and address, a service with its price and duration, and your working hours. Add more services and team members later.",
    step2Title: "2. Share your link.",
    step2Desc:
      "OPUS creates your website. Preview it, publish it, and add the link to your Instagram bio or send it to clients.",
    step3Title: "3. Manage your appointments.",
    step3Desc:
      "Clients book through your link. You see their appointments in your calendar and can move or cancel them.",
    cta: "Start for free",
  },
  pricing: {
    heading: "How much does OPUS cost?",
    comparePlans: "Compare all features",
    subheading:
      "Start for free. Pro is 1,190 MKD per month for more tools and a larger team.",
    note: "Online booking, your website, and your calendar are free. Pro is optional.",
    free: {
      name: "Free",
      price: "0",
      currency: "MKD",
      desc: "Online booking and a calendar for you and up to 3 staff.",
      cta: "Start for free",
      label: "Included in the Free plan:",
      features: [
        "Unlimited appointments, services, and clients",
        "Your own booking website",
        "Clients book without an account or app",
        "One owner and up to 3 staff",
        "Team calendar with overlap protection",
        "Set working hours, breaks, and days off",
        "Client contact details on every appointment",
        "Appointment confirmations by email",
        "Gallery with up to 3 photos",
        "Booking QR code and Instagram Story creation",
        "Phone, tablet, and desktop access",
      ],
      end: "No credit card. No trial expiry.",
    },
    pro: {
      name: "Pro",
      price: "1,190",
      currency: "MKD / month",
      desc: "AI tools, a larger team, client history, and reminders.",
      cta: "Choose Pro",
      label: "Everything in Free, plus:",
      features: [
        "Up to 12 team members",
        "Gallery with up to 15 photos",
        "Client directory with visit history and statistics",
        "Client email reminders before appointments",
        "SMS confirmations and reminders, enabled in settings",
        "Email offers for empty slots, approved by you",
        "Detailed reports on your studio’s appointments",
        "More email, marketing, and notification controls",
        "Priority support",
      ],
      aiAnalystTitle: "AI Chat",
      aiAnalystSub:
        "Ask AI about your business and get recommendations and insights. 200 answers per month, including up to 20 detailed analyses.",
      aiReceptionistTitle: "AI Frontdesk",
      aiReceptionistSub:
        "AI answers your Instagram DMs while you focus on clients.",
      end: "Use your Pro tools directly from your account.",
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
    heading: "Common questions.",
    subheading: "What OPUS is, how to use it, and what’s free.",
    items: [
      {
        question: "What is OPUS?",
        answer:
          "OPUS is an appointment booking system for salons and beauty studios. You get your own website where clients book and a calendar to manage your team’s appointments. Use it online, on your phone or computer.",
      },
      {
        question: "What do I get for free?",
        answer:
          "A booking website, a calendar, unlimited appointments and services, a QR code, and images for Instagram Stories. The Free plan supports one owner and up to 3 staff. No credit card or trial expiry.",
      },
      {
        question: "How do clients book?",
        answer:
          "Share your link on Instagram, in a message, or through a QR code. Clients choose a service and available time, enter their details, and verify their email. The booking appears in your calendar. They don’t need an account or an app.",
      },
      {
        question: "Can I add bookings made by phone or message?",
        answer:
          "Yes. Open the calendar and enter the client, service, and time. Bookings you add yourself and online bookings appear in the same calendar.",
      },
      {
        question: "Do I need my own website?",
        answer:
          "No. OPUS creates a website with your services, prices, and available times at an address like yourstudio.opus.mk. Publish it and share the link with clients.",
      },
      {
        question: "Which salons is OPUS for?",
        answer:
          "Hair salons, barbershops, nail studios, lash and brow studios, makeup artists, and massage studios. You can use it on your own or with a team.",
      },
      {
        question: "When do I need Pro?",
        answer:
          "For AI Chat, AI Frontdesk, more than 4 team members, client history, and reminders. Pro costs 1,190 MKD per month and supports up to 12 members. Set up AI and SMS yourself from your account. The Free plan covers everyday booking.",
      },
      {
        question: "Does OPUS send offers for empty slots by itself?",
        answer:
          "No. With Pro, OPUS suggests clients for an available appointment. You review and approve each offer before it is emailed. Only clients who agreed to receive offers can be contacted.",
      },
    ],
  },
  finalCta: {
    heading: "Let clients book through your link.",
    subheading:
      "Add your services and working hours. Publish your free website and share it with clients.",
    cta: "Start for free",
    small: "Free. No credit card needed.",
  },
  footer: {
    sloganLine1: "Online booking",
    sloganLine2: "for salons and studios.",
    meetOpus: "About OPUS",
    features: "Features",
    intelligence: "AI tools",
    pricing: "Pricing",
    nextChapter: "Get started",
    howItWorks: "How it works",
    faq: "Common questions",
    createWebsite: "Start for free",
    madeForYou: "For salons and studios.",
    madeForYouSub1: "A booking system for salons",
    madeForYouSub2: " and beauty studios.",
    copyright: "© 2026 OPUS.",
    tagline: "A website for clients. A calendar for your salon.",
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
