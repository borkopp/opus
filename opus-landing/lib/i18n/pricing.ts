import type { Locale } from "./locale";

type ComparisonRow = {
  feature: string;
  description?: string;
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
        "OPUS од {proPrice} месечно. Пробајте 2 месеци без картичка. Една понуда со тим до 1, 3, 4, 6, 8 или 12 членови.",
    },
    heading: "Еден план, според вашиот тим.",
    description:
      "Новите студија добиваат 2 месеци пробно без картичка. Потоа изберете месечна претплата за да продолжите да примате нови термини.",
    compare: "Погледнете што е вклучено",
    comparisonHeading: "Што добивате со OPUS?",
    comparisonDescription:
      "Истите функции за секоја големина на тим. Цената зависи од бројот на активни членови.",
    feature: "Функција",
    included: "Вклучено",
    notIncluded: "Не е вклучено",
    groups: [
      {
        title: "Веб-сајт и закажување",
        rows: [
          {
            feature: "Ваш веб-сајт на yourstudio.opus.mk",
            pro: true,
          },
          {
            feature: "Термини, услуги и клиенти",
            pro: "Неограничени",
          },
          {
            feature: "Закажување без профил или апликација",
            pro: true,
          },
          {
            feature: "Тимски календар без преклопување",
            pro: true,
          },
          {
            feature: "Работно време, паузи и слободни денови",
            pro: true,
          },
          {
            feature: "Тим",
            pro: "До 1, 3, 4, 6, 8 или 12 активни членови",
            description:
              "Сопственикот и менаџерите се бројат; неактивните членови не се бројат.",
          },
          {
            feature: "Галерија на веб-сајтот",
            pro: "До 15 фотографии",
          },
          {
            feature: "Пристап од телефон, таблет и компјутер",
            pro: true,
          },
        ],
      },
      {
        title: "Промоција на студиото",
        rows: [
          {
            feature: "QR-код за закажување и A5 постер",
            pro: true,
          },
          {
            feature: "Instagram Story за онлајн закажување",
            pro: true,
          },
          {
            feature: "Instagram Story за слободен термин",
            pro: true,
          },
          {
            feature: "Избор на бои за промотивните слики",
            pro: true,
          },
          {
            feature: "Зачувани одговори за клиенти",
            pro: true,
          },
        ],
      },
      {
        title: "Клиенти и известувања",
        rows: [
          {
            feature: "Контакт на клиентот во секој термин",
            pro: true,
          },
          {
            feature: "Именик со историја и статистика на посети",
            pro: true,
          },
          {
            feature: "Потврди и промени на термин по е-пошта",
            pro: true,
          },
          {
            feature: "Потсетници за клиенти по е-пошта",
            pro: "1, 2, 3 или 24 ч. пред терминот",
          },
          {
            feature: "SMS потврди и потсетници",
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
            pro: "200 одговори месечно*",
          },
          {
            feature: "Детални AI-анализи",
            description: "Се вбројуваат во месечните 200 одговори.",
            pro: "До 20 месечно*",
          },
          {
            feature: "Понуди по е-пошта за слободни термини",
            description:
              "Ја одобрувате секоја понуда. Само за клиенти со согласност.",
            pro: true,
          },
          {
            feature: "AI Receptionist",
            description:
              "AI одговара на Instagram пораките додека вие се посветувате на клиентите.",
            pro: true,
          },
        ],
      },
      {
        title: "Поддршка",
        rows: [
          {
            feature: "Приоритетна поддршка",
            pro: true,
          },
        ],
      },
    ],
    activationTitle: "За пробниот период, AI и SMS",
    activationNote:
      "Пробниот период трае 2 месеци и е за нови студија. Нема автоматска наплата. За да продолжите да примате нови термини потоа, потребна е платена претплата. AI и SMS бараат конфигурација и активирање. AI Receptionist бара професионален Instagram профил. SMS пораките не се неограничени.",
    customTitle: "Имате 13 или повеќе членови?",
    customDescription:
      "Пишете ни за големината и потребите на вашиот тим за да разговараме за соодветна понуда.",
    customCta: "Контактирајте нè",
  },
  en: {
    metadata: {
      title: "Pricing and plans — OPUS",
      description:
        "OPUS from {proPrice}/month. Try 2 months without a card. One plan for teams of up to 1, 3, 4, 6, 8, or 12.",
    },
    heading: "One plan, sized for your team.",
    description:
      "New studios get a 2-month trial without a card. Then choose a monthly subscription to keep accepting new appointments.",
    compare: "See everything included",
    comparisonHeading: "What do you get with OPUS?",
    comparisonDescription:
      "The same features with every team size. Your price depends on the number of active team members.",
    feature: "Feature",
    included: "Included",
    notIncluded: "Not included",
    groups: [
      {
        title: "Website & booking",
        rows: [
          {
            feature: "Your own yourstudio.opus.mk website",
            pro: true,
          },
          {
            feature: "Appointments, services, and clients",
            pro: "Unlimited",
          },
          {
            feature: "Client booking without an account or app",
            pro: true,
          },
          {
            feature: "Team calendar with overlap protection",
            pro: true,
          },
          {
            feature: "Working hours, breaks, and days off",
            pro: true,
          },
          {
            feature: "Team members",
            pro: "Up to 1, 3, 4, 6, 8, or 12 active members",
            description:
              "The owner and managers count; inactive members do not.",
          },
          {
            feature: "Website gallery",
            pro: "Up to 15 photos",
          },
          {
            feature: "Phone, tablet, and desktop access",
            pro: true,
          },
        ],
      },
      {
        title: "Studio promotion",
        rows: [
          {
            feature: "Booking QR code and A5 counter sign",
            pro: true,
          },
          {
            feature: "Instagram Story for online booking",
            pro: true,
          },
          {
            feature: "Instagram Story for an available appointment",
            pro: true,
          },
          {
            feature: "Custom colors for promotion artwork",
            pro: true,
          },
          {
            feature: "Saved replies for clients",
            pro: true,
          },
        ],
      },
      {
        title: "Clients & notifications",
        rows: [
          {
            feature: "Client contact details on every appointment",
            pro: true,
          },
          {
            feature: "Client directory with visit history and statistics",
            pro: true,
          },
          {
            feature: "Appointment confirmations and changes by email",
            pro: true,
          },
          {
            feature: "Client email reminders",
            pro: "1, 2, 3, or 24 hours before",
          },
          {
            feature: "SMS confirmations and reminders",
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
            pro: "200 answers / month*",
          },
          {
            feature: "Detailed AI reports",
            description: "Count toward the 200 monthly answers.",
            pro: "Up to 20 / month*",
          },
          {
            feature: "Email offers for empty slots",
            description:
              "You approve every offer. Only for clients who have opted in.",
            pro: true,
          },
          {
            feature: "AI Receptionist",
            description:
              "AI answers your Instagram DMs while you focus on clients.",
            pro: true,
          },
        ],
      },
      {
        title: "Support",
        rows: [
          {
            feature: "Priority support",
            pro: true,
          },
        ],
      },
    ],
    activationTitle: "About the trial, AI, and SMS",
    activationNote:
      "The 2-month trial is for new studios. There is no automatic charge. A paid subscription is required afterward to keep accepting new appointments. AI and SMS require configuration and activation. AI Receptionist requires a professional Instagram account. SMS messages are not unlimited.",
    customTitle: "Have 13 or more team members?",
    customDescription:
      "Tell us about your team size and needs so we can discuss a suitable offer.",
    customCta: "Contact us",
  },
  sq: {
    metadata: {
      title: "Çmimet dhe planet — OPUS",
      description:
        "OPUS nga {proPrice}/muaj. Provojeni 2 muaj pa kartelë. Një plan për ekipe me deri në 1, 3, 4, 6, 8 ose 12 anëtarë.",
    },
    heading: "Një plan sipas ekipit tuaj.",
    description:
      "Studiot e reja marrin provë 2-mujore pa kartelë. Më pas zgjidhni abonim mujor për të vazhduar pranimin e termineve të reja.",
    compare: "Shihni gjithçka që përfshihet",
    comparisonHeading: "Çfarë merrni me OPUS?",
    comparisonDescription:
      "Të njëjtat funksione për çdo madhësi ekipi. Çmimi varet nga numri i anëtarëve aktivë.",
    feature: "Funksioni",
    included: "E përfshirë",
    notIncluded: "Nuk përfshihet",
    groups: [
      {
        title: "Uebfaqe dhe rezervime",
        rows: [
          {
            feature: "Faqja juaj në yourstudio.opus.mk",
            pro: true,
          },
          {
            feature: "Termine, shërbime dhe klientë",
            pro: "Të pakufizuara",
          },
          {
            feature: "Rezervim nga klienti pa llogari apo aplikacion",
            pro: true,
          },
          {
            feature: "Kalendar ekipi pa mbivendosje",
            pro: true,
          },
          {
            feature: "Orari i punës, pushimet dhe ditët e lira",
            pro: true,
          },
          {
            feature: "Anëtarët e ekipit",
            pro: "Deri në 1, 3, 4, 6, 8 ose 12 anëtarë aktivë",
            description:
              "Pronari dhe menaxherët llogariten; anëtarët joaktivë nuk llogariten.",
          },
          {
            feature: "Galeria në uebfaqe",
            pro: "Deri në 15 foto",
          },
          {
            feature: "Qasje nga telefoni, tableti dhe kompjuteri",
            pro: true,
          },
        ],
      },
      {
        title: "Promovimi i studios",
        rows: [
          {
            feature: "QR kod për rezervim dhe poster A5 për tavolinë",
            pro: true,
          },
          {
            feature: "Instagram Story për rezervime online",
            pro: true,
          },
          {
            feature: "Instagram Story për termin të lirë",
            pro: true,
          },
          {
            feature: "Zgjedhje ngjyrash për imazhet promovuese",
            pro: true,
          },
          {
            feature: "Përgjigje të ruajtura për klientët",
            pro: true,
          },
        ],
      },
      {
        title: "Klientët dhe njoftimet",
        rows: [
          {
            feature: "Kontaktet e klientit në çdo termin",
            pro: true,
          },
          {
            feature: "Regjistër klientësh me histori dhe statistika vizitash",
            pro: true,
          },
          {
            feature: "Konfirmime dhe ndryshime të terminit me email",
            pro: true,
          },
          {
            feature: "Kujtesa me email për klientët",
            pro: "1, 2, 3 ose 24 orë para",
          },
          {
            feature: "Konfirmime dhe kujtesa me SMS",
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
            pro: "200 përgjigje në muaj*",
          },
          {
            feature: "Raporte të hollësishme me AI",
            description: "Numërohen brenda 200 përgjigjeve mujore.",
            pro: "Deri në 20 në muaj*",
          },
          {
            feature: "Oferta me email për termine të lira",
            description:
              "Ju miratoni çdo ofertë. Vetëm për klientët me pëlqim.",
            pro: true,
          },
          {
            feature: "AI Receptionist",
            description:
              "AI u përgjigjet mesazheve në Instagram ndërsa ju u përkushtoheni klientëve.",
            pro: true,
          },
        ],
      },
      {
        title: "Mbështetje",
        rows: [
          {
            feature: "Mbështetje prioritare",
            pro: true,
          },
        ],
      },
    ],
    activationTitle: "Rreth provës, AI dhe SMS",
    activationNote:
      "Prova 2-mujore është për studiot e reja. Nuk ka tarifim automatik. Më pas nevojitet abonim me pagesë për të vazhduar pranimin e termineve të reja. AI dhe SMS kërkojnë konfigurim dhe aktivizim. AI Receptionist kërkon llogari profesionale Instagram. Mesazhet SMS nuk janë të pakufizuara.",
    customTitle: "Keni 13 ose më shumë anëtarë?",
    customDescription:
      "Na tregoni për madhësinë dhe nevojat e ekipit, që të diskutojmë një ofertë të përshtatshme.",
    customCta: "Na kontaktoni",
  },
};
