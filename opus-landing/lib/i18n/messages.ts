import type { Locale } from "./locale";

export const mkMessages = {
  metadata: {
    home: {
      title: "OPUS — Онлајн закажување за салони во Македонија",
      description:
        "Ваша веб-страница за закажување, календар и историја на клиенти. Пробајте OPUS 2 месеци без картичка, потоа изберете месечна претплата според тимот.",
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
    switchToAlbanian: "Префрли на албански",
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
    startFree: "Пробајте 2 месеци",
    language: "Јазик",
  },
  hero: {
    previewLabel:
      "Илустративен приказ на календарот и веб-сајтот за закажување на OPUS.",
    title: "Систем за закажување за вашиот салон.",
    description:
      "Со OPUS добивате веб-страница каде клиентите избираат услуга и слободен термин, а вие ги следите сите закажувања во еден календар.",
    createWebsite: "Пробајте 2 месеци",
    learnMore: "Како работи OPUS",
    badgeFree: "2 месеци пробно за нови студија",
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
      "Веб-страница за вашите клиенти, календар за вашиот тим и историја на посетите на едно место.",
    includedInFree: "Вклучено во OPUS",
    includedInPro: "Вклучено во OPUS",
    cta: "Пробајте 2 месеци",
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
          "Најдете клиент по име, е-пошта или телефон. Видете кои услуги ги користел и кога има следен термин.",
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
    clientsDesc2: "Историја на посети на едно место.",
    remindersTitle1: "Известувања",
    remindersTitle2: "по е-пошта.",
    remindersDesc1: "Потврди за секој термин.",
    remindersDesc2: "Потсетници пред терминот.",
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
    included: "Вклучено во OPUS",
    customization:
      "Ваши бои, име на студиото и линк. Достапно откако ќе ја објавите веб-страницата.",
    cta: "Пробајте 2 месеци",
  },
  intelligence: {
    heading: "AI за вашиот бизнис.",
    subheading:
      "AI одговара на пораки, ви дава препораки и ви помага подобро да го разберете вашиот бизнис.",
    usageNote:
      "AI Chat вклучува 200 одговори месечно, од кои до 20 детални анализи. AI Receptionist бара поврзан професионален Instagram профил и овозможена интеграција.",
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
      name: "AI Receptionist",
      title: ["AI Receptionist"],
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
      note: "Вклучено во OPUS",
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
      {
        title: "Студија за трепки",
        desc: "Поставете посебни термини за надградба, дополнување и подигнување на трепки. Клиентите избираат слободно време.",
      },
      {
        title: "Студија за веѓи",
        desc: "Примајте термини за обликување, боење и ламинација на веѓи. Сите закажувања се во еден календар.",
      },
      {
        title: "Нега на лице и кожа",
        desc: "Додајте ги третманите за лице со цена и времетраење. Клиентите закажуваат преку вашиот веб-сајт.",
      },
      {
        title: "Студија за депилација",
        desc: "Поставете услуги за депилација со восок или шеќерна паста. Одредете времетраење и пауза за секој третман.",
      },
      {
        title: "Ласерска епилација",
        desc: "Организирајте ги услугите по зона и времетраење. Следете ги закажаните третмани во календарот.",
      },
      {
        title: "Трајна шминка",
        desc: "Додајте посебни услуги за прв третман и корекција. Клиентите избираат услуга и слободен термин.",
      },
      {
        title: "Солариуми",
        desc: "Поставете ги сесиите со цена и времетраење. Клиентите закажуваат онлајн, а вие го следите распоредот.",
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
    cta: "Пробајте 2 месеци",
  },
  pricing: {
    heading: "Еден план. Цена според вашиот тим.",
    comparePlans: "Погледнете што е вклучено",
    subheading:
      "Новите студија добиваат 2 месеци пробно без картичка. Потоа од {proPrice} месечно за еден член на тимот.",
    note: "По пробниот период е потребна платена претплата за да продолжите да примате нови термини. Нема автоматска наплата.",
    trialLabel: "Првите 2 месеци без наплата",
    afterTrial: "Потоа",
    teamNote:
      "Сопственикот и менаџерите се бројат; неактивните членови не се бројат. Пробниот период поддржува до 12 членови. Изборот ја прикажува цената при претплата.",
    largeTeamTitle: "Тим од 13 или повеќе?",
    largeTeamCta: "Контактирајте нè",
    pro: {
      name: "OPUS",
      currency: "ден. / месечно",
      desc: "Веб-страница, онлајн закажување и алатки за секојдневната работа во вашиот салон.",
      teamSizeLabel: "Големина на тимот",
      teamSizeValue: "До {count} членови",
      teamSizeSingle: "1 член",
      teamFeatureSingle: "1 активен член на тимот",
      teamFeature: "До {count} активни членови на тимот",
      cta: "Пробајте 2 месеци",
      label: "Вклучено во избраниот пакет:",
      features: [
        "Веб-страница со ваши услуги, цени, бои и фотографии",
        "Неограничени термини, услуги и клиенти",
        "Закажување без профил или апликација за клиентот",
        "Тимски календар, работно време и заштита од преклопување",
        "Галерија со најмногу 15 фотографии",
        "Именик на клиенти со историја на посети",
        "Потврди и потсетници за термини по е-пошта",
        "SMS потврди и потсетници по активирање; важат ограничувања",
        "Понуди по е-пошта за слободни термини, со ваше одобрение",
        "Извештаи за термините во студиото",
        "QR-код, Instagram Story слики и зачувани одговори",
        "Пристап од телефон, таблет и компјутер",
      ],
      aiAnalystTitle: "AI Chat",
      aiAnalystSub:
        "200 одговори месечно, од кои до 20 детални анализи. Одговорите се засноваат на податоците од вашето студио.",
      aiReceptionistTitle: "AI Receptionist",
      aiReceptionistSub:
        "Одговори на Instagram пораки и закажување со потврда од клиентот, по поврзување и активирање на интеграцијата.",
      end: "Пробниот период е за нови студија, без картичка. Нема наплата без ваша претплата. Ако се претплатите порано, месечната наплата започнува веднаш. AI и SMS зависат од конфигурацијата; SMS не е неограничен.",
    },
  },
  faq: {
    heading: "Чести прашања.",
    subheading: "За пробниот период, цената и секојдневното закажување.",
    items: [
      {
        question: "Што е OPUS?",
        answer:
          "OPUS е систем за закажување за салони и студија за убавина. Добивате своја веб-страница каде клиентите закажуваат и календар каде ги следите термините на вашиот тим. Го користите преку интернет, на телефон или компјутер.",
      },
      {
        question: "Како функционира пробниот период?",
        answer:
          "Новите студија можат да го пробаат OPUS 2 месеци без платежна картичка. Пробниот период поддржува до 12 активни членови. При претплата избирате платен план според големината на тимот. Потоа е потребна платена претплата за да продолжите да примате нови термини. Нема автоматска наплата. Постојните термини и податоци се зачувани. И понатаму можете да управувате со веќе закажаните термини.",
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
        question: "Колку ќе плаќам по пробниот период?",
        answer:
          "Месечната цена зависи од активните членови на тимот: {proPrices}. Сопственикот и менаџерите се бројат; неактивните членови не се бројат. Секоја опција ги вклучува истите функции. За 13 или повеќе членови, контактирајте нè. AI и SMS бараат конфигурација; SMS не е неограничен.",
      },
      {
        question: "Дали OPUS сам испраќа понуди за слободни термини?",
        answer:
          "Не. OPUS предлага клиенти за слободен термин. Вие ја прегледувате и одобрувате секоја понуда пред да се испрати по е-пошта. Понуди добиваат само клиенти што дале согласност.",
      },
    ],
  },
  finalCta: {
    heading: "Примајте термини преку вашиот линк.",
    subheading:
      "Додајте ги услугите и работното време, објавете ја веб-страницата и споделете го линкот. Новите студија добиваат 2 месеци пробно.",
    cta: "Пробајте 2 месеци",
    small: "2 месеци пробно за нови студија. Без картичка.",
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
    createWebsite: "Пробајте 2 месеци",
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
    proTitle: "Ви треба помош да започнете?",
    proDescription:
      "Пишете ни за вашето студио, големината на тимот или пробниот период. За тимови со 13 или повеќе членови, ќе разговараме за соодветна понуда.",
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
      title: "OPUS — Salon Booking Software in Macedonia",
      description:
        "Your booking website, team calendar and client history. Try OPUS for 2 months without a card, then choose a monthly subscription for your team size.",
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
    switchToAlbanian: "Switch to Albanian",
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
    startFree: "Try 2 months",
    language: "Language",
  },
  hero: {
    previewLabel:
      "Illustrative preview of the OPUS calendar and booking website.",
    title: "A booking system for your salon.",
    description:
      "OPUS gives you a website where clients choose a service and an available time, while you manage every appointment in one calendar.",
    createWebsite: "Try 2 months",
    learnMore: "How OPUS works",
    badgeFree: "2-month trial for new studios",
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
      "A website for your clients, a calendar for your team, and visit history in one place.",
    includedInFree: "Included in OPUS",
    includedInPro: "Included in OPUS",
    cta: "Try 2 months",
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
          "Find a client by name, email, or phone. See their past services and upcoming appointments.",
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
    clientsDesc2: "Visit history in one place.",
    remindersTitle1: "Confirmations and reminders by email.",
    remindersTitle2: "",
    remindersDesc1: "Confirmations for each booking.",
    remindersDesc2: "Reminders before appointments.",
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
    included: "Included in OPUS",
    customization:
      "Your colors, studio name, and link. Available once your booking website is published.",
    cta: "Try 2 months",
  },
  intelligence: {
    heading: "AI for your business.",
    subheading:
      "AI answers messages, gives you recommendations, and helps you understand your business.",
    usageNote:
      "AI Chat includes 200 answers per month, including up to 20 detailed analyses. AI Receptionist requires a connected professional Instagram account and an enabled integration.",
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
      name: "AI Receptionist",
      title: ["AI Receptionist"],
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
      note: "Included in OPUS",
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
      {
        title: "Lash studios",
        desc: "List extensions, infills, and lash lifts with their durations. Clients book an available time.",
      },
      {
        title: "Brow studios",
        desc: "Offer shaping, tinting, and lamination. See every appointment in your calendar.",
      },
      {
        title: "Facials & skincare",
        desc: "Add facial treatments with prices and durations. Clients book through your website.",
      },
      {
        title: "Waxing & sugaring",
        desc: "List waxing and sugaring services with durations and breaks between appointments.",
      },
      {
        title: "Laser hair removal",
        desc: "Set services by treatment area and duration. See every session in your calendar.",
      },
      {
        title: "Permanent makeup",
        desc: "List initial treatments and touch-ups. Clients choose a service and an available time.",
      },
      {
        title: "Tanning studios",
        desc: "Set session prices and durations. Clients book online, and you keep track of the schedule.",
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
    cta: "Try 2 months",
  },
  pricing: {
    heading: "One plan. Priced for your team.",
    comparePlans: "See everything included",
    subheading:
      "New studios get a 2-month trial without a card. Then from {proPrice} per month for one team member.",
    note: "After the trial, a paid subscription is required to keep accepting new appointments. No automatic charge.",
    trialLabel: "Your first 2 months at no charge",
    afterTrial: "Then",
    teamNote:
      "The owner and managers count; inactive members do not. The trial supports up to 12 members. This selector shows your price when subscribing.",
    largeTeamTitle: "A team of 13 or more?",
    largeTeamCta: "Contact us",
    pro: {
      name: "OPUS",
      currency: "MKD / month",
      desc: "Your website, online booking, and tools for the daily work in your salon.",
      teamSizeLabel: "Team size",
      teamSizeValue: "Up to {count} members",
      teamSizeSingle: "1 member",
      teamFeatureSingle: "1 active team member",
      teamFeature: "Up to {count} active team members",
      cta: "Try 2 months",
      label: "Included with your selected plan:",
      features: [
        "Booking website with your services, prices, colors, and photos",
        "Unlimited appointments, services, and clients",
        "Clients book without an account or app",
        "Team calendar, working hours, and overlap protection",
        "Gallery with up to 15 photos",
        "Client directory with visit history",
        "Appointment confirmations and reminders by email",
        "SMS confirmations and reminders after activation; limits apply",
        "Email offers for empty slots, approved by you",
        "Reports on your studio’s appointments",
        "Booking QR code, Instagram Story images, and saved replies",
        "Phone, tablet, and desktop access",
      ],
      aiAnalystTitle: "AI Chat",
      aiAnalystSub:
        "200 answers per month, including up to 20 detailed analyses. Answers use your studio’s data.",
      aiReceptionistTitle: "AI Receptionist",
      aiReceptionistSub:
        "Instagram replies and bookings after client confirmation, once the integration is connected and enabled.",
      end: "Trial for new studios, without a card. No charge unless you subscribe. Subscribing before the trial ends starts monthly billing immediately. AI and SMS depend on configuration; SMS is not unlimited.",
    },
  },
  faq: {
    heading: "Common questions.",
    subheading: "About the trial, pricing, and everyday booking.",
    items: [
      {
        question: "What is OPUS?",
        answer:
          "OPUS is an appointment booking system for salons and beauty studios. You get your own website where clients book and a calendar to manage your team’s appointments. Use it online, on your phone or computer.",
      },
      {
        question: "How does the trial work?",
        answer:
          "New studios can try OPUS for 2 months without a payment card. The trial supports up to 12 active team members. Choose your paid team size when subscribing. Afterward, a paid subscription is required to keep accepting new appointments. There is no automatic charge. Your existing appointments and data are kept. You can still manage appointments already booked.",
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
        question: "What will I pay after the trial?",
        answer:
          "Monthly pricing depends on your active team members: {proPrices}. The owner and managers count; inactive members do not. Every option includes the same features. Contact us for 13 or more members. AI and SMS require configuration; SMS is not unlimited.",
      },
      {
        question: "Does OPUS send offers for empty slots by itself?",
        answer:
          "No. OPUS suggests clients for an available appointment. You review and approve each offer before it is emailed. Only clients who agreed to receive offers can be contacted.",
      },
    ],
  },
  finalCta: {
    heading: "Let clients book through your link.",
    subheading:
      "Add your services and working hours, publish your website, and share your link. New studios get a 2-month trial.",
    cta: "Try 2 months",
    small: "2-month trial for new studios. No card needed.",
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
    createWebsite: "Try 2 months",
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
    proTitle: "Need help getting started?",
    proDescription:
      "Tell us about your studio, team size, or trial questions. For teams of 13 or more, we can discuss a suitable offer.",
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

export const sqMessages: Messages = {
  metadata: {
    home: {
      title: "OPUS — Rezervime online për sallone në Maqedoni",
      description:
        "Faqja juaj për rezervime, kalendari i ekipit dhe historia e klientëve. Provojeni OPUS 2 muaj pa kartelë, pastaj zgjidhni abonimin mujor sipas ekipit.",
    },
    contact: {
      title: "Kontaktoni OPUS — Pak ndihmë për studion tuaj.",
      description:
        "Keni një pyetje për OPUS? Na kontaktoni për ndihmë me uebfaqen tuaj të rezervimeve, ekipin tuaj ose fillimin e studios tuaj.",
      openGraphDescription:
        "Po filloni apo po përshtateni? Jemi këtu për studion tuaj.",
    },
  },
  accessibility: {
    languageToggle: "Zgjedhja e gjuhës",
    switchToEnglish: "Kalo në anglisht",
    switchToMacedonian: "Kalo në maqedonisht",
    switchToAlbanian: "Kalo në shqip",
    openMenu: "Hap menynë",
    closeMenu: "Mbyll menynë",
    skipToContent: "Kalo tek përmbajtja",
  },
  nav: {
    features: "Funksionet",
    ai: "Vegla AI",
    howItWorks: "Si funksionon",
    pricing: "Çmimet",
    contact: "Kontakt",
    newBadge: "E RE",
    login: "Hyrje",
    startFree: "Provojeni 2 muaj",
    language: "Gjuha",
  },
  hero: {
    previewLabel:
      "Pamje ilustruese e kalendarit dhe uebfaqes së rezervimeve të OPUS.",
    title: "Sistem rezervimesh për sallonin tuaj.",
    description:
      "OPUS ju jep një faqe interneti ku klientët zgjedhin shërbimin dhe një termin të lirë, ndërsa ju i menaxhoni të gjitha rezervimet në një kalendar.",
    createWebsite: "Provojeni 2 muaj",
    learnMore: "Si punon OPUS",
    badgeFree: "Provë 2-mujore për studiot e reja",
    badgeNoCard: "Pa kartelë krediti",
    badgeForStudio: "Për ju dhe ekipin tuaj",
    noteBookingTitle: "Termin i ri online",
    noteBookingDesc: "Eva rezervoi qethje për të premten.",
    noteBookingTime: "tani",
    calendarGreeting: "Mirëmëngjes, Ana",
    calendarDate: "Enj., 17 sht.",
    calendarTitle: "Kalendari i sotëm",
    calendarStaffAna: "Ana",
    calendarStaffMarija: "Marija",
    apt1Title: "Qethje dhe tharje",
    apt1Time: "09:00 – 10:00 · Elena P.",
    apt2Title: "Trajtim për flokë",
    apt2Time: "10:30 – 11:15 · Mila S.",
    apt3Title: "Manikyr me xhel",
    apt3Time: "09:30 – 10:30 · Sara K.",
    apt4Title: "Manikyr klasik",
    apt4Time: "11:00 – 11:45 · Eva M.",
    calendarFooterText: "Terminet e të gjithë ekipit.",
    calendarView: "Hapni kalendarin",
    phoneStudioName: "ATELIER",
    phoneStudioType: "STUDIO BUKURIE",
    phoneLocation: "SHKUP, MAQEDONI",
    phoneHeading: "Rezervoni termin.",
    phoneSubheading: "Zgjidhni shërbimin dhe terminin e lirë.",
    phoneTabServices: "Shërbimet",
    phoneTabTeam: "Ekipi ynë",
    phoneTabAbout: "Rreth nesh",
    phoneService1: "Qethje dhe tharje",
    phoneService1Sub: "60 min · nga 900 den.",
    phoneService2: "Nuancim dhe kujdes",
    phoneService2Sub: "90 min · nga 1.800 den.",
    phoneService3: "Tharje flokësh",
    phoneService3Sub: "30 min · nga 500 den.",
    phoneButton: "Rezervoni termin",
    phonePowered: "Mundësuar nga",
    noteAiTitle: "Rezervime përmes linkut tuaj",
    noteAiDesc: "Klientët zgjedhin terminin e lirë.",
    audiences: [
      "Sallone flokësh",
      "Berberë",
      "Studio thonjsh",
      "Grimierë",
      "Studio masazhi",
    ],
  },
  dashboardPreview: {
    heading: "Kështu i shihni terminet në OPUS.",
    description:
      "Hapni OPUS në telefon ose kompjuter. Shihni cili klient po vjen, për cilin shërbim dhe në cilën orë.",
    imageAlt:
      "Shembull i panelit kryesor të OPUS me terminet e sotme, zënien e kalendarit dhe vlerën e termineve të përfunduara.",
  },
  productTour: {
    heading: "Çfarë përfitoni me OPUS?",
    subheading:
      "Një faqe për klientët, një kalendar për ekipin dhe historia e vizitave në një vend.",
    includedInFree: "Përfshirë në OPUS",
    includedInPro: "Përfshirë në OPUS",
    cta: "Provojeni 2 muaj",
    tabs: {
      website: {
        label: "Uebfaqe për rezervime",
        title: "Klientët rezervojnë përmes linkut tuaj.",
        description:
          "Klienti hap linkun, zgjedh shërbimin, datën dhe terminin e lirë, dhe konfirmon rezervimin. Nuk i nevojitet llogari apo aplikacion.",
        serviceName: "Qethje dhe tharje",
        serviceDetail: "60 min · 900 den.",
      },
      calendar: {
        label: "Kalendari i termineve",
        title: "Ju i menaxhoni të gjitha terminet.",
        description:
          "Rezervimet online shfaqen në kalendar. Terminet e caktuara me telefon ose mesazh i vendosni vetë. Mund të zhvendosni ose anuloni terminin.",
        todayHeading: "Kalendari i sotëm",
        todayDay: "E enjte",
        staffAna: "Ana",
        staffMarija: "Marija",
        apt1: "Qethje dhe tharje",
        apt2: "Trajtim për flokë",
        apt3: "Manikyr me xhel",
      },
      clients: {
        label: "Historia e klientëve",
        title: "Kontrolloni vizitat e mëparshme.",
        description:
          "Gjeni klientin sipas emrit, email-it ose telefonit. Shihni shërbimet e mëparshme dhe terminet e ardhshme.",
        clientName: "Elena Petrova",
        clientRemembered: "Të dhënat e klientit",
        recentVisits: "Vizitat e fundit",
        visit1: "Qethje dhe tharje",
        date1: "14 shtator",
        visit2: "Nuancim dhe kujdes",
        date2: "18 gusht",
        visit3: "Qethje dhe tharje",
        date3: "21 korrik",
      },
    },
  },
  featuresBento: {
    heading: "Për punën e përditshme në sallon.",
    subheading:
      "Vendosni shërbimet dhe orarin e punës. Pranoni termine të reja dhe ndryshoni ato ekzistuese.",
    bookingTitle1: "Uebfaqe",
    bookingTitle2: "për rezervime.",
    bookingDesc1: "Shfaqni shërbimet dhe çmimet.",
    bookingDesc2: "Klientët zgjedhin nga terminet e lira.",
    calendarTitle1: "Termine",
    calendarTitle2: "për ekipin.",
    calendarDesc:
      "Çdo anëtar i ekipit ka orarin e vet. OPUS parandalon dy termine tek i njëjti punonjës në të njëjtën kohë.",
    clientsTitle1: "Klientët",
    clientsTitle2: "tuaj.",
    clientsDesc1: "Kontaktet në çdo termin.",
    clientsDesc2: "Historia e vizitave në një vend.",
    remindersTitle1: "Njoftime",
    remindersTitle2: "me email.",
    remindersDesc1: "Konfirmime për çdo termin.",
    remindersDesc2: "Rikujtues para terminit.",
    summaryUnlimited: "Termine të pakufizuara",
    summaryServices: "Shërbime dhe klientë të pakufizuar",
    summaryDevices: "Në telefon dhe kompjuter",
  },
  promotion: {
    heading: "Shpërndani linkun tuaj të rezervimit.",
    description:
      "Vendosni linkun në bio në Instagram, dërgojeni me mesazh ose vendosni një QR kod në sallon.",
    qr: {
      label: "QR kod për rezervim",
      title: "QR kod për sallonin tuaj.",
      description:
        "Shkarkoni QR kodin ose posterin e gatshëm A5 për printim. Klientët e skanojnë dhe hapin faqen tuaj për rezervim.",
      imageAlt:
        "Shembull i posterit A5 nga OPUS me QR kod për rezervim online.",
      caption: "Shembull posteri · Gati për printim",
    },
    story: {
      label: "Instagram Story",
      title: "Publikoni një termin të lirë në Instagram.",
      description:
        "Zgjidhni një termin të lirë. OPUS përgatit një imazh me shërbimin, çmimin dhe orën. Shkarkojeni dhe postojeni si Story me linkun tuaj.",
      imageAlt:
        "Shembull i një Instagram Story nga OPUS me shërbimin, datën, orën dhe çmimin e një termini të lirë.",
      caption: "Shembull Story · 1080 × 1920",
    },
    included: "Përfshirë në OPUS",
    customization:
      "Ngjyrat tuaja, emri i studios dhe linku. E disponueshme sapo të publikoni uebfaqen tuaj.",
    cta: "Provojeni 2 muaj",
  },
  intelligence: {
    heading: "AI për biznesin tuaj.",
    subheading:
      "AI u përgjigjet mesazheve, ju jep rekomandime dhe ju ndihmon ta kuptoni më mirë biznesin tuaj.",
    usageNote:
      "AI Chat përfshin 200 përgjigje në muaj, deri në 20 prej tyre analiza të hollësishme. AI Receptionist kërkon një llogari profesionale Instagram të lidhur dhe integrim të aktivizuar.",
    analyst: {
      name: "AI Chat",
      title: ["AI Chat"],
      description:
        "Pyesni inteligjencën artificiale për biznesin tuaj. Merrni rekomandime, analiza dhe ide përmirësimi bazuar në të dhënat e sallonit tuaj.",
      note: "200 përgjigje në muaj, deri në 20 prej tyre analiza të hollësishme.",
      artCopy: "Pyesni AI për biznesin tuaj.",
      yourAnalyst: "AI Chat",
      subtitle: "Përgjigje, rekomandime dhe njohuri për biznesin tuaj.",
      sampleHeading: "SHEMBULL BASHKËBISEDIMI",
      sampleNote:
        "Të dhëna ilustruese · Përgjigjet bazohen në të dhënat e studios tuaj.",
      limit1: "200 përgjigje / muaj",
      limit2: "Deri në 20 analiza të hollësishme",
      days: ["H", "M", "M", "E", "P", "S"],
      chip: "Rekomandime AI për biznesin tuaj",
      examples: [
        {
          label: "Ditët më të ngarkuara?",
          question: "Kur është më e ngarkuar studioja ime?",
          answer:
            "Në këtë javë shembull, dita më e ngarkuar është e premtja. Të martën keni më shumë termine të lira.",
        },
        {
          label: "Si t'i reduktoj anulimet?",
          question: "Çfarë mund të bëj për të pasur më pak anulime?",
          answer:
            "Në këtë shembull, më shumë anulime ka të martën. Provoni kujtesa para terminit dhe ndiqni nëse numri i anulimeve zvogëlohet.",
        },
        {
          label: "Si të plotësoj më shumë termine?",
          question: "Çfarë më rekomandoni për të plotësuar më shumë termine?",
          answer:
            "Në këtë shembull, më shumë termine të lira ka të hënën dhe të martën. Mund t'u ofroni termin klientëve që tashmë e kanë vizituar studion.",
        },
      ],
    },
    receptionist: {
      name: "AI Receptionist",
      title: ["AI Receptionist"],
      description:
        "AI u përgjigjet mesazheve në Instagram ndërsa ju u përkushtoheni klientëve. Përgjigjet për shërbimet, çmimet dhe terminet e lira, dhe rezervon pasi klienti të konfirmojë.",
      note: "Lidhni profilin tuaj profesional të Instagram-it nga cilësimet.",
      channels: ["Instagram"],
    },
    rebooking: {
      name: "Historia e klientëve",
      title: ["Shihni cilët klientë kur kanë qenë."],
      description:
        "Gjeni kontaktet, vizitat e kaluara dhe terminet e ardhshme të klientit në regjistrin e sallonit tuaj.",
      note: "Përfshirë në OPUS",
      chip: "Kontakte dhe vizita të mëparshme",
    },
    recovery: {
      name: "Oferta për termine të lira",
      title: ["Ofroni një termin të lirë."],
      description:
        "OPUS propozon se cilëve klientë t'u ofroni termin të lirë. Ju miratoni çdo ofertë me email. Klienti vendos nëse dëshiron të rezervojë.",
      note: "Vetëm për klientët që kanë lejuar oferta me email.",
      flow: ["Zgjidhni", "Shikoni", "Miratoni"],
    },
  },
  carousel: {
    heading: "Për sallone dhe studio bukurie.",
    subheading:
      "Për parukierë, berberë, thonj, qerpikë dhe vetulla, grim dhe masazh. Për punë të pavarur dhe për sallone me ekip më të madh.",
    footer: "Rezervime online dhe kalendar për ekipin tuaj.",
    slides: [
      {
        title: "Sallone flokësh",
        desc: "Klientët zgjedhin shërbimin, stilistin dhe terminin e lirë. Ju i shihni të gjitha rezervimet në kalendar.",
      },
      {
        title: "Berberë",
        desc: "Pranoni termine për qethje dhe mjekër përmes linkut tuaj. Ndiqni orarin e çdo berberi.",
      },
      {
        title: "Studio thonjsh",
        desc: "Vendosni çmimet dhe kohëzgjatjen për manikyr dhe pedikyr. Klientët zgjedhin vetë terminin e lirë.",
      },
      {
        title: "Grimierë",
        desc: "Vendosni shërbimet dhe terminet e lira për grim. Klientët rezervojnë përmes uebfaqes tuaj.",
      },
      {
        title: "Studio masazhi",
        desc: "Vendosni llojet e masazhit, kohëzgjatjen dhe pushimet. Ndiqni terminet e çdo masazheri.",
      },
      {
        title: "Studio qerpikësh",
        desc: "Listoni zgjatimet, mbushjet dhe ngritjen e qerpikëve. Klientët zgjedhin terminin.",
      },
      {
        title: "Studio vetullash",
        desc: "Ofroni formësim, ngjyrosje dhe laminim. Ndiqni çdo termin në kalendar.",
      },
      {
        title: "Kujdes për lëkurën",
        desc: "Listoni trajtimet me çmime dhe kohëzgjatje. Klientët rezervojnë në uebfaqen tuaj.",
      },
      {
        title: "Studio depilimi",
        desc: "Listoni depilimin me dyll ose pastë sheqeri, kohëzgjatjen dhe pushimet.",
      },
      {
        title: "Epilim me lazer",
        desc: "Caktoni zonën dhe kohëzgjatjen e trajtimeve. Ndiqni çdo seancë në kalendar.",
      },
      {
        title: "Grim permanent",
        desc: "Listoni trajtimet fillestare dhe korrigjimet. Klientët zgjedhin një termin të lirë.",
      },
      {
        title: "Solariume",
        desc: "Caktoni çmimet dhe kohëzgjatjen e seancave. Klientët rezervojnë online, ndërsa ju ndiqni orarin.",
      },
    ],
    prev: "Lloji i mëparshëm i studios",
    next: "Lloji i ardhshëm i studios",
    statusOf: "nga",
  },
  howItWorks: {
    heading: "Si të filloni?",
    subheading:
      "Shtoni shërbimet, publikoni uebfaqen dhe shpërndani linkun tuaj.",
    step1Title: "1. Shtoni shërbimet.",
    step1Desc:
      "Shënoni emrin dhe adresën e sallonit, një shërbim me çmim dhe kohëzgjatje dhe orarin tuaj të punës. Shërbimet e tjera dhe ekipin mund t'i shtoni më vonë.",
    step2Title: "2. Shpërndani linkun tuaj.",
    step2Desc:
      "OPUS krijon uebfaqen tuaj. Shikojeni paraprakisht, publikojeni dhe vendosni linkun në bio në Instagram ose dërgojuani klientëve.",
    step3Title: "3. Ndiqni terminet.",
    step3Desc:
      "Klientët rezervojnë përmes linkut. Ju i shihni terminet në kalendar dhe mund t'i zhvendosni ose anuloni ato.",
    cta: "Provojeni 2 muaj",
  },
  pricing: {
    heading: "Një plan. Çmim sipas ekipit.",
    comparePlans: "Shihni gjithçka që përfshihet",
    subheading:
      "Studiot e reja marrin provë 2-mujore pa kartelë. Pastaj nga {proPrice} në muaj për një anëtar ekipi.",
    note: "Pas provës, nevojitet abonim me pagesë për të vazhduar pranimin e termineve të reja. Nuk ka tarifim automatik.",
    trialLabel: "2 muajt e parë pa pagesë",
    afterTrial: "Pastaj",
    teamNote:
      "Pronari dhe menaxherët llogariten; anëtarët joaktivë jo. Prova mbështet deri në 12 anëtarë. Zgjedhësi tregon çmimin kur abonoheni.",
    largeTeamTitle: "Ekip me 13 ose më shumë?",
    largeTeamCta: "Na kontaktoni",
    pro: {
      name: "OPUS",
      currency: "den. / muaj",
      desc: "Faqja juaj, rezervimet online dhe veglat për punën e përditshme në sallon.",
      teamSizeLabel: "Madhësia e ekipit",
      teamSizeValue: "Deri në {count} anëtarë",
      teamSizeSingle: "1 anëtar",
      teamFeatureSingle: "1 anëtar aktiv i ekipit",
      teamFeature: "Deri në {count} anëtarë aktivë të ekipit",
      cta: "Provojeni 2 muaj",
      label: "Përfshirë në planin e zgjedhur:",
      features: [
        "Faqe rezervimesh me shërbimet, çmimet, ngjyrat dhe fotot tuaja",
        "Termine, shërbime dhe klientë të pakufizuar",
        "Klientët rezervojnë pa llogari ose aplikacion",
        "Kalendari i ekipit, oraret dhe mbrojtja nga mbivendosjet",
        "Galeri me deri në 15 foto",
        "Lista e klientëve me historinë e vizitave",
        "Konfirmime dhe rikujtues të termineve me email",
        "Konfirmime dhe rikujtues SMS pas aktivizimit; zbatohen kufij",
        "Oferta me email për termine të lira, me miratimin tuaj",
        "Raporte për terminet e studios",
        "Kod QR, imazhe për Instagram Story dhe përgjigje të ruajtura",
        "Qasje nga telefoni, tableti dhe kompjuteri",
      ],
      aiAnalystTitle: "AI Chat",
      aiAnalystSub:
        "200 përgjigje në muaj, deri në 20 analiza të hollësishme. Përgjigjet përdorin të dhënat e studios suaj.",
      aiReceptionistTitle: "AI Receptionist",
      aiReceptionistSub:
        "Përgjigje në Instagram dhe rezervime pas konfirmimit të klientit, kur integrimi është lidhur dhe aktivizuar.",
      end: "Provë për studiot e reja, pa kartelë. Nuk ka tarifim pa abonimin tuaj. Abonimi para përfundimit të provës fillon faturimin mujor menjëherë. AI dhe SMS varen nga konfigurimi; SMS nuk është i pakufizuar.",
    },
  },
  faq: {
    heading: "Pyetje të shpeshta.",
    subheading: "Rreth provës, çmimeve dhe rezervimeve të përditshme.",
    items: [
      {
        question: "Çfarë është OPUS?",
        answer:
          "OPUS është një sistem rezervimesh për sallone dhe studio bukurie. Përfitoni faqen tuaj të internetit ku klientët rezervojnë dhe një kalendar ku ndiqni terminet e ekipit tuaj. E përdorni përmes internetit, në telefon ose kompjuter.",
      },
      {
        question: "Si funksionon periudha e provës?",
        answer:
          "Studiot e reja mund ta provojnë OPUS 2 muaj pa kartelë pagese. Prova mbështet deri në 12 anëtarë aktivë. Zgjidhni madhësinë e ekipit për planin me pagesë kur abonoheni. Më pas nevojitet abonim me pagesë për të vazhduar pranimin e termineve të reja. Nuk ka tarifim automatik. Rezervimet dhe të dhënat ekzistuese ruhen. Mund të vazhdoni të menaxhoni terminet tashmë të rezervuara.",
      },
      {
        question: "Si rezervojnë klientët?",
        answer:
          "Shpërndani linkun tuaj në Instagram, në mesazh ose përmes QR kodit. Klienti zgjedh shërbimin dhe terminin e lirë, vendos të dhënat dhe konfirmon email-in. Termini i rezervuar shfaqet në kalendarin tuaj. Nuk i nevojitet llogari apo aplikacion.",
      },
      {
        question:
          "A mund të regjistroj një termin të caktuar me telefon ose mesazh?",
        answer:
          "Po. Hapni kalendarin dhe shënoni klientin, shërbimin dhe orën. Terminet e futura me dorë dhe ato të rezervuara online i shihni në të njëjtin kalendar.",
      },
      {
        question: "A më nevojitet uebfaqe e imja?",
        answer:
          "Jo. OPUS ju krijon një faqe interneti me shërbimet, çmimet dhe terminet e lira në një adresë si yourstudio.opus.mk. E publikoni dhe e shpërndani linkun me klientët.",
      },
      {
        question: "Për çfarë sallonesh është OPUS?",
        answer:
          "Për sallone flokësh, berberë, studio thonjsh, qerpikë dhe vetulla, grimierë dhe studio masazhi. Mund ta përdorni vetëm ose me një ekip.",
      },
      {
        question: "Sa do të paguaj pas provës?",
        answer:
          "Çmimi mujor varet nga anëtarët aktivë të ekipit: {proPrices}. Pronari dhe menaxherët llogariten; anëtarët joaktivë nuk llogariten. Çdo opsion përfshin të njëjtat funksione. Na kontaktoni për 13 ose më shumë anëtarë. AI dhe SMS kërkojnë konfigurim; SMS nuk është i pakufizuar.",
      },
      {
        question: "A dërgon OPUS vetë oferta për termine të lira?",
        answer:
          "Jo. OPUS sugjeron klientë për një termin të lirë. Ju shqyrtoni dhe miratoni çdo ofertë përpara se të dërgohet me email. Kontaktohen vetëm klientët që kanë pranuar oferta.",
      },
    ],
  },
  finalCta: {
    heading: "Pranoni termine përmes linkut tuaj.",
    subheading:
      "Shtoni shërbimet dhe orarin, publikoni faqen dhe shpërndani linkun. Studiot e reja marrin provë 2-mujore.",
    cta: "Provojeni 2 muaj",
    small: "Provë 2-mujore për studiot e reja. Pa kartelë.",
  },
  footer: {
    sloganLine1: "Rezervime online",
    sloganLine2: "për sallone dhe studio.",
    meetOpus: "Rreth OPUS",
    features: "Funksionet",
    intelligence: "Vegla AI",
    pricing: "Çmimet",
    nextChapter: "Filloni me OPUS",
    howItWorks: "Si funksionon",
    faq: "Pyetje të shpeshta",
    createWebsite: "Provojeni 2 muaj",
    madeForYou: "Për sallone dhe studio.",
    madeForYouSub1: "Sistem rezervimesh për sallone",
    madeForYouSub2: " dhe studio bukurie.",
    copyright: "© 2026 OPUS.",
    tagline: "Faqe interneti për klientët. Kalendar për sallonin tuaj.",
    contact: "Kontakt",
    privacy: "Privatësia",
    terms: "Kushtet",
    cookieSettings: "Cilësimet e biskotave",
    backToTop: "Kthehu në krye",
  },
  contactPage: {
    heroTitle1: "Pak ndihmë.",
    heroTitle2: "Një bisedë e vërtetë.",
    heroSubLine1:
      "Po filloni, po zhvilloheni apo po planifikoni hapin e radhës?",
    heroSubLine2: "Jemi këtu për studion tuaj.",
    proTitle: "Ju duhet ndihmë për të filluar?",
    proDescription:
      "Na tregoni për studion, madhësinë e ekipit ose pyetjet për provën. Për ekipe me 13 ose më shumë anëtarë, mund të diskutojmë një ofertë të përshtatshme.",
    detailsTitle: "Le të bisedojmë.",
    emailLabel: "Preferoni email?",
    phoneLabel: "Na telefononi",
    locationLabel: "Pak më pranë",
    locationValue: "Shkup, Maqedoni e Veriut",
    faqLink: "Lexoni pyetjet e shpeshta",
    formTitle: "Na tregoni se çfarë keni në mendje.",
    formDescLine1: "Një pyetje, mendim apo ndihmë për të filluar.",
    formDescLine2: "Lini një mesazh dhe do t'ju përgjigjemi me email.",
    fieldName: "Emri juaj",
    fieldEmail: "Adresa e email-it",
    fieldBusiness: "Emri i studios",
    fieldMessage: "Si mund t'ju ndihmojmë?",
    placeholderName: "Ana Petrova",
    placeholderEmail: "ana@studiojatuaj.mk",
    placeholderBusiness: "Studioja juaj e bukurisë",
    placeholderMessage: "Na tregoni pak për planet tuaja…",
    optional: "Fakultative",
    submit: "Dërgo mesazhin",
    submitting: "Duke dërguar mesazhin…",
    successTitle: "Mesazhi u pranua.",
    successDesc:
      "Ju falënderojmë që na kontaktuat. Do t'ju përgjigjemi në adresën e shënuar të email-it.",
    sendAnother: "Dërgo një mesazh tjetër",
    errorTitle: "Mesazhi nuk mund të dërgohej.",
    errorGeneric:
      "Ju lutemi provoni përsëri ose shkruani në hello@opus.mk. Mesazhi juaj është ruajtur.",
    errorRateLimit:
      "Ju lutemi prisni pak para se të provoni përsëri, ose na shkruani drejtpërdrejt. Mesazhi juaj është ruajtur.",
    errorConnection:
      "Kontrolloni lidhjen tuaj me internet dhe provoni përsëri, ose shkruani në hello@opus.mk. Mesazhi juaj është ruajtur.",
    privacyNote:
      "Të dhënat tuaja do t'i përdorim vetëm për t'iu përgjigjur mesazhit.",
    readOur: "Lexoni ",
    privacyLink: "politikën tonë të privatësisë",
  },
};

const messagesByLocale: Record<Locale, Messages> = {
  mk: mkMessages,
  en: enMessages,
  sq: sqMessages,
};

export function getMessages(locale: Locale): Messages {
  return messagesByLocale[locale] ?? messagesByLocale.mk;
}
