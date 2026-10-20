import type { DashboardLanguage } from "@/lib/i18n/types";
import type { StudioAnalytics } from "@/lib/studio-analytics";

export type AnalyticsReportSection =
  | "summary"
  | "trend"
  | "services"
  | "clients";
export type AnalyticsReportFormat = "csv" | "html";

export interface AnalyticsReportOptions {
  sections: AnalyticsReportSection[];
  includeComparison: boolean;
  language: DashboardLanguage;
}

const reportText = {
  en: {
    title: "Studio analytics",
    period: "Reporting period",
    generated: "Generated",
    studio: "Studio",
    summary: "Overview",
    trend: "Appointment activity",
    services: "Service breakdown",
    clients: "Clients",
    metric: "Metric",
    current: "Selected period",
    previous: "Previous period",
    appointments: "Appointments",
    completed: "Completed",
    cancelled: "Cancelled",
    noShows: "No-shows",
    newClients: "New clients",
    returningClients: "Returning clients",
    activeClients: "Active clients",
    value: "Completed appointment value",
    date: "Date",
    service: "Service",
    visits: "Completed visits",
    name: "Client name",
    firstVisit: "First studio visit",
    lastVisit: "Last visit in period",
    clientType: "Client type",
    newClient: "New",
    returningClient: "Returning",
    averageValue: "Average completed appointment value",
    currency: "Value currency",
    allStaff: "All team members",
    staff: "Team member",
    noData: "No activity in this period.",
    valueNote:
      "Appointment value is the price of completed appointments, not collected revenue. Counts include all currencies; monetary values use the selected currency only.",
    serviceNote:
      "Each service in a completed appointment counts once. Multi-service appointments can contribute to more than one service.",
    printNote:
      "To save as PDF, use your browser’s Print menu and choose Save as PDF.",
    clientNote: "Client figures refer to appointments in the selected period.",
    comparisonNote:
      "Comparison uses the immediately preceding calendar months.",
  },
  mk: {
    title: "Аналитика на студиото",
    period: "Период на извештајот",
    generated: "Генерирано",
    studio: "Студио",
    summary: "Преглед",
    trend: "Активност на термините",
    services: "Преглед по услуги",
    clients: "Клиенти",
    metric: "Показател",
    current: "Избран период",
    previous: "Претходен период",
    appointments: "Термини",
    completed: "Завршени",
    cancelled: "Откажани",
    noShows: "Недоаѓања",
    newClients: "Нови клиенти",
    returningClients: "Повторни клиенти",
    activeClients: "Активни клиенти",
    value: "Вредност на завршени термини",
    date: "Датум",
    service: "Услуга",
    visits: "Завршени посети",
    name: "Име на клиент",
    firstVisit: "Прва посета во студиото",
    lastVisit: "Последна посета во периодот",
    clientType: "Тип на клиент",
    newClient: "Нов",
    returningClient: "Повторен",
    averageValue: "Просечна вредност на завршен термин",
    currency: "Валута за вредноста",
    allStaff: "Сите членови",
    staff: "Член на тимот",
    noData: "Нема активност во овој период.",
    valueNote:
      "Вредноста на термините е цената на завршените термини, а не наплатен приход. Бројките ги вклучуваат сите валути; паричните износи се само во избраната валута.",
    serviceNote:
      "Секоја услуга во завршен термин се брои еднаш. Термините со повеќе услуги може да се бројат во повеќе услуги.",
    printNote:
      "За PDF, отворете Печати во прелистувачот и изберете Зачувај како PDF.",
    clientNote: "Податоците за клиентите се однесуваат на избраниот период.",
    comparisonNote: "Споредбата ги користи непосредно претходните месеци.",
  },
  sq: {
    title: "Analitika e studios",
    period: "Periudha e raportit",
    generated: "Gjeneruar",
    studio: "Studio",
    summary: "Përmbledhje",
    trend: "Aktiviteti i takimeve",
    services: "Ndarja sipas shërbimeve",
    clients: "Klientët",
    metric: "Treguesi",
    current: "Periudha e zgjedhur",
    previous: "Periudha e mëparshme",
    appointments: "Takime",
    completed: "Të përfunduara",
    cancelled: "Të anuluara",
    noShows: "Mosparaqitje",
    newClients: "Klientë të rinj",
    returningClients: "Klientë të rikthyer",
    activeClients: "Klientë aktivë",
    value: "Vlera e takimeve të përfunduara",
    date: "Data",
    service: "Shërbimi",
    visits: "Vizita të përfunduara",
    name: "Emri i klientit",
    firstVisit: "Vizita e parë në studio",
    lastVisit: "Vizita e fundit në periudhë",
    clientType: "Lloji i klientit",
    newClient: "I ri",
    returningClient: "I rikthyer",
    averageValue: "Vlera mesatare e takimeve të përfunduara",
    currency: "Monedha e vlerës",
    allStaff: "Të gjithë anëtarët",
    staff: "Anëtari i ekipit",
    noData: "Nuk ka aktivitet në këtë periudhë.",
    valueNote:
      "Vlera e takimeve është çmimi i takimeve të përfunduara, jo të ardhurat e arkëtuara. Numrat përfshijnë të gjitha monedhat; vlerat monetare përdorin vetëm monedhën e zgjedhur.",
    serviceNote:
      "Çdo shërbim në një takim të përfunduar numërohet një herë. Takimet me disa shërbime mund të kontribuojnë në disa kategori.",
    printNote:
      "Për ta ruajtur si PDF, hapni menynë Printo të shfletuesit dhe zgjidhni Ruaj si PDF.",
    clientNote: "Shifrat e klientëve i referohen periudhës së zgjedhur.",
    comparisonNote: "Krahasimi përdor muajt kalendarikë menjëherë para saj.",
  },
} as const;

const reportLocale: Record<DashboardLanguage, string> = {
  en: "en-GB",
  mk: "mk-MK",
  sq: "sq-AL",
};

/** Quotes every field, protects spreadsheet formulas, and preserves line breaks. */
export function analyticsCsvCell(value: string | number): string {
  const text = String(value);
  const safe =
    typeof value === "string" &&
    (/^[\s\u0000-\u001f\u007f]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text))
      ? `'${text}`
      : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function escapeAnalyticsHtml(value: string | number): string {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

type ReportCell = string | number;
type ReportTable = {
  id: AnalyticsReportSection;
  title: string;
  headers: string[];
  rows: ReportCell[][];
  note?: string;
};

function prepareAnalyticsReport(
  data: StudioAnalytics,
  options: AnalyticsReportOptions,
) {
  if (options.sections.length === 0) {
    throw new Error("Choose at least one report section.");
  }
  const text = reportText[options.language];
  const locale = reportLocale[options.language];
  const number = new Intl.NumberFormat(locale);
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: data.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const money = (minorUnits: number) => currency.format(minorUnits / 100);
  // Booking timestamps use UTC-shaped studio wall time, not browser time.
  const date = (timestamp: number, monthOnly = false) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      ...(monthOnly
        ? { month: "long", year: "numeric" }
        : { day: "numeric", month: "short", year: "numeric" }),
    }).format(timestamp);
  const period = (value: StudioAnalytics["period"]) =>
    value.startMonth === value.endMonth
      ? date(value.startMs, true)
      : `${date(value.startMs, true)} – ${date(value.endMs - 1, true)}`;
  const comparison =
    options.includeComparison && options.sections.includes("summary");
  const metadata: ReportCell[][] = [
    [text.studio, data.studioName],
    [text.period, period(data.period)],
    [
      text.staff,
      data.staff.find((member) => member.id === data.selectedStaffId)?.name ??
        text.allStaff,
    ],
    [text.currency, data.currency],
    [
      text.generated,
      new Intl.DateTimeFormat(locale, {
        timeZone: data.timezone,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(data.generatedAt),
    ],
  ];
  if (comparison) metadata.push([text.previous, period(data.previous.period)]);
  const tables: ReportTable[] = [];
  if (options.sections.includes("summary")) {
    const summaryRows: {
      label: string;
      key: keyof StudioAnalytics["summary"];
      monetary?: boolean;
    }[] = [
      { label: text.appointments, key: "totalAppointments" },
      { label: text.completed, key: "completedVisits" },
      { label: text.activeClients, key: "visitedClients" },
      { label: text.newClients, key: "newClients" },
      { label: text.returningClients, key: "returningClients" },
      { label: text.cancelled, key: "cancelledAppointments" },
      { label: text.noShows, key: "noShowAppointments" },
      {
        label: text.value,
        key: "appointmentValueMinorUnits",
        monetary: true,
      },
      {
        label: text.averageValue,
        key: "averageAppointmentValueMinorUnits",
        monetary: true,
      },
    ];
    tables.push({
      id: "summary",
      title: text.summary,
      headers: [
        text.metric,
        text.current,
        ...(comparison ? [text.previous] : []),
      ],
      rows: summaryRows.map(({ label, key, monetary }) => [
        label,
        monetary ? money(data.summary[key]) : data.summary[key],
        ...(comparison
          ? [
              monetary
                ? money(data.previous.summary[key])
                : data.previous.summary[key],
            ]
          : []),
      ]),
      note: comparison ? text.comparisonNote : undefined,
    });
  }
  if (options.sections.includes("trend")) {
    tables.push({
      id: "trend",
      title: text.trend,
      headers: [text.date, text.appointments, text.completed, text.value],
      rows: data.trend.map((point) => [
        date(point.startAt, data.trendGranularity === "month"),
        point.appointments,
        point.completedVisits,
        money(point.appointmentValueMinorUnits),
      ]),
    });
  }
  if (options.sections.includes("services")) {
    tables.push({
      id: "services",
      title: text.services,
      headers: [text.service, text.visits],
      rows: data.topServices.map((service) => [
        service.name,
        service.completedVisits,
      ]),
      note: text.serviceNote,
    });
  }
  if (options.sections.includes("clients")) {
    tables.push({
      id: "clients",
      title: text.clients,
      headers: [
        text.name,
        text.visits,
        text.value,
        text.clientType,
        text.firstVisit,
        text.lastVisit,
      ],
      rows: data.clients.map((client) => [
        client.name,
        client.visits,
        money(client.appointmentValueMinorUnits),
        client.returning ? text.returningClient : text.newClient,
        date(client.firstVisitAt),
        date(client.lastVisitAt),
      ]),
      note: text.clientNote,
    });
  }
  return {
    text,
    locale,
    number,
    metadata,
    tables,
    period: period(data.period),
  };
}

export function createAnalyticsCsv(
  data: StudioAnalytics,
  options: AnalyticsReportOptions,
): string {
  const report = prepareAnalyticsReport(data, options);
  const rows: ReportCell[][] = [
    [report.text.title],
    ...report.metadata,
    [report.text.valueNote],
  ];
  for (const table of report.tables) {
    rows.push([], [table.title], table.headers, ...table.rows);
    if (table.note) rows.push([table.note]);
    if (!table.rows.length) rows.push([report.text.noData]);
  }
  // Excel uses this BOM to recognize UTF-8 client names and Macedonian text.
  return `\uFEFF${rows.map((row) => row.map(analyticsCsvCell).join(",")).join("\r\n")}\r\n`;
}

export function createAnalyticsHtml(
  data: StudioAnalytics,
  options: AnalyticsReportOptions,
): string {
  const report = prepareAnalyticsReport(data, options);
  const escape = escapeAnalyticsHtml;
  const tables = report.tables
    .map(
      (table) => `<section aria-labelledby="${table.id}">
  <h2 id="${table.id}">${escape(table.title)}</h2>
  ${table.note ? `<p class="caption">${escape(table.note)}</p>` : ""}
  <div class="table-wrap"><table>
    <thead><tr>${table.headers.map((header) => `<th scope="col">${escape(header)}</th>`).join("")}</tr></thead>
    <tbody>${
      table.rows.length
        ? table.rows
            .map(
              (row) =>
                `<tr>${row
                  .map(
                    (value, index) =>
                      `<${index === 0 ? 'th scope="row"' : "td"}>${escape(typeof value === "number" ? report.number.format(value) : value)}</${index === 0 ? "th" : "td"}>`,
                  )
                  .join("")}</tr>`,
            )
            .join("")
        : `<tr><td colspan="${table.headers.length}" class="empty">${escape(report.text.noData)}</td></tr>`
    }</tbody>
  </table></div>
</section>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="${escape(options.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escape(data.studioName)} · ${escape(report.text.title)} · ${escape(report.period)}</title>
<style>
:root{color-scheme:light;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172922;background:#f3f5f2}
*{box-sizing:border-box}body{margin:0;padding:40px 24px}main{max-width:1040px;margin:auto;background:white;padding:56px;border-radius:24px}
.brand{font-size:14px;letter-spacing:.16em;font-weight:750;color:#487058}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#64746a;margin-top:36px}
h1{font-size:38px;line-height:1.1;letter-spacing:-.04em;margin:10px 0 12px;overflow-wrap:anywhere}.period{font-size:20px;color:#64746a;margin:0}
.metadata{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 32px;border-top:1px solid #e0e7df;margin:32px 0 0;padding-top:24px}
dt{font-size:12px;color:#64746a;margin-bottom:5px}dd{margin:0;font-size:14px;overflow-wrap:anywhere}.notice{background:#f1f5ef;color:#405746;padding:16px 20px;font-size:12px;line-height:1.6;border-radius:12px;margin:28px 0}
section{margin-top:38px}h2{font-size:20px;letter-spacing:-.02em;margin:0 0 14px}.caption{font-size:12px;line-height:1.6;color:#64746a;margin:0 0 14px}
.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:12px}thead{background:#eef3eb}th,td{text-align:right;padding:12px 10px;border-bottom:1px solid #e8ece6;vertical-align:top;font-variant-numeric:tabular-nums}th:first-child,td:first-child{text-align:left;overflow-wrap:anywhere}thead th{font-weight:600;color:#405746}tbody th{font-weight:500}tbody tr:last-child>*{border-bottom:0}.empty{text-align:left;color:#64746a}
footer{border-top:1px solid #e0e7df;margin-top:40px;padding-top:20px;color:#64746a;font-size:12px;line-height:1.6}
@media(max-width:640px){body{padding:12px}main{padding:24px;border-radius:16px}h1{font-size:30px}.metadata{grid-template-columns:1fr}th,td{padding:10px 8px}}
@media print{@page{size:A4;margin:15mm}body{background:white;padding:0}main{max-width:none;padding:0;border-radius:0}h1{font-size:30px}.print-help{display:none}section{margin-top:26px}h2,.caption{break-after:avoid}thead{display:table-header-group}tr{break-inside:avoid}.table-wrap{overflow:visible}table{font-size:10px}th,td{padding:8px 6px}.metadata{grid-template-columns:repeat(2,minmax(0,1fr))}.notice{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style>
</head>
<body><main>
<div class="brand">OPUS</div>
<p class="eyebrow">${escape(report.text.title)}</p>
<h1>${escape(data.studioName)}</h1>
<p class="period">${escape(report.period)}</p>
<dl class="metadata">${report.metadata.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl>
<p class="notice">${escape(report.text.valueNote)}</p>
${tables}
<footer><span class="print-help">${escape(report.text.printNote)}</span></footer>
</main></body></html>`;
}

export function createAnalyticsReport(
  data: StudioAnalytics,
  options: AnalyticsReportOptions,
  format: AnalyticsReportFormat,
) {
  // Filenames intentionally exclude studio/client input.
  const range = `${data.period.startMonth}-${data.period.endMonth}`.replace(
    /[^0-9-]/g,
    "",
  );
  return {
    content:
      format === "csv"
        ? createAnalyticsCsv(data, options)
        : createAnalyticsHtml(data, options),
    mimeType:
      format === "csv" ? "text/csv;charset=utf-8" : "text/html;charset=utf-8",
    fileName: `opus-analytics-${range}.${format}`,
  };
}
