import type { Locale } from "./locale";

type ComparisonRow = {
  feature: string;
  description?: string;
  free: boolean | string;
  pro: boolean | string;
};

type PricingPageMessages = {
  metadata: { title: string; description: string };
  heading: string;
  description: string;
  compare: string;
  comparisonHeading: string;
  comparisonDescription: string;
  feature: string;
  free: string;
  included: string;
  notIncluded: string;
  groups: { title: string; rows: ComparisonRow[] }[];
  activationTitle: string;
  activationNote: string;
  customTitle: string;
  customDescription: string;
  customCta: string;
};

export const pricingPageMessages: Record<Locale, PricingPageMessages> = {
  mk: {
    metadata: {
      title: "Цени и планови — OPUS",
      description:
        "Споредете ги бесплатниот план, Pro за 1.190 ден. месечно и софтверот по мерка. Погледнете што е вклучено за закажување, промоција и управување со студиото.",
    },
    heading: "Изберете што му треба на вашето студио.",
    description:
      "Започнете со бесплатен веб-сајт и календар. Додајте Pro кога ќе ви требаат поголем тим, историја на клиенти и повеќе алатки.",
    compare: "Споредете ги сите функции",
    comparisonHeading: "Што е вклучено во секој план?",
    comparisonDescription:
      "Споредете ги бесплатниот план и Pro, функција по функција.",
    feature: "Функција",
    free: "Бесплатен",
    included: "Вклучено",
    notIncluded: "Не е вклучено",
    groups: [
      {
        title: "Веб-сајт и закажување",
        rows: [
          {
            feature: "Ваш веб-сајт на yourstudio.opus.mk",
            free: true,
            pro: true,
          },
          {
            feature: "Термини, услуги и клиенти",
            free: "Неограничени",
            pro: "Неограничени",
          },
          {
            feature: "Закажување без профил или апликација",
            free: true,
            pro: true,
          },
          {
            feature: "Тимски календар без преклопување",
            free: true,
            pro: true,
          },
          {
            feature: "Работно време, паузи и слободни денови",
            free: true,
            pro: true,
          },
          {
            feature: "Тим",
            free: "4",
            pro: "До 12",
          },
          {
            feature: "Галерија на веб-сајтот",
            free: "До 3 фотографии",
            pro: "До 15 фотографии",
          },
          {
            feature: "Пристап од телефон, таблет и компјутер",
            free: true,
            pro: true,
          },
        ],
      },
      {
        title: "Промоција на студиото",
        rows: [
          {
            feature: "QR-код за закажување и A5 постер",
            free: true,
            pro: true,
          },
          {
            feature: "Instagram Story за онлајн закажување",
            free: true,
            pro: true,
          },
          {
            feature: "Instagram Story за слободен термин",
            free: true,
            pro: true,
          },
          {
            feature: "Избор на бои за промотивните слики",
            free: true,
            pro: true,
          },
          { feature: "Зачувани одговори за клиенти", free: true, pro: true },
        ],
      },
      {
        title: "Клиенти и известувања",
        rows: [
          {
            feature: "Контакт на клиентот во секој термин",
            free: true,
            pro: true,
          },
          {
            feature: "Именик со историја и статистика на посети",
            free: false,
            pro: true,
          },
          {
            feature: "Потврди и промени на термин по е-пошта",
            free: true,
            pro: true,
          },
          {
            feature: "Потсетници за клиенти по е-пошта",
            free: false,
            pro: "1, 2, 3 или 24 ч. пред терминот",
          },
          {
            feature: "SMS потврди и потсетници",
            free: false,
            pro: "Да*",
          },
        ],
      },
      {
        title: "AI алатки и анализи",
        rows: [
          {
            feature: "AI Chat",
            description:
              "Прашајте го AI за вашиот бизнис. Добијте препораки, анализи и идеи за подобрување.",
            free: false,
            pro: "200 одговори месечно*",
          },
          {
            feature: "Детални AI-анализи",
            description: "Се вбројуваат во месечните 200 одговори.",
            free: false,
            pro: "До 20 месечно*",
          },
          {
            feature: "Понуди по е-пошта за слободни термини",
            description:
              "Ја одобрувате секоја понуда. Само за клиенти со согласност.",
            free: false,
            pro: true,
          },
          {
            feature: "AI Frontdesk",
            description:
              "AI одговара на Instagram пораките додека вие се посветувате на клиентите.",
            free: false,
            pro: true,
          },
        ],
      },
      {
        title: "Поддршка",
        rows: [{ feature: "Приоритетна поддршка", free: false, pro: true }],
      },
    ],
    activationTitle: "За SMS и AI алатките",
    activationNote:
      "* AI и SMS ги поставувате сами од вашата сметка. За AI Frontdesk, поврзете го вашиот професионален Instagram профил во поставките. Планот не вклучува неограничени SMS пораки.",
    customTitle: "Ви треба нешто по мерка?",
    customDescription:
      "Софтверот по мерка има посебна понуда. Заедно ги договараме функциите, интеграциите, рокот и месечниот план за вашиот проект.",
    customCta: "Разговарајте со нас",
  },
  en: {
    metadata: {
      title: "Pricing and plans — OPUS",
      description:
        "Compare Free, Pro at 1,190 MKD per month, and custom software. See what is included for booking, promotion, and managing your studio.",
    },
    heading: "Choose what works for your studio.",
    description:
      "Start with a free booking website and calendar. Add Pro when you need a larger team, client history, and more tools.",
    compare: "Compare all features",
    comparisonHeading: "What’s included in each plan?",
    comparisonDescription: "Compare Free and Pro, feature by feature.",
    feature: "Feature",
    free: "Free",
    included: "Included",
    notIncluded: "Not included",
    groups: [
      {
        title: "Website & booking",
        rows: [
          {
            feature: "Your own yourstudio.opus.mk website",
            free: true,
            pro: true,
          },
          {
            feature: "Appointments, services, and clients",
            free: "Unlimited",
            pro: "Unlimited",
          },
          {
            feature: "Client booking without an account or app",
            free: true,
            pro: true,
          },
          {
            feature: "Team calendar with overlap protection",
            free: true,
            pro: true,
          },
          {
            feature: "Working hours, breaks, and days off",
            free: true,
            pro: true,
          },
          {
            feature: "Team members",
            free: "4",
            pro: "Up to 12",
          },
          {
            feature: "Website gallery",
            free: "Up to 3 photos",
            pro: "Up to 15 photos",
          },
          {
            feature: "Phone, tablet, and desktop access",
            free: true,
            pro: true,
          },
        ],
      },
      {
        title: "Studio promotion",
        rows: [
          {
            feature: "Booking QR code and A5 counter sign",
            free: true,
            pro: true,
          },
          {
            feature: "Instagram Story for online booking",
            free: true,
            pro: true,
          },
          {
            feature: "Instagram Story for an available appointment",
            free: true,
            pro: true,
          },
          {
            feature: "Custom colors for promotion artwork",
            free: true,
            pro: true,
          },
          { feature: "Saved replies for clients", free: true, pro: true },
        ],
      },
      {
        title: "Clients & notifications",
        rows: [
          {
            feature: "Client contact details on every appointment",
            free: true,
            pro: true,
          },
          {
            feature: "Client directory with visit history and statistics",
            free: false,
            pro: true,
          },
          {
            feature: "Appointment confirmations and changes by email",
            free: true,
            pro: true,
          },
          {
            feature: "Client email reminders",
            free: false,
            pro: "1, 2, 3, or 24 hours before",
          },
          {
            feature: "SMS confirmations and reminders",
            free: false,
            pro: "Yes*",
          },
        ],
      },
      {
        title: "AI tools & Insights",
        rows: [
          {
            feature: "AI Chat",
            description:
              "Ask AI about your business. Get recommendations, insights, and ideas for improvement.",
            free: false,
            pro: "200 answers / month*",
          },
          {
            feature: "Detailed AI reports",
            description: "Count toward the 200 monthly answers.",
            free: false,
            pro: "Up to 20 / month*",
          },
          {
            feature: "Email offers for empty slots",
            description:
              "You approve every offer. Only for clients who have opted in.",
            free: false,
            pro: true,
          },
          {
            feature: "AI Frontdesk",
            description:
              "AI answers your Instagram DMs while you focus on clients.",
            free: false,
            pro: true,
          },
        ],
      },
      {
        title: "Support",
        rows: [{ feature: "Priority support", free: false, pro: true }],
      },
    ],
    activationTitle: "About SMS and AI tools",
    activationNote:
      "* Set up AI and SMS yourself from your account. For AI Frontdesk, connect your professional Instagram account in settings. The plan does not include unlimited SMS messages.",
    customTitle: "Need something built for you?",
    customDescription:
      "Custom software is quoted separately. We agree on the features, integrations, timeline, and monthly plan for your project together.",
    customCta: "Talk to us",
  },
  sq: {
    metadata: {
      title: "Çmimet dhe planet — OPUS",
      description:
        "Krahasoni planin falas, Pro për 1.190 den. në muaj dhe softuerin sipas porosisë. Shihni çfarë përfshihet për rezervime, promovim dhe menaxhim të studios.",
    },
    heading: "Zgjidhni atë që i nevojitet studios tuaj.",
    description:
      "Filloni me një faqe interneti dhe kalendar falas. Shtoni Pro kur t'ju nevojitet ekip më i madh, historia e klientëve dhe më shumë vegla.",
    compare: "Krahasoni të gjitha funksionet",
    comparisonHeading: "Çfarë përfshihet në secilin plan?",
    comparisonDescription:
      "Krahasoni planin falas dhe Pro, funksion për funksion.",
    feature: "Funksioni",
    free: "Falas",
    included: "E përfshirë",
    notIncluded: "Nuk përfshihet",
    groups: [
      {
        title: "Uebfaqe dhe rezervime",
        rows: [
          {
            feature: "Faqja juaj në yourstudio.opus.mk",
            free: true,
            pro: true,
          },
          {
            feature: "Termine, shërbime dhe klientë",
            free: "Të pakufizuara",
            pro: "Të pakufizuara",
          },
          {
            feature: "Rezervim nga klienti pa llogari apo aplikacion",
            free: true,
            pro: true,
          },
          {
            feature: "Kalendar ekipi pa mbivendosje",
            free: true,
            pro: true,
          },
          {
            feature: "Orari i punës, pushimet dhe ditët e lira",
            free: true,
            pro: true,
          },
          {
            feature: "Anëtarët e ekipit",
            free: "4",
            pro: "Deri në 12",
          },
          {
            feature: "Galeria në uebfaqe",
            free: "Deri në 3 foto",
            pro: "Deri në 15 foto",
          },
          {
            feature: "Qasje nga telefoni, tableti dhe kompjuteri",
            free: true,
            pro: true,
          },
        ],
      },
      {
        title: "Promovimi i studios",
        rows: [
          {
            feature: "QR kod për rezervim dhe poster A5 për tavolinë",
            free: true,
            pro: true,
          },
          {
            feature: "Instagram Story për rezervime online",
            free: true,
            pro: true,
          },
          {
            feature: "Instagram Story për termin të lirë",
            free: true,
            pro: true,
          },
          {
            feature: "Zgjedhje ngjyrash për imazhet promovuese",
            free: true,
            pro: true,
          },
          { feature: "Përgjigje të ruajtura për klientët", free: true, pro: true },
        ],
      },
      {
        title: "Klientët dhe njoftimet",
        rows: [
          {
            feature: "Kontaktet e klientit në çdo termin",
            free: true,
            pro: true,
          },
          {
            feature: "Regjistër klientësh me histori dhe statistika vizitash",
            free: false,
            pro: true,
          },
          {
            feature: "Konfirmime dhe ndryshime të terminit me email",
            free: true,
            pro: true,
          },
          {
            feature: "Kujtesa me email për klientët",
            free: false,
            pro: "1, 2, 3 ose 24 orë para",
          },
          {
            feature: "Konfirmime dhe kujtesa me SMS",
            free: false,
            pro: "Po*",
          },
        ],
      },
      {
        title: "Vegla AI dhe analiza",
        rows: [
          {
            feature: "AI Chat",
            description:
              "Pyesni AI për biznesin tuaj. Merrni rekomandime, analiza dhe ide përmirësimi.",
            free: false,
            pro: "200 përgjigje në muaj*",
          },
          {
            feature: "Raporte të hollësishme me AI",
            description: "Numërohen brenda 200 përgjigjeve mujore.",
            free: false,
            pro: "Deri në 20 në muaj*",
          },
          {
            feature: "Oferta me email për termine të lira",
            description:
              "Ju miratoni çdo ofertë. Vetëm për klientët me pëlqim.",
            free: false,
            pro: true,
          },
          {
            feature: "AI Frontdesk",
            description:
              "AI u përgjigjet mesazheve në Instagram ndërsa ju u përkushtoheni klientëve.",
            free: false,
            pro: true,
          },
        ],
      },
      {
        title: "Mbështetje",
        rows: [{ feature: "Mbështetje prioritare", free: false, pro: true }],
      },
    ],
    activationTitle: "Rreth veglave SMS dhe AI",
    activationNote:
      "* AI dhe SMS i konfiguroni vetë nga llogaria juaj. Për AI Frontdesk, lidhni profilin tuaj profesional të Instagram-it në cilësime. Plani nuk përfshin SMS të pakufizuara.",
    customTitle: "Ju nevojitet diçka e përshtatur posaçërisht?",
    customDescription:
      "Softueri sipas porosisë ka ofertë të veçantë. Bashkërisht dakordohemi për funksionet, integrimet, afatin dhe planin mujor për projektin tuaj.",
    customCta: "Bisedoni me ne",
  },
};
