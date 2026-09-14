import type { Locale } from "@/lib/i18n/locale";
import { siteLinks } from "@/lib/site-links";

export type HeroSlideId = "studio" | "team" | "clients" | "website";

type HeroSlide = {
  id: HeroSlideId;
  image: string;
  label: string;
  title: [string, string];
  description: string;
  alt: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
};

export const heroSlides: Record<Locale, HeroSlide[]> = {
  mk: [
    {
      id: "website",
      image: "/images/hero/website-iphone.png",
      label: "Ваш веб-сајт",
      title: ["Клиентите закажуваат.", "Вие им се посветувате."],
      description:
        "Добијте сопствен веб-сајт за закажување. Споделете го линкот на Instagram, а клиентите избираат услуга и термин — без профил.",
      alt: "Клиентка избира термин преку веб-сајтот на студиото на iPhone",
      primary: {
        label: "Започнете бесплатно",
        href: siteLinks.signup,
      },
      secondary: { label: "Погледнете како работи", href: siteLinks.demo },
    },
    {
      id: "studio",
      image: "/images/hero/studio-timeline-new.png",
      label: "Студио",
      title: ["Помалку организација.", "Повеќе време за работа."],
      description:
        "Термини, услуги и клиенти во еден прегледен календар. Знајте што следува, без пребарување низ пораки.",
      alt: "Прегледен дневен распоред на термини на монитор во студио со топла попладневна светлина",
      primary: { label: "Започнете бесплатно", href: siteLinks.signup },
      secondary: { label: "Видете ги функциите", href: "/#product" },
    },
    {
      id: "team",
      image: "/images/hero/team.png",
      label: "Тим",
      title: ["Целиот тим.", "Еден јасен распоред."],
      description:
        "Услуги и работно време за секој член. Секој го знае својот распоред, а вие ја гледате целата слика.",
      alt: "Двајца професионалци за убавина го планираат денот заедно на лаптоп",
      primary: {
        label: "Започнете бесплатно",
        href: siteLinks.signup,
      },
      secondary: { label: "Видете ги цените", href: "/pricing" },
    },
    {
      id: "clients",
      image: "/images/hero/clients.png",
      label: "Клиенти",
      title: ["Секој клиент.", "Со внимание на деталите."],
      description:
        "Контакти и претходни посети на едно место. Подгответе се за следниот термин со клиентот што веќе го познавате.",
      alt: "Сопственичка на студио пречекува клиентка на рецепција со топла светлина",
      primary: {
        label: "Започнете бесплатно",
        href: siteLinks.signup,
      },
      secondary: { label: "Погледнете како работи", href: siteLinks.demo },
    },
  ],
  en: [
    {
      id: "website",
      image: "/images/hero/website-iphone.png",
      label: "Your own website",
      title: ["Your clients book.", "You do what you love."],
      description:
        "Get your own booking website. Share the link on Instagram and let clients choose a service and time — no account needed.",
      alt: "A client choosing an appointment on an iPhone through a studio's own booking website",
      primary: { label: "Start for free", href: siteLinks.signup },
      secondary: { label: "See how it works", href: siteLinks.demo },
    },
    {
      id: "studio",
      image: "/images/hero/studio-timeline-new.png",
      label: "Studio",
      title: ["Less organising.", "More time for your craft."],
      description:
        "Appointments, services, and clients in one clear calendar. Know what’s next without searching through messages.",
      alt: "A clean appointment timeline on a beauty studio reception monitor in warm afternoon light",
      primary: { label: "Start for free", href: siteLinks.signup },
      secondary: { label: "View features", href: "/#product" },
    },
    {
      id: "team",
      image: "/images/hero/team.png",
      label: "Team",
      title: ["Your whole team.", "One clear schedule."],
      description:
        "Services and working hours for every team member. Everyone knows their day. You see the whole picture.",
      alt: "Two beauty professionals planning their working day together on a laptop",
      primary: {
        label: "Start for free",
        href: siteLinks.signup,
      },
      secondary: { label: "View pricing", href: "/pricing" },
    },
    {
      id: "clients",
      image: "/images/hero/clients.png",
      label: "Clients",
      title: ["Every client.", "A more personal welcome."],
      description:
        "Keep contact details and previous visits together. Start each appointment knowing the client behind the booking.",
      alt: "A beauty studio owner warmly welcoming a client at reception",
      primary: { label: "Start for free", href: siteLinks.signup },
      secondary: { label: "See how it works", href: siteLinks.demo },
    },
  ],
};
