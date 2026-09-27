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
};
