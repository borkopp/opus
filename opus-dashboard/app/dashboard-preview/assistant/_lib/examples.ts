import type {
  AnalystAnswer,
  AnalystReport,
  Metric,
  ReportRow,
} from "@/convex/analyst/contracts";
import type { AssistantTurn } from "@/components/business-assistant/ConversationPanel";
import type { Id } from "@/convex/_generated/dataModel";
import { analystMetricLabels } from "@/lib/i18n/business-assistant";

export type PreviewLanguage = "en" | "mk";
export type PreviewExample = {
  id: string;
  label: string;
  group: "Templates" | "More metrics" | "Edge cases" | "Conversation";
  description: string;
  turn: AssistantTurn;
  loading?: boolean;
  empty?: boolean;
};

// Fixed, fictional snapshots. No tenant records, provider calls, or database writes.
const startMs = Date.UTC(2026, 8, 1);
const endMs = Date.UTC(2026, 9, 1);
const asOf = Date.UTC(2026, 9, 1, 8);

const metrics = {
  completed_value: { unit: "money", value: 26400000, previous: 23100000 },
  appointments: { unit: "count", value: 180, previous: 164 },
  completed_appointments: { unit: "count", value: 160, previous: 142 },
  cancellations: { unit: "count", value: 12, previous: 16 },
  no_shows: { unit: "count", value: 8, previous: 6 },
  cancellation_rate: { unit: "percent", value: 6.67, previous: 9.76 },
  no_show_rate: { unit: "percent", value: 4.76, previous: 4.05 },
  utilisation: { unit: "percent", value: 71.43, previous: 64.55 },
  returning_client_share: { unit: "percent", value: 60, previous: 55 },
  returning_clients: { unit: "count", value: 72, previous: 66 },
} satisfies Record<
  Metric,
  { unit: AnalystReport["unit"]; value: number; previous: number }
>;

function row(
  label: string,
  value: number | null,
  overrides: Partial<ReportRow> = {},
): ReportRow {
  return {
    label,
    value,
    appointments: 180,
    completed: 160,
    cancelled: 12,
    noShows: 8,
    bookedMinutes: 7200,
    availableMinutes: 10080,
    completedValueMinor: 26400000,
    observedDays: 26,
    ...overrides,
  };
}

function report(metric: Metric, language: PreviewLanguage): AnalystReport {
  const spec = metrics[metric];
  const warnings =
    metric === "completed_value"
      ? ["appointment_value_not_payments"]
      : metric.startsWith("returning_")
        ? ["recorded_history_only"]
        : [];
  // Service groups sum for counts and money; rate rows use their own denominators.
  const counts: Record<string, number[]> = {
    appointments: [76, 60, 44],
    completed_appointments: [70, 52, 38],
    cancellations: [4, 5, 3],
    no_shows: [2, 3, 3],
    completed_value: [12600000, 7800000, 6000000],
    returning_clients: [34, 24, 14],
    cancellation_rate: [5.26, 8.33, 6.82],
    no_show_rate: [2.78, 5.45, 7.32],
    utilisation: [75, 65, 73.08],
    returning_client_share: [65.38, 60, 50],
  };
  const labels =
    metric === "utilisation"
      ? ["Ana", "Elena", "Sara"]
      : language === "mk"
        ? ["Маникир", "Потстрижување и фенирање", "Обликување веѓи"]
        : ["Manicure", "Cut and blow-dry", "Brow shaping"];
  return {
    key: metric,
    request: {
      metric,
      groupBy: metric === "utilisation" ? "staff" : "service",
      period: { preset: "last_month", startDate: null, endDate: null },
      comparison: "previous_period",
      staffName: null,
      serviceName: null,
    },
    startMs,
    endMs,
    asOf,
    timezone: "Europe/Skopje",
    currency: "MKD",
    unit: spec.unit,
    total: row("Total", spec.value),
    rows: labels.map((label, index) =>
      row(label, counts[metric][index], {
        appointments: [76, 60, 44][index],
        completed: [70, 52, 38][index],
        cancelled: [4, 5, 3][index],
        noShows: [2, 3, 3][index],
        bookedMinutes: [3150, 2340, 1710][index],
        availableMinutes: [4200, 3600, 2340][index],
        completedValueMinor: [12600000, 7800000, 6000000][index],
      }),
    ),
    previous: {
      startMs: Date.UTC(2026, 7, 1),
      endMs: startMs,
      total: row("Total", spec.previous, {
        appointments: 164,
        completed: 142,
        cancelled: 16,
        noShows: 6,
        bookedMinutes: 6390,
        availableMinutes: 9900,
        completedValueMinor: 23100000,
      }),
      currency: "MKD",
    },
    changePercent: ((spec.value - spec.previous) / spec.previous) * 100,
    warnings,
  };
}

function turn(
  id: string,
  reports: AnalystReport[],
  language: PreviewLanguage,
  answer?: Partial<AnalystAnswer>,
): AssistantTurn {
  const mk = language === "mk";
  const title = reports[0]
    ? analystMetricLabels[reports[0].request.metric][language]
    : "";
  return {
    _id: `sample-${id}` as Id<"analyst_turns">,
    question: mk
      ? `Покажи ми преглед за минатиот месец${title ? `: ${title.toLowerCase()}` : ""}.`
      : `Show me last month's overview${title ? `: ${title.toLowerCase()}` : ""}.`,
    depth: "standard",
    status: "completed",
    errorCode: undefined,
    createdAt: asOf,
    reports,
    answer: {
      text: mk
        ? "Ова се резултатите за септември според евидентираните термини."
        : "Here are September's results, based on recorded appointments.",
      reportKeys: reports.map((item) => item.key),
      recommendations: [],
      followUps: [],
      ...answer,
    },
  };
}

export function getExamples(language: PreviewLanguage): PreviewExample[] {
  const mk = language === "mk";
  const text = (en: string, translated: string) => (mk ? translated : en);
  const standalone = (item: AnalystReport): AnalystReport => ({
    ...item,
    request: { ...item.request, comparison: null },
    previous: null,
    changePercent: null,
  });
  const totalOnly = (item: AnalystReport): AnalystReport => ({
    ...item,
    request: { ...item.request, groupBy: "total" },
    rows: [],
  });
  const questions: Record<Metric, string> = {
    completed_value: text(
      "Compare September's completed appointment value with August.",
      "Спореди ја вредноста на завршените термини во септември со август.",
    ),
    appointments: text(
      "How many appointments did we have in September?",
      "Колку термини имавме во септември?",
    ),
    completed_appointments: text(
      "Which services had the most completed appointments?",
      "Кои услуги имаа најмногу завршени термини?",
    ),
    cancellations: text(
      "Which services had the most cancellations in September?",
      "Кои услуги имаа најмногу откажувања во септември?",
    ),
    no_shows: text(
      "How many clients did not show up in September?",
      "Колку клиенти не се појавија во септември?",
    ),
    cancellation_rate: text(
      "What share of September's appointments were cancelled?",
      "Колкав дел од термините во септември беа откажани?",
    ),
    no_show_rate: text(
      "What was our no-show rate in September?",
      "Колкава беше стапката на непојавувања во септември?",
    ),
    utilisation: text(
      "Which team member had the highest booked capacity?",
      "Кој член на тимот имаше највисок пополнет капацитет?",
    ),
    returning_client_share: text(
      "What share of September's clients had visited before?",
      "Колкав дел од клиентите во септември имале претходна посета?",
    ),
    returning_clients: text(
      "How many returning clients did we have in September?",
      "Колку повратни клиенти имавме во септември?",
    ),
  };
  const primaryMetrics: Partial<
    Record<Metric, { label: string; description: string }>
  > = {
    appointments: {
      label: "Quick number",
      description: "One question, one headline number.",
    },
    completed_value: {
      label: "Period comparison",
      description: "Current and previous values with a clear change.",
    },
    completed_appointments: {
      label: "Ranked services",
      description: "The leading service first, followed by a short ranking.",
    },
    returning_client_share: {
      label: "Percentage / share",
      description: "A proportion and its meaning, without unrelated totals.",
    },
  };
  const examples: PreviewExample[] = (Object.keys(metrics) as Metric[]).map(
    (metric) => {
      let item = report(metric, language);
      if (metric !== "completed_value") item = standalone(item);
      if (
        !["completed_appointments", "cancellations", "utilisation"].includes(
          metric,
        )
      ) {
        item = totalOnly(item);
      }
      const primary = primaryMetrics[metric];
      return {
        id: item.key,
        label: primary?.label ?? analystMetricLabels[metric].en,
        group: primary ? "Templates" : "More metrics",
        description:
          primary?.description ??
          `${item.unit} · ${item.request.groupBy === "total" ? "single metric" : `${item.request.groupBy} ranking`}`,
        turn: {
          ...turn(item.key, [item], language),
          question: questions[metric],
        },
      };
    },
  );
  const add = (
    id: string,
    label: string,
    description: string,
    reports: AnalystReport[],
    answer?: Partial<AnalystAnswer>,
    options?: { group?: PreviewExample["group"]; question?: string },
  ) => {
    examples.push({
      id,
      label,
      description,
      group: options?.group ?? "Edge cases",
      turn: {
        ...turn(id, reports, language, answer),
        ...(options?.question ? { question: options.question } : {}),
      },
    });
  };
  const completed = report("completed_value", language);
  const appointments = report("appointments", language);
  const returningShare = totalOnly(
    standalone(report("returning_client_share", language)),
  );

  add(
    "recommendations",
    "Recommended next step",
    "One supported finding, one experiment, and a way to measure it.",
    [returningShare],
    {
      text: text(
        "60% of September's clients had a previous completed visit. You could test a simple rebooking prompt to see whether more clients return.",
        "60% од клиентите во септември имале претходна завршена посета. Може да пробате едноставна покана за повторно закажување и да проверите дали повеќе клиенти ќе се вратат.",
      ),
      recommendations: [
        {
          suggestion: text(
            "Try a clearer rebooking prompt at the end of each visit.",
            "Обидете се со појасна покана за повторно закажување по секоја посета.",
          ),
          evidence: text(
            "72 of 120 clients had a previous completed visit in the recorded history.",
            "72 од 120 клиенти имале претходна завршена посета во евидентираната историја.",
          ),
          measurement: text(
            "Compare returning-client share next month alongside total completed visits.",
            "Споредете го уделот на повратни клиенти следниот месец заедно со вкупниот број завршени посети.",
          ),
          reportKeys: [returningShare.key],
        },
      ],
      followUps: [text("Compare with August", "Спореди со август")],
    },
    {
      group: "Templates",
      question: text(
        "What could we try to encourage clients to return?",
        "Што може да пробаме за клиентите повторно да се вратат?",
      ),
    },
  );
  add(
    "empty-report",
    "No recorded appointments",
    "A useful empty state when there is no activity to report.",
    [
      {
        ...totalOnly(standalone(appointments)),
        rows: [],
        previous: null,
        changePercent: null,
        total: row("Total", 0, {
          appointments: 0,
          completed: 0,
          cancelled: 0,
          noShows: 0,
          bookedMinutes: 0,
          completedValueMinor: 0,
        }),
        warnings: ["small_sample"],
      },
    ],
    {
      text: text(
        "There are no recorded appointments for this period. Try a wider date range.",
        "Нема евидентирани термини за овој период. Обидете се со поширок временски опсег.",
      ),
    },
    {
      group: "Templates",
      question: text(
        "How many appointments did we have in September?",
        "Колку термини имавме во септември?",
      ),
    },
  );
  const capacity = report("utilisation", language);
  add(
    "unavailable",
    "Insufficient data",
    "Explain what is missing without presenting it as zero.",
    [
      {
        ...standalone(capacity),
        total: { ...capacity.total, value: null, availableMinutes: null },
        rows: capacity.rows.map((item) => ({
          ...item,
          value: null,
          availableMinutes: null,
        })),
        previous: null,
        changePercent: null,
        warnings: ["historical_capacity_unavailable"],
      },
    ],
    {
      text: text(
        "I cannot calculate September's capacity because historical working hours are unavailable.",
        "Не можам да го пресметам капацитетот за септември бидејќи нема историја на работното време.",
      ),
    },
    {
      group: "Templates",
      question: text(
        "How much of our working time was booked in September?",
        "Колкав дел од работното време беше пополнет во септември?",
      ),
    },
  );
  add(
    "multiple-reports",
    "Mixed response templates",
    "Comparison + ranking, with a visible warning from a collapsed supporting report.",
    [
      totalOnly(completed),
      {
        ...standalone(report("completed_appointments", language)),
        warnings: ["combined_services"],
      },
    ],
    {
      text: text(
        "Completed appointment value increased by 14.3% from August. Manicure had the most completed visits in September.",
        "Вредноста на завршените термини се зголеми за 14,3% во однос на август. Маникирот имаше најмногу завршени посети во септември.",
      ),
    },
    {
      question: text(
        "Compare appointment value with August, and show which services had the most completed visits.",
        "Спореди ја вредноста на термините со август, и покажи кои услуги имаа најмногу завршени посети.",
      ),
    },
  );
  add(
    "mixed-currencies",
    "Mixed currencies",
    "Unavailable money totals and currency warnings.",
    [
      {
        ...completed,
        currency: null,
        total: { ...completed.total, value: null, completedValueMinor: null },
        rows: completed.rows.map((item) => ({
          ...item,
          value: null,
          completedValueMinor: null,
        })),
        changePercent: null,
        warnings: ["mixed_currencies", "appointment_value_not_payments"],
      },
    ],
  );
  add(
    "currency-comparison",
    "Different comparison currency",
    "MKD current period beside a separate EUR previous period.",
    [
      {
        ...completed,
        previous: {
          ...completed.previous!,
          currency: "EUR",
          total: {
            ...completed.previous!.total,
            value: 375000,
            completedValueMinor: 375000,
          },
        },
        changePercent: null,
        warnings: [
          "comparison_currency_mismatch",
          "appointment_value_not_payments",
        ],
      },
    ],
  );
  add(
    "long-report",
    "Trend over time",
    "Daily movement across a month, with the underlying rows available.",
    [
      {
        ...standalone(appointments),
        request: {
          ...appointments.request,
          groupBy: "day",
          comparison: null,
        },
        rows: Array.from({ length: 30 }, (_, index) =>
          row(
            `2026-09-${String(index + 1).padStart(2, "0")}`,
            4 + (index % 5),
            {
              appointments: 4 + (index % 5),
              completed: 4 + (index % 5),
              cancelled: 0,
              noShows: 0,
              observedDays: 1,
            },
          ),
        ),
        total: row("Total", 180, { completed: 180, cancelled: 0, noShows: 0 }),
      },
    ],
    {
      text: text(
        "Daily appointments ranged from 4 to 8 during September, with 180 appointments in total.",
        "Дневниот број на термини во септември се движеше од 4 до 8, со вкупно 180 термини.",
      ),
    },
    {
      group: "Templates",
      question: text(
        "Show me the daily appointment trend for September.",
        "Покажи го дневниот тренд на термини за септември.",
      ),
    },
  );
  add(
    "long-labels",
    "Long labels + filters",
    "Combined service names, staff/service filters, and wrapping.",
    [
      {
        ...completed,
        request: {
          ...completed.request,
          staffName: "Ana Petrovska",
          serviceName: text(
            "Colour correction, treatment and styling",
            "Корекција на боја, третман и стилизирање",
          ),
        },
        rows: [
          {
            ...completed.total,
            label: text(
              "Colour correction, intensive repair treatment, cut and occasion styling — long hair",
              "Корекција на боја, интензивен третман за обновување, потстрижување и свечена фризура — долга коса",
            ),
          },
        ],
        warnings: ["combined_services", "appointment_value_not_payments"],
      },
    ],
  );
  add(
    "weekday",
    "Weakest day",
    "A lowest-first ranking using averages per observed day.",
    [
      {
        ...standalone(appointments),
        request: {
          ...appointments.request,
          groupBy: "weekday",
          comparison: null,
        },
        rows: (mk
          ? [
              "Понеделник",
              "Вторник",
              "Среда",
              "Четврток",
              "Петок",
              "Сабота",
              "Недела",
            ]
          : [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ]
        ).map((label, index) =>
          row(label, [4, 3, 6, 7, 8, 9, null][index], {
            observedDays: index === 6 ? 0 : [4, 5, 5, 4, 4, 4][index],
            appointments: [16, 15, 30, 28, 32, 36, 0][index],
            completed: [14, 13, 27, 25, 29, 32, 0][index],
            cancelled: [2, 2, 3, 3, 3, 4, 0][index],
            noShows: 0,
          }),
        ),
        total: row("Total", 157, {
          appointments: 157,
          completed: 140,
          cancelled: 17,
          noShows: 0,
        }),
        warnings: ["weekday_average"],
      },
    ],
    {
      text: text(
        "Tuesday was the quietest observed day, averaging 3 appointments. Sunday has no observed working days, so it is not part of the ranking.",
        "Вторник беше најтивкиот евидентиран ден, со просечно 3 термини. Недела нема евидентирани работни денови и не е вклучена во рангирањето.",
      ),
    },
    {
      group: "Templates",
      question: text(
        "Which day was weakest for appointments in September?",
        "Кој ден беше најслаб според бројот на термини во септември?",
      ),
    },
  );
  add(
    "warnings",
    "Incomplete period + warnings",
    "Multiple caveats and a partially unavailable chart.",
    [
      {
        ...capacity,
        startMs: Date.UTC(2026, 9, 1),
        endMs: Date.UTC(2026, 9, 21),
        asOf: Date.UTC(2026, 9, 20, 9),
        previous: null,
        changePercent: null,
        request: {
          ...capacity.request,
          period: { preset: "this_month", startDate: null, endDate: null },
          comparison: null,
        },
        total: { ...capacity.total, value: null, availableMinutes: null },
        rows: capacity.rows.map((item, index) => ({
          ...item,
          value: index === 0 ? 112 : null,
          availableMinutes: index === 0 ? 2812.5 : null,
        })),
        warnings: [
          "includes_current_or_future_day",
          "small_sample",
          "historical_capacity_unavailable",
          "unresolved_appointments",
          "capacity_exceeded",
        ],
      },
    ],
  );
  const plain = turn("text-only", [], language, {
    text: text(
      "I can help you understand appointments, cancellations, returning clients and recorded working capacity.\n\nI cannot calculate profit from appointment prices alone. Expenses, refunds and collected payments are not available in these reports.",
      "Можам да ви помогнам да ги разберете термините, откажувањата, повратните клиенти и евидентираниот работен капацитет.\n\nНе можам да пресметам добивка само од цените на термините. Трошоците, рефундирањата и наплатените средства не се достапни во овие извештаи.",
    ),
    followUps: [
      text(
        "Show completed appointment value",
        "Покажи вредност на завршените термини",
      ),
    ],
  });
  examples.push({
    id: "text-only",
    label: "Text-only answer",
    description: "Paragraphs and follow-up buttons without a report.",
    group: "Conversation",
    turn: plain,
  });
  const streamingTurn =
    examples.find((example) => example.id === "appointments")?.turn ?? plain;
  examples.push({
    id: "streaming",
    label: "Streaming answer",
    description:
      "Live text arriving in chunks, followed by the validated report.",
    group: "Conversation",
    turn: {
      ...streamingTurn,
      answer: {
        ...streamingTurn.answer!,
        followUps: [
          text("Compare with last month", "Спореди со претходниот месец"),
          text(
            "Which services had the most appointments?",
            "Кои услуги имаа најмногу термини?",
          ),
          text(
            "Show cancellation trends",
            "Покажи ги трендовите на откажување",
          ),
        ],
        text: text(
          "Your studio had **180 appointments in September**. This includes all recorded appointment statuses, including cancellations and no-shows. The report below shows the total for the month.\n\nFor a closer look:\n- Compare September with the previous month to see how appointment activity changed.\n- Look at your most-booked services to understand where demand was strongest.\n- Review cancellations separately before deciding which empty slots to promote.\n\nThese figures describe the appointments recorded in your calendar. They do not tell us how much money was collected, whether every client attended, or which costs the studio paid. Keep those distinctions in mind when planning your next steps.\n\nStart with a month-to-month comparison, then explore the services behind the change. Open the full report below to check the recorded figures and the period included in this answer.",
          "Вашето студио имаше **180 термини во септември**. Ова ги вклучува сите евидентирани статуси, вклучувајќи откажувања и непојавувања. Извештајот подолу го покажува вкупниот број за месецот.\n\nЗа подетален преглед:\n- Споредете го септември со претходниот месец за да видите како се променила активноста.\n- Погледнете кои услуги имале најмногу резервации за подобро да ја разберете побарувачката.\n- Разгледајте ги откажувањата одделно пред да одлучите кои слободни термини да ги промовирате.\n\nОвие бројки ги опишуваат термините евидентирани во вашиот календар. Тие не покажуваат колку пари се наплатени, дали секој клиент дошол или кои трошоци ги платило студиото. Имајте ги предвид овие разлики кога ги планирате следните чекори.\n\nЗапочнете со споредба по месеци, а потоа разгледајте ги услугите зад промената. Отворете го целиот извештај подолу за да ги проверите евидентираните бројки и периодот опфатен во одговорот.",
        ),
      },
    },
  });
  examples.push({
    ...examples.find((example) => example.id === "streaming")!,
    id: "streaming-free",
    label: "Streaming · Free plan",
    description:
      "The same streaming experience, with Detailed mode locked on Free.",
  });
  for (const status of ["pending", "running", "failed"] as const) {
    examples.push({
      id: status,
      label:
        status === "failed"
          ? "Failed analysis"
          : status === "pending"
            ? "Queued analysis"
            : "Running analysis",
      description:
        status === "failed"
          ? "Error message and Ask again action."
          : "The real assistant's progress indicator.",
      group: "Conversation",
      turn: { ...plain, status, answer: undefined },
    });
  }
  examples.push(
    {
      id: "loading",
      label: "Loading conversation",
      description: "Skeletons while saved messages load.",
      group: "Conversation",
      turn: plain,
      loading: true,
    },
    {
      id: "new-chat",
      label: "New conversation",
      description: "Empty state and suggested questions.",
      group: "Conversation",
      turn: plain,
      empty: true,
    },
  );
  const templateOrder = [
    "appointments",
    "completed_value",
    "long-report",
    "completed_appointments",
    "returning_client_share",
    "weekday",
    "recommendations",
    "empty-report",
    "unavailable",
  ];
  return examples.sort((a, b) => {
    const aIndex = templateOrder.indexOf(a.id);
    const bIndex = templateOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

export function getExample(id: string, language: PreviewLanguage) {
  const examples = getExamples(language);
  return examples.find((example) => example.id === id) ?? examples[0];
}
