import type { Locale } from "./i18n/locale";

export type LegalLink = {
  href: string;
  label: string;
  text: string;
};

export type LegalBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "list";
      items: string[];
    }
  | ({
      type: "link";
    } & LegalLink)
  | {
      type: "contacts";
      items: Array<{
        href?: string;
        label: string;
        value: string;
      }>;
    };

export type LegalSection = {
  blocks: LegalBlock[];
  id: string;
  title: string;
};

export type LegalDocument = {
  description: string;
  effectiveDate: string;
  effectiveLabel: string;
  eyebrow: string;
  highlights: string[];
  lastUpdatedDate: string;
  lastUpdatedLabel: string;
  sections: LegalSection[];
  summary: string;
  title: string;
  tocLabel: string;
};

export type LegalDocumentKind = "privacy" | "terms";

const mkTerms: LegalDocument = {
  title: "Услови за користење",
  description:
    "Условите што важат при користење на OPUS, деловната контролна табла и веб-сајтовите за онлајн закажување на студијата.",
  eyebrow: "Правни информации · Документ 01",
  summary:
    "OPUS го обезбедува софтверот за закажување. Студиото ја обезбедува услугата за убавина и е одговорно за своите цени, достапност, правила и однос со клиентите.",
  effectiveLabel: "Стапува во сила",
  effectiveDate: "1 септември 2026",
  lastUpdatedLabel: "Последно ажурирање",
  lastUpdatedDate: "1 септември 2026",
  tocLabel: "Во овој документ",
  highlights: [
    "OPUS е платформа за закажување, а не салон или давател на третмани.",
    "OPUS во моментов не обработува плаќања за закажаните услуги.",
    "Деловните профили се одговорни за точноста на понудата и законитото користење на податоците.",
  ],
  sections: [
    {
      id: "scope",
      title: "1. Опфат и прифаќање",
      blocks: [
        {
          type: "paragraph",
          text: "Овие Услови го уредуваат користењето на opus.mk, studio.opus.mk, веб-сајтовите на студијата на поддомени од opus.mk и поврзаните функции, содржини и пораки (заедно, „Услугата“).",
        },
        {
          type: "paragraph",
          text: "Со пристапување, отворање профил, приклучување кон тим или закажување термин преку Услугата, потврдувате дека сте ги прочитале и ги прифаќате овие Услови. Ако ја користите Услугата во име на деловен субјект, потврдувате дека сте овластени да го обврзете тој субјект.",
        },
        {
          type: "paragraph",
          text: "Во овие Услови, „вие“ може да значи посетител, сопственик или член на тим на студио, или клиент што закажува термин, зависно од контекстот.",
        },
      ],
    },
    {
      id: "operator",
      title: "2. За OPUS",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS е платформа за закажување за мали салони и студија за убавина во Северна Македонија. Услугата се управува под името OPUS од Скопје, Северна Македонија.",
        },
        {
          type: "contacts",
          items: [
            {
              label: "Е-пошта",
              value: "hello@opus.mk",
              href: "mailto:hello@opus.mk",
            },
            {
              label: "Телефон",
              value: "+389 77 826 333",
              href: "tel:+38977826333",
            },
            { label: "Локација", value: "Скопје, Северна Македонија" },
          ],
        },
      ],
    },
    {
      id: "service",
      title: "3. Што обезбедува Услугата",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS им овозможува на студијата да ги организираат услугите, цените, тимот, работното време, достапноста, клиентите и термините, како и да објават сопствен веб-сајт за закажување. Клиентите можат да изберат услуга, член на тим, датум и слободен термин без да отвораат корисничка сметка.",
        },
        {
          type: "paragraph",
          text: "Некои функции, како трансакциски е-пораки, зависат од правилно конфигурирани надворешни даватели. Функција прикажана како најава, тест, преглед или идна можност не е дел од обврската на OPUS сè додека не биде реално овозможена.",
        },
        {
          type: "paragraph",
          text: "OPUS не е салон, не вработува лица што ги извршуваат закажаните третмани и не дава медицински, козметички или професионални совети. Договорот за конкретната услуга е меѓу клиентот и избраното студио.",
        },
      ],
    },
    {
      id: "accounts",
      title: "4. Сметки и пристап",
      blocks: [
        {
          type: "list",
          items: [
            "За деловен профил мора да имате најмалку 18 години, деловна способност и овластување да постапувате за студиото.",
            "Мора да дадете точни и ажурирани податоци и да ја одржувате безбедноста на вашата е-пошта, еднократните кодови и уредите.",
            "Не смеете да споделувате код за најава или да дозволите неовластено лице да користи профил со вашиот идентитет.",
            "Сопственикот или овластениот менаџер на студиото одлучува кој член на тим има пристап и која улога ја има.",
          ],
        },
        {
          type: "paragraph",
          text: "Известете нè веднаш ако се сомневате во неовластен пристап. Може привремено да ограничиме профил за да го заштитиме корисникот, студиото, клиентите или Услугата.",
        },
      ],
    },
    {
      id: "studio-responsibilities",
      title: "5. Обврски на студиото",
      blocks: [
        {
          type: "paragraph",
          text: "Секое студио е самостојно одговорно за своето работење и за односот со клиентите. Студиото мора:",
        },
        {
          type: "list",
          items: [
            "да ги прикажува точно услугите, цените, траењето, персоналот, адресата и достапноста;",
            "да ги почитува применливите правила за заштита на потрошувачи, здравје, безбедност, даноци, дозволи и професионални стандарди;",
            "да ги објасни своите правила за откажување, доцнење, недоаѓање и промена на термин;",
            "да има соодветна правна основа и известување за податоците на клиенти и членови на тим што ги внесува во OPUS;",
            "да не внесува здравствени или други чувствителни податоци во белешки освен кога тоа е навистина потребно, законито и соодветно заштитено; и",
            "да одговара навремено на барања, поплаки и прашања од клиентите за конкретната услуга.",
          ],
        },
      ],
    },
    {
      id: "bookings",
      title: "6. Закажувања, цени и откажувања",
      blocks: [
        {
          type: "paragraph",
          text: "Кога клиент ќе потврди термин, OPUS го запишува закажувањето во календарот на студиото и, кога е конфигурирано, испраќа трансакциска е-порака. Студиото е одговорно да ја исполни услугата, да го извести клиентот за промени и да реши спор за квалитет, цена, откажување или недоаѓање.",
        },
        {
          type: "paragraph",
          text: "OPUS во моментов не наплатува и не обработува плаќање за закажаната услуга. Прикажаната цена е информација внесена од студиото; начинот и моментот на плаќање се договараат директно со студиото.",
        },
        {
          type: "paragraph",
          text: "Ако клиент треба да промени или откаже термин, треба да ги следи опциите во пораката за закажување или директно да го контактира студиото. Правилата на студиото може да важат дополнително на овие Услови.",
        },
      ],
    },
    {
      id: "acceptable-use",
      title: "7. Дозволено користење",
      blocks: [
        {
          type: "paragraph",
          text: "Не смеете да ја користите Услугата за незаконска, измамничка, навредлива или штетна цел. Особено, не смеете:",
        },
        {
          type: "list",
          items: [
            "да пристапувате до профил, организација или податоци без овластување;",
            "да испраќате спам, злонамерен код или содржина што повредува туѓи права;",
            "да го попречувате работењето, безбедноста или ограничувањата на Услугата;",
            "масовно да извлекувате податоци, да тестирате ранливости без писмена дозвола или да правите лажни закажувања; или",
            "да ја копирате, препродавате или обратно инженерски да ја анализирате Услугата, освен кога тоа изречно го дозволува применливиот закон.",
          ],
        },
      ],
    },
    {
      id: "content",
      title: "8. Содржина на студиото",
      blocks: [
        {
          type: "paragraph",
          text: "Студиото ги задржува правата врз своето име, лого, фотографии, описи, цени и друга содржина. Со поставување содржина, студиото му дава на OPUS ограничена, неексклузивна и отповиклива дозвола да ја хостира, обработува, приспособува за приказ и објавува само колку што е потребно за обезбедување на Услугата.",
        },
        {
          type: "paragraph",
          text: "Студиото потврдува дека има право да ја користи содржината и дека има потребна дозвола од секое лице што може да се препознае на фотографија или во јавен профил. Може да отстраниме содржина што е незаконска, неточна, небезбедна или ги повредува овие Услови.",
        },
      ],
    },
    {
      id: "communications",
      title: "9. Е-пораки и известувања",
      blocks: [
        {
          type: "paragraph",
          text: "За да обезбедиме најава и закажување, може да испраќаме еднократни кодови, потврди, известувања за промена или откажување и потсетници. Овие се услужни, а не маркетинг пораки. Доставата зависи од точноста на адресата, системот на примателот и достапноста на конфигурираниот давател, па не можеме да гарантираме дека секоја порака ќе пристигне навреме.",
        },
        {
          type: "paragraph",
          text: "Маркетинг пораки може да се испраќаат само кога постои посебна законска основа, како валидна согласност, и мора да има јасен начин за одјавување.",
        },
      ],
    },
    {
      id: "fees",
      title: "10. Бесплатна и идна платена понуда",
      blocks: [
        {
          type: "paragraph",
          text: "Функциите што моментално се означени како бесплатни може да се користат без платежна картичка. OPUS нема да ве задолжи автоматски. Ако во иднина понудиме платена функција или план, цената, даноците, периодот на наплата, обновувањето и условите за откажување ќе бидат прикажани пред да побараме изречно прифаќање или плаќање.",
        },
      ],
    },
    {
      id: "availability",
      title: "11. Достапност, промени и прекин",
      blocks: [
        {
          type: "paragraph",
          text: "Работиме Услугата да биде сигурна, но не ветуваме непрекинато или целосно безгрешно работење. Може да вршиме одржување, да поправаме безбедносен проблем или да измениме функција. Кога е разумно, однапред ќе известиме за материјална промена што влијае на активни корисници.",
        },
        {
          type: "paragraph",
          text: "Може да ограничиме или прекинеме пристап ако постои прекршување на овие Услови, безбедносен ризик, незаконска активност, злоупотреба или законско барање. Вие може да престанете да ја користите Услугата во секое време и да побарате затворање на профил преку hello@opus.mk.",
        },
      ],
    },
    {
      id: "intellectual-property",
      title: "12. Интелектуална сопственост",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS, неговиот знак, интерфејс, софтвер и оригинална содржина се заштитени со применливите права на интелектуална сопственост. Освен ограниченото право да ја користите Услугата според овие Услови, не добивате сопственост или лиценца врз тие права.",
        },
      ],
    },
    {
      id: "liability",
      title: "13. Гаранции и одговорност",
      blocks: [
        {
          type: "paragraph",
          text: "Услугата се обезбедува според нејзината достапност. Во најголема мера дозволена со закон, OPUS не одговара за квалитетот, безбедноста, законитоста, исходот или извршувањето на услуга што ја дава студио, ниту за неточни податоци внесени од студио или клиент.",
        },
        {
          type: "paragraph",
          text: "OPUS одговара за директна и разумно предвидлива штета предизвикана од наше прекршување само во мерата што ја бара применливиот закон. Не одговараме за индиректна загуба, изгубена добивка или прекин на деловно работење кога таквото ограничување е дозволено. Ништо во овие Услови не исклучува одговорност што законски не може да се исклучи, ниту задолжителни права на потрошувачите.",
        },
      ],
    },
    {
      id: "privacy",
      title: "14. Приватност",
      blocks: [
        {
          type: "link",
          text: "Начинот на кој OPUS обработува лични податоци, улогата на студиото и вашите права се објаснети во",
          label: "Политиката за приватност",
          href: "/privacy",
        },
      ],
    },
    {
      id: "law",
      title: "15. Применливо право и спорови",
      blocks: [
        {
          type: "paragraph",
          text: "Овие Услови се толкуваат според законите на Република Северна Македонија. Прво контактирајте нè за да се обидеме спорот да го решиме директно. За деловни корисници, надлежни се стварно надлежните судови во Скопје. Ако сте потрошувач, оваа одредба не ги ограничува задолжителните права или надлежност што ви следуваат според применливиот закон.",
        },
      ],
    },
    {
      id: "changes-contact",
      title: "16. Промени и контакт",
      blocks: [
        {
          type: "paragraph",
          text: "Може да ги ажурираме овие Услови кога се менува Услугата или законот. Новата верзија ќе го има датумот на ажурирање, а за материјални промени ќе дадеме разумно известување пред да стапат во сила кога тоа е потребно.",
        },
        {
          type: "paragraph",
          text: "За прашања за овие Услови пишете на hello@opus.mk или јавете се на +389 77 826 333.",
        },
      ],
    },
  ],
};

const mkPrivacy: LegalDocument = {
  title: "Политика за приватност",
  description:
    "Како OPUS собира, користи, споделува и штити лични податоци на студија, членови на тим, клиенти и посетители.",
  eyebrow: "Правни информации · Документ 02",
  summary:
    "OPUS не продава лични податоци и не користи рекламни или аналитички колачиња. Податоците ги користиме за профили, безбедно закажување, поддршка и трансакциски пораки.",
  effectiveLabel: "Стапува во сила",
  effectiveDate: "1 септември 2026",
  lastUpdatedLabel: "Последно ажурирање",
  lastUpdatedDate: "1 септември 2026",
  tocLabel: "Во овој документ",
  highlights: [
    "Студиото е контролор за податоците на своите клиенти; OPUS ја обезбедува платформата.",
    "Не продаваме лични податоци и не ги споделуваме со рекламни мрежи.",
    "Користиме само неопходни и кориснички побарани колачиња или локална меморија.",
  ],
  sections: [
    {
      id: "scope",
      title: "1. Опфат и контакт",
      blocks: [
        {
          type: "paragraph",
          text: "Оваа Политика важи за opus.mk, studio.opus.mk, веб-сајтовите на студијата на поддомени од opus.mk и поврзаните функции, пораки и поддршка (заедно, „Услугата“). Таа објаснува како OPUS обработува лични податоци според Законот за заштита на личните податоци на Република Северна Македонија.",
        },
        {
          type: "paragraph",
          text: "За обработката за која OPUS е контролор, контакт за приватност е OPUS, Скопје, Северна Македонија.",
        },
        {
          type: "contacts",
          items: [
            {
              label: "Е-пошта",
              value: "hello@opus.mk",
              href: "mailto:hello@opus.mk",
            },
            {
              label: "Телефон",
              value: "+389 77 826 333",
              href: "tel:+38977826333",
            },
          ],
        },
        {
          type: "link",
          text: "Користењето на Услугата е уредено и со нашите",
          label: "Услови за користење",
          href: "/terms",
        },
      ],
    },
    {
      id: "roles",
      title: "2. Кој одлучува за обработката",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS е контролор кога обработува податоци за посетители на opus.mk, деловни профили, најава, безбедност, поддршка и работење на платформата. Тоа значи дека OPUS ги определува целите и начинот на таа обработка.",
        },
        {
          type: "paragraph",
          text: "Кога студио користи OPUS за да води клиенти и термини, студиото е контролор за тие клиентски податоци, а OPUS ги обработува за да ја обезбеди платформата. Студиото одлучува зошто ги собира податоците, колку долго му се потребни и кој член на тим има пристап.",
        },
        {
          type: "paragraph",
          text: "Ако вашето барање се однесува на конкретен термин, белешка или клиентски профил, прво контактирајте го студиото. OPUS ќе му помогне на студиото да одговори кога тоа е потребно и законски дозволено.",
        },
      ],
    },
    {
      id: "data-we-collect",
      title: "3. Податоци што ги обработуваме",
      blocks: [
        {
          type: "paragraph",
          text: "Зависно од тоа како ја користите Услугата, може да ги обработуваме следните категории:",
        },
        {
          type: "list",
          items: [
            "Податоци за профил и најава: име, е-пошта, телефон кога е внесен, фотографија на профил, членство во студио, улога и безбедносни записи за најава.",
            "Податоци за студио и тим: деловно име, контакт, адреса и координати, услуги, цени, работно време, достапност, фотографии, опис и профили на членови на тим.",
            "Податоци за локација: координати на уредот кога изречно ќе изберете пресметка на рута до студиото и ќе дадете дозвола во прелистувачот.",
            "Податоци за клиент и термин: име, е-пошта, телефон кога е внесен, избрана услуга, член на тим, датум и време, статус на термин, причина за откажување и белешка што ја внесува клиентот или овластен член на тим.",
            "Комуникации: пораки до поддршка, податоци од контакт-формата и записи за испраќање или неуспех на трансакциски е-пораки.",
            "Технички и безбедносни податоци: IP-адреса и кориснички агент кога се евидентираат за безбедност или ревизија, време на барање, системски настани, колачиња и локални поставки на прелистувачот.",
            "Содржина што ја поставувате: фотографии, описи, јавни податоци за студиото и други информации што доброволно ги внесувате.",
          ],
        },
        {
          type: "paragraph",
          text: "Студио може и рачно да внесе податоци што веќе ги има од клиент или член на тим. Во тој случај студиото е одговорно да ве информира и да има валидна правна основа.",
        },
      ],
    },
    {
      id: "sensitive-data",
      title: "4. Чувствителни податоци",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS не бара здравствени, биометриски или други посебни категории лични податоци за обично закажување. Не внесувајте дијагноза, медицинска историја или друга чувствителна информација во слободните белешки освен ако е навистина потребна за безбедно обезбедување на услугата и студиото има соодветна законска основа и мерки за заштита.",
        },
      ],
    },
    {
      id: "purposes",
      title: "5. Зошто ги користиме податоците",
      blocks: [
        {
          type: "list",
          items: [
            "За да ја обезбедиме Услугата: отворање профил, најава, управување со студио, проверка на достапност, создавање и управување со термин и испраќање услужни пораки.",
            "За безбедност и интегритет: проверка на е-пошта, спречување злоупотреба и двојни термини, контрола на пристап, ревизиски записи и решавање инциденти.",
            "За поддршка и комуникација: одговор на прашање, контакт-барање, поплака или барање за остварување право.",
            "За одржување и подобрување: дијагностика на грешки, сигурност, капацитет и подобрување на текот на закажување без рекламно профилирање.",
            "За законски обврски: постапување по важечко барање од орган, заштита на права и водење записи што мора да се зачуваат.",
          ],
        },
      ],
    },
    {
      id: "legal-bases",
      title: "6. Правни основи",
      blocks: [
        {
          type: "paragraph",
          text: "Зависно од целта, обработката се заснова на една или повеќе од следните основи:",
        },
        {
          type: "list",
          items: [
            "извршување договор или преземање чекори по ваше барање, на пример за профил, закажување или одговор пред започнување со користење;",
            "законска обврска, на пример кога мора да зачуваме или доставиме одреден запис;",
            "легитимен интерес за безбедно, доверливо и корисно работење на Услугата, спречување злоупотреба и заштита на правни барања, кога вашите права не преовладуваат; и",
            "согласност, кога законски е потребна, на пример за незадолжителна маркетинг комуникација или кориснички избрана поставка.",
          ],
        },
        {
          type: "paragraph",
          text: "Кога OPUS обработува клиентски податоци по инструкции на студио, правната основа за собирањето ја определува студиото како контролор.",
        },
      ],
    },
    {
      id: "sharing",
      title: "7. Со кого споделуваме податоци",
      blocks: [
        {
          type: "paragraph",
          text: "Податоците ги споделуваме само колку што е потребно за целите опишани тука:",
        },
        {
          type: "list",
          items: [
            "Со студиото и неговите овластени членови на тим: за да го видат и исполнат терминот и да водат клиентска евиденција.",
            "Со Vercel: за хостирање и испорака на веб-апликациите, кога Услугата е поставена таму.",
            "Со Convex: за базата, складирањето, серверските функции и инфраструктурата за најава.",
            "Со Resend и/или Sender: за еднократни кодови и трансакциски е-пораки, само кога соодветниот давател е конфигуриран.",
            "Со Formspree: кога ја испраќате контакт-формата на opus.mk.",
            "Со Mapbox: кога се користи пребарување адреса, мапа или насока и функцијата е конфигурирана; за пресметка на рута може да ги добие координатите на студиото и на вашиот уред.",
            "Со професионални советници, надлежен орган или суд кога тоа е законски потребно или неопходно за заштита на права, безбедност и корисници.",
          ],
        },
        {
          type: "paragraph",
          text: "Не продаваме лични податоци, не ги изнајмуваме и не ги споделуваме со рекламни мрежи. Ако дојде до реорганизација, финансирање или пренос на Услугата, податоците може да бидат пренесени со соодветно известување и заштита.",
        },
      ],
    },
    {
      id: "transfers",
      title: "8. Пренос во други држави",
      blocks: [
        {
          type: "paragraph",
          text: "Некои инфраструктурни даватели може да обработуваат податоци надвор од Северна Македонија. Кога применливиот закон бара дополнителна заштита за таков пренос, користиме дозволен механизам и соодветни договорни или организациски мерки. Може да побарате информации за механизмот што се применува за конкретен давател преку hello@opus.mk.",
        },
      ],
    },
    {
      id: "retention",
      title: "9. Колку долго ги чуваме податоците",
      blocks: [
        {
          type: "paragraph",
          text: "Податоците ги чуваме само додека се потребни за целта за која се собрани. Периодот зависи од видот на податокот, активноста на профилот, инструкциите на студиото, безбедносниот ризик и законските обврски.",
        },
        {
          type: "list",
          items: [
            "Профил и деловни податоци: додека профилот е активен и потоа разумен период за затворање, извоз, спор или законска обврска.",
            "Термини и клиентски записи: според потребата и инструкциите на студиото, освен кога подолг период е потребен за законска обврска, безбедност или правно барање.",
            "Еднократни кодови: само кратко време потребно за проверка; кодовите се чуваат во хеширана форма и истекуваат.",
            "Контакт и поддршка: додека да одговориме и потоа колку што е разумно потребно за следење на барањето.",
            "Безбедносни, доставни и ревизиски записи: колку што е потребно за заштита, дијагностика, доказ за дејство и законски обврски.",
          ],
        },
        {
          type: "paragraph",
          text: "Кога ќе се избрише запис, може прво да биде отстранет од активна употреба. Ограничени податоци може да останат во безбедносни или ревизиски записи и резервни копии до нивното редовно ротирање, или да бидат задржани кога законот го бара тоа.",
        },
      ],
    },
    {
      id: "cookies",
      title: "10. Колачиња и локална меморија",
      blocks: [
        {
          type: "paragraph",
          text: "Тековната верзија на OPUS не користи рекламни или аналитички колачиња. Користиме само технологии потребни за функција што ја барате:",
        },
        {
          type: "list",
          items: [
            "Неопходни колачиња за сесија и безбедност на studio.opus.mk, за да се најавите и да останете безбедно најавени.",
            "Колачето opus_locale, кое се поставува кога самите ќе го смените јазикот и го памети изборот до една година.",
            "Локална меморија за избраната светла или темна тема и за одредени поставки на интерфејсот. Овие вредности остануваат на уредот додека не ги исчистите.",
          ],
        },
        {
          type: "paragraph",
          text: "Може да ги избришете колачињата и локалната меморија преку поставките на прелистувачот. Блокирањето на неопходните колачиња може да спречи најава или друга побарана функција. Ако во иднина воведеме незадолжителна аналитика или рекламирање, прво ќе ја ажурираме оваа Политика и ќе побараме согласност кога законот го бара тоа.",
        },
      ],
    },
    {
      id: "security",
      title: "11. Безбедност",
      blocks: [
        {
          type: "paragraph",
          text: "Применуваме технички и организациски мерки соодветни на ризикот, вклучително контрола на пристап според студио и улога, еднократни кодови во хеширана форма, ограничување на обиди, шифриран пренос и ревизиски записи за значајни дејства. Пристапот е ограничен на лица и даватели на кои им е потребен за нивната работа.",
        },
        {
          type: "paragraph",
          text: "Ниту еден систем не е апсолутно безбеден. Ако се сомневате дека профил или личен податок е компромитиран, веднаш пишете на hello@opus.mk.",
        },
      ],
    },
    {
      id: "rights",
      title: "12. Ваши права",
      blocks: [
        {
          type: "paragraph",
          text: "Во зависност од околностите и применливиот закон, може да имате право:",
        },
        {
          type: "list",
          items: [
            "да бидете информирани и да добиете пристап до вашите лични податоци;",
            "да исправите неточни или да дополните нецелосни податоци;",
            "да побарате бришење или ограничување на обработката;",
            "да добиете податоци во пренослив формат кога се исполнети законските услови;",
            "да приговорите на обработка заснована на легитимен интерес;",
            "да ја повлечете согласноста во секое време, без тоа да влијае на претходната законитост; и",
            "да не бидете предмет на одлука заснована исклучиво на автоматска обработка што создава правни или слично значајни последици.",
          ],
        },
        {
          type: "paragraph",
          text: "Испратете барање на hello@opus.mk. Може да побараме разумна потврда на идентитетот и контекстот на студиото за да не откриеме податоци на погрешно лице. Одредени права може да бидат ограничени кога законот дозволува или бара задржување.",
        },
        {
          type: "link",
          text: "Имате право и да поднесете барање до",
          label: "Агенцијата за заштита на личните податоци",
          href: "https://azlp.mk/gragjani/formulari-i-uslugi/",
        },
      ],
    },
    {
      id: "children",
      title: "13. Малолетни лица",
      blocks: [
        {
          type: "paragraph",
          text: "Деловните профили на OPUS се наменети за полнолетни лица. Услугата не е наменета дете самостојно да отвори деловен профил. Кога се закажува услуга за малолетно лице, родител, старател или студиото треба да го направи тоа и да обезбеди соодветна правна основа за податоците.",
        },
      ],
    },
    {
      id: "automation-marketing",
      title: "14. Автоматски одлуки и маркетинг",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS не користи податоци од тековниот тек на закажување за одлука заснована исклучиво на автоматска обработка што создава правни или слично значајни последици за вас. Еднократните кодови, потврдите и потсетниците се трансакциски пораки. Не испраќаме маркетинг без посебна законска основа и можност за одјавување.",
        },
      ],
    },
    {
      id: "changes",
      title: "15. Промени на Политиката",
      blocks: [
        {
          type: "paragraph",
          text: "Може да ја ажурираме Политиката кога се менуваат Услугата, давателите или законот. Ќе го смениме датумот на врвот на страницата и, кога промената е материјална, ќе дадеме дополнително известување преку Услугата или е-пошта кога тоа е соодветно.",
        },
      ],
    },
    {
      id: "contact",
      title: "16. Прашања за приватност",
      blocks: [
        {
          type: "paragraph",
          text: "За прашање, барање или поплака во врска со приватноста пишете на hello@opus.mk или јавете се на +389 77 826 333. Ако се работи за податоци од конкретно студио, наведете го името на студиото и доволно детали за да го пронајдеме барањето без да испраќате непотребни чувствителни податоци.",
        },
      ],
    },
  ],
};

const enTerms: LegalDocument = {
  title: "Terms of Use",
  description:
    "The terms that apply when using OPUS, the business dashboard, and studio online-booking websites.",
  eyebrow: "Legal information · Document 01",
  summary:
    "OPUS provides the booking software. The studio provides the beauty service and remains responsible for its prices, availability, policies, and relationship with clients.",
  effectiveLabel: "Effective",
  effectiveDate: "1 September 2026",
  lastUpdatedLabel: "Last updated",
  lastUpdatedDate: "1 September 2026",
  tocLabel: "In this document",
  highlights: [
    "OPUS is booking software, not a salon or treatment provider.",
    "OPUS does not currently process payments for booked services.",
    "Business accounts are responsible for accurate listings and lawful use of data.",
  ],
  sections: [
    {
      id: "scope",
      title: "1. Scope and acceptance",
      blocks: [
        {
          type: "paragraph",
          text: "These Terms govern your use of opus.mk, studio.opus.mk, studio websites on opus.mk subdomains, and the related features, content, and communications (together, the “Service”).",
        },
        {
          type: "paragraph",
          text: "By accessing the Service, creating an account, joining a studio team, or booking an appointment through the Service, you confirm that you have read and accept these Terms. If you use the Service for a business, you confirm that you are authorised to bind that business.",
        },
        {
          type: "paragraph",
          text: "In these Terms, “you” may mean a visitor, studio owner or team member, or a client booking an appointment, depending on the context.",
        },
      ],
    },
    {
      id: "operator",
      title: "2. About OPUS",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS is a booking platform for small beauty salons and studios in North Macedonia. The Service is operated under the OPUS name from Skopje, North Macedonia.",
        },
        {
          type: "contacts",
          items: [
            {
              label: "Email",
              value: "hello@opus.mk",
              href: "mailto:hello@opus.mk",
            },
            {
              label: "Phone",
              value: "+389 77 826 333",
              href: "tel:+38977826333",
            },
            { label: "Location", value: "Skopje, North Macedonia" },
          ],
        },
      ],
    },
    {
      id: "service",
      title: "3. What the Service provides",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS lets studios organise services, prices, team members, working hours, availability, clients, and appointments, and publish their own booking website. Clients can choose a service, team member, date, and available time without creating an account.",
        },
        {
          type: "paragraph",
          text: "Some features, including transactional email, depend on correctly configured third-party providers. A feature shown as planned, in testing, in preview, or for future release is not part of OPUS’s commitment until it is actually enabled.",
        },
        {
          type: "paragraph",
          text: "OPUS is not a salon, does not employ the people performing booked treatments, and does not provide medical, cosmetic, or professional advice. The agreement for a particular service is between the client and the selected studio.",
        },
      ],
    },
    {
      id: "accounts",
      title: "4. Accounts and access",
      blocks: [
        {
          type: "list",
          items: [
            "To hold a business account, you must be at least 18, have legal capacity, and be authorised to act for the studio.",
            "You must provide accurate, current information and keep your email account, one-time codes, and devices secure.",
            "You must not share a sign-in code or let an unauthorised person use an account under your identity.",
            "The studio owner or an authorised manager decides which team members have access and which role each person receives.",
          ],
        },
        {
          type: "paragraph",
          text: "Tell us immediately if you suspect unauthorised access. We may temporarily restrict an account to protect the user, studio, clients, or Service.",
        },
      ],
    },
    {
      id: "studio-responsibilities",
      title: "5. Studio responsibilities",
      blocks: [
        {
          type: "paragraph",
          text: "Each studio is independently responsible for its business and client relationships. A studio must:",
        },
        {
          type: "list",
          items: [
            "accurately display its services, prices, duration, staff, address, and availability;",
            "comply with applicable consumer, health, safety, tax, licensing, and professional rules;",
            "explain its cancellation, lateness, no-show, and rescheduling policies;",
            "have an appropriate legal basis and notice for client and team-member data it enters into OPUS;",
            "avoid adding health or other sensitive data to notes unless genuinely necessary, lawful, and appropriately protected; and",
            "respond promptly to client requests, complaints, and questions about the booked service.",
          ],
        },
      ],
    },
    {
      id: "bookings",
      title: "6. Bookings, prices, and cancellations",
      blocks: [
        {
          type: "paragraph",
          text: "When a client confirms an appointment, OPUS records it in the studio calendar and, when configured, sends a transactional email. The studio is responsible for performing the service, telling the client about changes, and resolving disputes about quality, price, cancellation, or non-attendance.",
        },
        {
          type: "paragraph",
          text: "OPUS does not currently charge or process payment for the booked service. A displayed price is information entered by the studio; the method and timing of payment are arranged directly with the studio.",
        },
        {
          type: "paragraph",
          text: "If a client needs to reschedule or cancel, they should use the options in the booking message or contact the studio directly. The studio’s policies may apply in addition to these Terms.",
        },
      ],
    },
    {
      id: "acceptable-use",
      title: "7. Acceptable use",
      blocks: [
        {
          type: "paragraph",
          text: "You must not use the Service for an unlawful, fraudulent, abusive, or harmful purpose. In particular, you must not:",
        },
        {
          type: "list",
          items: [
            "access an account, organisation, or data without authorisation;",
            "send spam, malicious code, or content that infringes another person’s rights;",
            "interfere with the operation, security, or limits of the Service;",
            "extract data at scale, test vulnerabilities without written permission, or create false bookings; or",
            "copy, resell, or reverse engineer the Service except where applicable law expressly allows it.",
          ],
        },
      ],
    },
    {
      id: "content",
      title: "8. Studio content",
      blocks: [
        {
          type: "paragraph",
          text: "A studio keeps its rights in its name, logo, photos, descriptions, prices, and other content. By uploading content, the studio gives OPUS a limited, non-exclusive, revocable permission to host, process, adapt for display, and publish it only as needed to provide the Service.",
        },
        {
          type: "paragraph",
          text: "The studio confirms that it may use the content and has permission from each identifiable person shown in a photo or public profile. We may remove content that is unlawful, inaccurate, unsafe, or breaches these Terms.",
        },
      ],
    },
    {
      id: "communications",
      title: "9. Email and notifications",
      blocks: [
        {
          type: "paragraph",
          text: "To provide sign-in and booking, we may send one-time codes, confirmations, rescheduling or cancellation notices, and reminders. These are service messages, not marketing. Delivery depends on the address being correct, the recipient’s system, and the configured provider being available, so we cannot guarantee that every message arrives on time.",
        },
        {
          type: "paragraph",
          text: "Marketing messages may be sent only where there is a separate lawful basis, such as valid consent, and they must include a clear way to opt out.",
        },
      ],
    },
    {
      id: "fees",
      title: "10. Free and future paid services",
      blocks: [
        {
          type: "paragraph",
          text: "Features currently labelled free can be used without a payment card. OPUS will not charge you automatically. If we later offer a paid feature or plan, its price, taxes, billing period, renewal, and cancellation terms will be shown before we ask for express acceptance or payment.",
        },
      ],
    },
    {
      id: "availability",
      title: "11. Availability, changes, and suspension",
      blocks: [
        {
          type: "paragraph",
          text: "We work to keep the Service reliable, but do not promise uninterrupted or error-free operation. We may perform maintenance, address a security issue, or change a feature. Where reasonable, we will give advance notice of a material change that affects active users.",
        },
        {
          type: "paragraph",
          text: "We may restrict or suspend access for a breach of these Terms, a security risk, unlawful activity, misuse, or a legal requirement. You may stop using the Service at any time and ask us to close an account at hello@opus.mk.",
        },
      ],
    },
    {
      id: "intellectual-property",
      title: "12. Intellectual property",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS, its mark, interface, software, and original content are protected by applicable intellectual-property rights. Except for the limited right to use the Service under these Terms, you receive no ownership or licence in those rights.",
        },
      ],
    },
    {
      id: "liability",
      title: "13. Warranties and liability",
      blocks: [
        {
          type: "paragraph",
          text: "The Service is provided as available. To the fullest extent permitted by law, OPUS is not responsible for the quality, safety, legality, outcome, or performance of a service supplied by a studio, or for inaccurate information entered by a studio or client.",
        },
        {
          type: "paragraph",
          text: "OPUS is responsible for direct and reasonably foreseeable loss caused by our breach only to the extent required by applicable law. We are not responsible for indirect loss, lost profit, or business interruption where that limitation is permitted. Nothing in these Terms excludes liability that cannot lawfully be excluded or limits mandatory consumer rights.",
        },
      ],
    },
    {
      id: "privacy",
      title: "14. Privacy",
      blocks: [
        {
          type: "link",
          text: "How OPUS handles personal data, the studio’s role, and your rights are explained in our",
          label: "Privacy Policy",
          href: "/privacy",
        },
      ],
    },
    {
      id: "law",
      title: "15. Governing law and disputes",
      blocks: [
        {
          type: "paragraph",
          text: "These Terms are governed by the laws of the Republic of North Macedonia. Contact us first so we can try to resolve a dispute directly. For business users, the competent courts in Skopje have jurisdiction. If you are a consumer, this does not limit any mandatory right or jurisdiction available to you under applicable law.",
        },
      ],
    },
    {
      id: "changes-contact",
      title: "16. Changes and contact",
      blocks: [
        {
          type: "paragraph",
          text: "We may update these Terms when the Service or law changes. The new version will show its updated date, and we will provide reasonable advance notice of material changes where required.",
        },
        {
          type: "paragraph",
          text: "For questions about these Terms, email hello@opus.mk or call +389 77 826 333.",
        },
      ],
    },
  ],
};

const enPrivacy: LegalDocument = {
  title: "Privacy Policy",
  description:
    "How OPUS collects, uses, shares, and protects personal data about studios, team members, clients, and visitors.",
  eyebrow: "Legal information · Document 02",
  summary:
    "OPUS does not sell personal data or use advertising or analytics cookies. We use data for accounts, secure booking, support, and transactional messages.",
  effectiveLabel: "Effective",
  effectiveDate: "1 September 2026",
  lastUpdatedLabel: "Last updated",
  lastUpdatedDate: "1 September 2026",
  tocLabel: "In this document",
  highlights: [
    "The studio controls its client records; OPUS provides the platform.",
    "We do not sell personal data or share it with advertising networks.",
    "We use only necessary and user-requested cookies or local storage.",
  ],
  sections: [
    {
      id: "scope",
      title: "1. Scope and contact",
      blocks: [
        {
          type: "paragraph",
          text: "This Policy applies to opus.mk, studio.opus.mk, studio websites on opus.mk subdomains, and related features, communications, and support (together, the “Service”). It explains how OPUS processes personal data under the Law on Personal Data Protection of the Republic of North Macedonia.",
        },
        {
          type: "paragraph",
          text: "For processing where OPUS is the controller, the privacy contact is OPUS, Skopje, North Macedonia.",
        },
        {
          type: "contacts",
          items: [
            {
              label: "Email",
              value: "hello@opus.mk",
              href: "mailto:hello@opus.mk",
            },
            {
              label: "Phone",
              value: "+389 77 826 333",
              href: "tel:+38977826333",
            },
          ],
        },
        {
          type: "link",
          text: "Use of the Service is also governed by our",
          label: "Terms of Use",
          href: "/terms",
        },
      ],
    },
    {
      id: "roles",
      title: "2. Who decides how data is used",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS is the controller when it processes data for opus.mk visitors, business accounts, sign-in, security, support, and platform operations. This means OPUS decides the purposes and means of that processing.",
        },
        {
          type: "paragraph",
          text: "When a studio uses OPUS to manage clients and appointments, the studio is the controller of that client data and OPUS processes it to provide the platform. The studio decides why it collects the data, how long it needs it, and which team members may access it.",
        },
        {
          type: "paragraph",
          text: "If your request concerns a particular appointment, note, or client profile, contact the studio first. OPUS will assist the studio where needed and lawfully permitted.",
        },
      ],
    },
    {
      id: "data-we-collect",
      title: "3. Data we process",
      blocks: [
        {
          type: "paragraph",
          text: "Depending on how you use the Service, we may process the following categories:",
        },
        {
          type: "list",
          items: [
            "Account and sign-in data: name, email, phone when provided, profile image, studio membership, role, and sign-in security records.",
            "Studio and team data: business name, contact details, address and coordinates, services, prices, working hours, availability, photos, description, and team-member profiles.",
            "Location data: device coordinates when you expressly choose to calculate a route to the studio and grant permission in your browser.",
            "Client and appointment data: name, email, phone when provided, selected service, team member, date and time, appointment status, cancellation reason, and a note entered by the client or an authorised team member.",
            "Communications: support messages, contact-form submissions, and records showing whether a transactional email was sent or failed.",
            "Technical and security data: IP address and user agent when recorded for security or audit, request time, system events, cookies, and local browser preferences.",
            "Content you upload: photos, descriptions, public studio information, and other information you voluntarily enter.",
          ],
        },
        {
          type: "paragraph",
          text: "A studio may also manually enter information it already holds about a client or team member. In that case, the studio is responsible for informing the person and having a valid legal basis.",
        },
      ],
    },
    {
      id: "sensitive-data",
      title: "4. Sensitive data",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS does not ask for health, biometric, or other special-category data for ordinary booking. Do not put a diagnosis, medical history, or other sensitive information in free-text notes unless it is genuinely needed to provide the service safely and the studio has an appropriate legal basis and safeguards.",
        },
      ],
    },
    {
      id: "purposes",
      title: "5. Why we use data",
      blocks: [
        {
          type: "list",
          items: [
            "To provide the Service: create an account, sign in, manage a studio, check availability, create and manage an appointment, and send service messages.",
            "For security and integrity: verify email, prevent misuse and overlapping bookings, control access, keep audit records, and resolve incidents.",
            "For support and communication: respond to a question, contact request, complaint, or rights request.",
            "For maintenance and improvement: diagnose errors, maintain reliability and capacity, and improve the booking flow without advertising profiling.",
            "For legal obligations: respond to a valid authority request, protect legal rights, and keep records that must be retained.",
          ],
        },
      ],
    },
    {
      id: "legal-bases",
      title: "6. Legal bases",
      blocks: [
        {
          type: "paragraph",
          text: "Depending on the purpose, processing relies on one or more of the following bases:",
        },
        {
          type: "list",
          items: [
            "performance of a contract or steps requested before a contract, such as an account, appointment, or pre-service response;",
            "a legal obligation, such as when a record must be kept or disclosed;",
            "a legitimate interest in operating a secure, reliable, and useful Service, preventing misuse, and protecting legal claims where your rights do not override that interest; and",
            "consent where the law requires it, such as optional marketing or a user-selected preference.",
          ],
        },
        {
          type: "paragraph",
          text: "Where OPUS processes client data on a studio’s instructions, the studio determines the legal basis for collecting it as controller.",
        },
      ],
    },
    {
      id: "sharing",
      title: "7. Who receives data",
      blocks: [
        {
          type: "paragraph",
          text: "We share data only as needed for the purposes described here:",
        },
        {
          type: "list",
          items: [
            "The studio and its authorised team members: so they can view and fulfil the appointment and manage their client records.",
            "Vercel: for hosting and delivering the web applications when the Service is deployed there.",
            "Convex: for the database, storage, server functions, and sign-in infrastructure.",
            "Resend and/or Sender: for one-time codes and transactional email, only when the relevant provider is configured.",
            "Formspree: when you submit the contact form on opus.mk.",
            "Mapbox: when address search, a map, or directions are used and the feature is configured; it may receive the studio and device coordinates to calculate a route.",
            "Professional advisers, a competent authority, or a court where legally required or necessary to protect rights, security, and users.",
          ],
        },
        {
          type: "paragraph",
          text: "We do not sell or rent personal data and do not share it with advertising networks. If the Service is reorganised, financed, or transferred, data may transfer with appropriate notice and safeguards.",
        },
      ],
    },
    {
      id: "transfers",
      title: "8. International transfers",
      blocks: [
        {
          type: "paragraph",
          text: "Some infrastructure providers may process data outside North Macedonia. Where applicable law requires extra protection for such a transfer, we use a permitted mechanism and appropriate contractual or organisational safeguards. You can ask about the mechanism used for a particular provider at hello@opus.mk.",
        },
      ],
    },
    {
      id: "retention",
      title: "9. How long we keep data",
      blocks: [
        {
          type: "paragraph",
          text: "We keep data only for as long as it is needed for the purpose for which it was collected. The period depends on the type of data, account activity, the studio’s instructions, security risk, and legal obligations.",
        },
        {
          type: "list",
          items: [
            "Account and business data: while the account is active and then for a reasonable period for closure, export, disputes, or legal obligations.",
            "Appointments and client records: according to the studio’s needs and instructions, unless a longer period is needed for a legal obligation, security, or a legal claim.",
            "One-time codes: only for the short period needed for verification; codes are stored in hashed form and expire.",
            "Contact and support: until we respond and then for as long as reasonably needed to follow up on the request.",
            "Security, delivery, and audit records: for as long as needed for protection, diagnosis, evidence of actions, and legal obligations.",
          ],
        },
        {
          type: "paragraph",
          text: "When a record is deleted, it may first be removed from active use. Limited data may remain in security or audit records and backups until their normal rotation, or be retained where law requires it.",
        },
      ],
    },
    {
      id: "cookies",
      title: "10. Cookies and local storage",
      blocks: [
        {
          type: "paragraph",
          text: "The current version of OPUS does not use advertising or analytics cookies. We use only technologies needed for a function you request:",
        },
        {
          type: "list",
          items: [
            "Necessary session and security cookies on studio.opus.mk so you can sign in and remain securely signed in.",
            "The opus_locale cookie, set when you choose another language, which remembers that choice for up to one year.",
            "Local storage for your light or dark theme and certain interface preferences. These values stay on your device until you clear them.",
          ],
        },
        {
          type: "paragraph",
          text: "You can delete cookies and local storage in your browser settings. Blocking necessary cookies may prevent sign-in or another requested function. If we introduce optional analytics or advertising later, we will first update this Policy and request consent where the law requires it.",
        },
      ],
    },
    {
      id: "security",
      title: "11. Security",
      blocks: [
        {
          type: "paragraph",
          text: "We use technical and organisational measures appropriate to the risk, including access control by studio and role, hashed one-time codes, attempt limits, encryption in transit, and audit records for significant actions. Access is limited to people and providers who need it for their work.",
        },
        {
          type: "paragraph",
          text: "No system is completely secure. If you believe an account or personal data has been compromised, contact hello@opus.mk immediately.",
        },
      ],
    },
    {
      id: "rights",
      title: "12. Your rights",
      blocks: [
        {
          type: "paragraph",
          text: "Depending on the circumstances and applicable law, you may have the right to:",
        },
        {
          type: "list",
          items: [
            "be informed and obtain access to your personal data;",
            "correct inaccurate or complete incomplete data;",
            "request erasure or restriction of processing;",
            "receive data in a portable format where the legal conditions apply;",
            "object to processing based on legitimate interests;",
            "withdraw consent at any time without affecting earlier lawful processing; and",
            "not be subject to a decision based solely on automated processing that produces legal or similarly significant effects.",
          ],
        },
        {
          type: "paragraph",
          text: "Send a request to hello@opus.mk. We may ask for reasonable proof of identity and the studio context so we do not disclose data to the wrong person. Some rights may be limited where law permits or requires retention.",
        },
        {
          type: "link",
          text: "You may also submit a request to the",
          label: "Agency for Personal Data Protection",
          href: "https://azlp.mk/en/citizens/forms-and-services/",
        },
      ],
    },
    {
      id: "children",
      title: "13. Children",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS business accounts are intended for adults. The Service is not intended for a child to create a business account independently. Where a service is booked for a minor, a parent, guardian, or the studio should make the booking and ensure an appropriate legal basis for the data.",
        },
      ],
    },
    {
      id: "automation-marketing",
      title: "14. Automated decisions and marketing",
      blocks: [
        {
          type: "paragraph",
          text: "OPUS does not use data from the current booking flow to make a decision based solely on automated processing that produces legal or similarly significant effects for you. One-time codes, confirmations, and reminders are transactional messages. We do not send marketing without a separate lawful basis and a way to opt out.",
        },
      ],
    },
    {
      id: "changes",
      title: "15. Changes to this Policy",
      blocks: [
        {
          type: "paragraph",
          text: "We may update this Policy when the Service, providers, or law changes. We will change the date at the top and, where a change is material, provide additional notice through the Service or by email when appropriate.",
        },
      ],
    },
    {
      id: "contact",
      title: "16. Privacy questions",
      blocks: [
        {
          type: "paragraph",
          text: "For a privacy question, request, or complaint, email hello@opus.mk or call +389 77 826 333. If the matter concerns a particular studio’s data, include the studio name and enough detail to locate the request without sending unnecessary sensitive information.",
        },
      ],
    },
  ],
};

const documents: Record<Locale, Record<LegalDocumentKind, LegalDocument>> = {
  mk: {
    privacy: mkPrivacy,
    terms: mkTerms,
  },
  en: {
    privacy: enPrivacy,
    terms: enTerms,
  },
};

export function getLegalDocument(
  locale: Locale,
  kind: LegalDocumentKind,
): LegalDocument {
  return documents[locale][kind];
}
