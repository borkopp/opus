"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Loader2,
  Terminal,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

type IntervalReport = {
  startAt: number;
  endAt: number;
  durationMins: number;
  leftBoundary: string;
  rightBoundary: string;
  classification: string;
};

type FunnelReport = {
  thresholds: {
    minTotalVisits: number;
    recencyWindowDays: number;
    topN: number;
  };
  totalCustomers: number;
  passedOptIn: number;
  passedNotErased: number;
  passedHasChannel: number;
  passedRegular: number;
  passedRecency: number;
  finalCount: number;
};

type StaffReport = {
  staffId: string;
  staffName: string;
  status: "scanned" | "day_off" | "no_working_hours" | "past_workday";
  workingWindow: { startAt: number; endAt: number } | null;
  bookingCount: number;
  breakCount: number;
  intervals: IntervalReport[];
  gapsDetected: number;
  candidateFunnel: FunnelReport | null;
  draftsCreated: number;
};

type ScanResult = {
  serviceDate: string;
  timezone: string;
  thresholds: {
    minGapMins: number;
    minGapSource: string;
    bufferTimeMins: number;
  };
  totals: {
    staffAnalyzed: number;
    totalFreeIntervals: number;
    gapsFound: number;
    messageDraftsCreated: number;
  };
  staffReports: StaffReport[];
};

// Booking timestamps are stored as pseudo-UTC (org local time encoded as UTC ms).
// Read UTC components to recover the intended wall-clock label.
function fmt(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function boundaryLabel(
  source: string,
  t: (en: string, mk: string) => string,
): string {
  switch (source) {
    case "workingStart":
      return t("Workday start", "Почеток на работно време");
    case "workingEnd":
      return t("Workday end", "Крај на работно време");
    case "booking":
      return t("Booking", "Термин");
    case "break":
      return t("Break", "Пауза");
    case "now":
      return t("Now", "Сега");
    default:
      return source;
  }
}

function classificationMeta(
  c: string,
  t: (en: string, mk: string) => string,
): { label: string; color: string } {
  switch (c) {
    case "interior_gap":
      return {
        label: t("Interior gap", "Внатрешна празнина"),
        color: "text-success bg-success/10 border-success/30",
      };
    case "below_threshold":
      return {
        label: t("Below threshold", "Под прагот"),
        color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      };
    case "edge_of_day":
      return {
        label: t("Edge of day", "Раб на денот"),
        color: "text-muted-foreground bg-muted/50 border-border",
      };
    case "now_bounded":
      return {
        label: t("Bounded by now", "Ограничено со сега"),
        color: "text-primary bg-primary/10 border-primary/20",
      };
    case "past_workday":
      return {
        label: t("Past workday", "Поминато работно време"),
        color: "text-muted-foreground bg-muted/50 border-border",
      };
    default:
      return {
        label: c,
        color: "text-muted-foreground bg-muted/50 border-border",
      };
  }
}

function staffStatusMeta(
  s: StaffReport["status"],
  t: (en: string, mk: string) => string,
): { label: string; icon: ReactElement } {
  switch (s) {
    case "day_off":
      return {
        label: t("Day off", "Слободен ден"),
        icon: <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />,
      };
    case "no_working_hours":
      return {
        label: t("No availability rule", "Нема правило за достапност"),
        icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
      };
    case "past_workday":
      return {
        label: t("Workday already ended", "Работното време е завршено"),
        icon: <Clock className="w-3.5 h-3.5 text-muted-foreground" />,
      };
    case "scanned":
    default:
      return {
        label: t("Scanned", "Скенирано"),
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-success" />,
      };
  }
}

export function GapOptimizerHeader({ orgId }: { orgId: string }) {
  const { t } = useDashboardI18n();
  const scanDayForOrg = useAction(api.ai.gapOptimizer.scanDayForOrg);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const results = await scanDayForOrg({
        orgId: orgId as Id<"orgs">,
        detectedBy: "manual_scan",
      });
      if (results) setScanResults(results as ScanResult);
      toast.success(t("Scan completed", "Скенирањето е завршено"));
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("Failed to scan", "Неуспешно скенирање"),
      );
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {t("Fill Gaps", "Пополни празни термини")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "AI discovers gaps in your schedule and drafts outreach messages to your best customers.",
              "AI открива празнини во вашиот распоред и подготвува пораки за вашите редовни клиенти.",
            )}
          </p>
        </div>
        <div>
          <Button
            onClick={handleScan}
            disabled={isScanning}
            className="w-full transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none sm:w-auto"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isScanning
              ? t("Scanning...", "Се скенира...")
              : t("Scan today", "Скенирај денес")}
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {scanResults && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="mt-2 overflow-hidden"
          >
            <div className="bg-card text-card-foreground rounded-xl p-5 border border-border text-xs sm:text-sm shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <div className="flex items-center gap-2 text-foreground font-semibold tracking-wider uppercase text-xs font-mono">
                  <Terminal className="w-4 h-4 text-primary" />
                  {t("Scan Diagnostics", "Дијагностика на скенирање")}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScanResults(null)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                  aria-label={t("Close diagnostics", "Затвори дијагностика")}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 font-sans">
                <Stat
                  label={t("Date", "Датум")}
                  value={scanResults.serviceDate}
                  hint={scanResults.timezone}
                />
                <Stat
                  label={t("Min gap", "Мин. празнина")}
                  value={`${scanResults.thresholds.minGapMins}${t("m", "м")}`}
                  hint={`${t("from", "од")} ${scanResults.thresholds.minGapSource}`}
                />
                <Stat
                  label={t("Buffer", "Бафер")}
                  value={`${scanResults.thresholds.bufferTimeMins}${t("m", "м")}`}
                  hint={t(
                    "appended after each booking",
                    "додадено по секој термин",
                  )}
                />
                <Stat
                  label={t("Gaps found", "Најдени празнини")}
                  value={String(scanResults.totals.gapsFound)}
                  hint={`${scanResults.totals.messageDraftsCreated} ${scanResults.totals.messageDraftsCreated === 1 ? t("draft", "нацрт") : t("drafts", "нацрти")}`}
                  highlight={scanResults.totals.gapsFound > 0}
                />
              </div>

              {scanResults.staffReports.length === 0 && (
                <EmptyDiagnostic
                  title={t(
                    "No active staff to scan",
                    "Нема активен персонал за скенирање",
                  )}
                  body={t(
                    "Add or activate staff members with availability rules to enable gap detection.",
                    "Додајте или активирајте членови на персоналот со правила за достапност за да овозможите откривање празнини.",
                  )}
                />
              )}

              {scanResults.totals.gapsFound === 0 &&
                scanResults.staffReports.length > 0 && (
                  <ZeroGapsSummary reports={scanResults.staffReports} />
                )}

              <div className="flex flex-col gap-2 font-sans">
                {scanResults.staffReports.map((r) => (
                  <StaffRow key={r.staffId} report={r} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-muted/40 border border-border rounded-lg px-3.5 py-2.5">
      <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "text-base font-semibold font-display mt-0.5",
          highlight ? "text-success" : "text-foreground",
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-muted-foreground/80 mt-0.5">
          {hint}
        </div>
      )}
    </div>
  );
}

function EmptyDiagnostic({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3.5 text-muted-foreground font-sans">
      <div className="text-foreground font-semibold text-sm">{title}</div>
      <div className="text-xs mt-1 leading-relaxed">{body}</div>
    </div>
  );
}

function ZeroGapsSummary({ reports }: { reports: StaffReport[] }) {
  const { t } = useDashboardI18n();
  const totalBookings = reports.reduce((a, r) => a + r.bookingCount, 0);
  const scannedStaff = reports.filter((r) => r.status === "scanned").length;
  const dayOff = reports.filter((r) => r.status === "day_off").length;
  const noRules = reports.filter((r) => r.status === "no_working_hours").length;
  const past = reports.filter((r) => r.status === "past_workday").length;

  let headline = t(
    "No interior gaps today.",
    "Нема внатрешни празнини денес.",
  );
  let explainer = t(
    "Every free interval was at the edges of the workday or already past.",
    "Секој слободен интервал беше на почетокот/крајот на работниот ден или е веќе поминат.",
  );
  if (totalBookings === 0 && scannedStaff > 0) {
    headline = t(
      "No bookings on the schedule today.",
      "Нема закажани термини денес.",
    );
    explainer = t(
      "The 'Fill Gaps' optimizer only finds dead zones between existing appointments. With an empty schedule, there's nothing to fill between.",
      "Оптимизаторот на празни термини наоѓа само празнини помеѓу постоечки термини. Со празен распоред, нема што да се пополни.",
    );
  } else if (scannedStaff === 0 && dayOff + noRules + past > 0) {
    headline = t(
      "No staff were available to scan today.",
      "Немаше достапен персонал за скенирање денес.",
    );
    explainer = `${dayOff} ${dayOff === 1 ? t("day off", "слободен ден") : t("days off", "слободни денови")}, ${noRules} ${t("without availability rules", "без правила за достапност")}, ${past} ${t("past workday", "поминато работно време")}.`;
  }

  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3.5 mb-3 font-sans">
      <div className="text-foreground font-semibold text-sm">{headline}</div>
      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
        {explainer}
      </div>
    </div>
  );
}

function StaffRow({ report }: { report: StaffReport }) {
  const { language, t } = useDashboardI18n();
  const [open, setOpen] = useState(false);
  const status = staffStatusMeta(report.status, t);

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {status.icon}
          <span className="font-semibold text-sm text-foreground truncate">
            {report.staffName}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
          {report.workingWindow && (
            <span className="hidden sm:inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {fmt(report.workingWindow.startAt)}–
              {fmt(report.workingWindow.endAt)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            {report.bookingCount}{" "}
            {report.bookingCount === 1
              ? t("booking", "термин")
              : t("bookings", "термини")}{" "}
            · {report.breakCount}{" "}
            {report.breakCount === 1
              ? t("break", "пауза")
              : t("breaks", "паузи")}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold",
              report.gapsDetected > 0
                ? "bg-success/10 text-success border border-success/20"
                : "bg-muted text-muted-foreground",
            )}
          >
            {report.gapsDetected}{" "}
            {report.gapsDetected === 1
              ? t("gap", "празнина")
              : t("gaps", "празнини")}
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-border flex flex-col gap-3 bg-muted/20">
          {report.status !== "scanned" && (
            <div className="text-xs text-muted-foreground pt-1 leading-relaxed">
              {report.status === "day_off" &&
                t(
                  "This staff member has a day-off override for the selected date.",
                  "Овој член на персоналот има означено слободен ден за избраниот датум.",
                )}
              {report.status === "no_working_hours" &&
                t(
                  "No availability rule or custom-hours override for this weekday. Add one in Settings → Availability.",
                  "Нема правило за достапност или посебно работно време за овој ден. Додајте во Поставки → Достапност.",
                )}
              {report.status === "past_workday" &&
                t(
                  "The configured workday already ended. No future gaps remain today.",
                  "Поставеното работно време е веќе завршено. Нема преостанати празнини денес.",
                )}
            </div>
          )}

          {report.status === "scanned" && (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                  {t("Free intervals", "Слободни интервали")}
                </div>
                {report.intervals.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    {t(
                      "Fully booked — no free time.",
                      "Целосно пополнето — нема слободно време.",
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {report.intervals.map((iv, i) => {
                      const meta = classificationMeta(iv.classification, t);
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="font-mono text-foreground font-medium w-[96px]">
                            {fmt(iv.startAt)}–{fmt(iv.endAt)}
                          </span>
                          <span className="text-muted-foreground w-14 font-medium">
                            {iv.durationMins}
                            {t("m", "м")}
                          </span>
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded border text-[10px] font-semibold",
                              meta.color,
                            )}
                          >
                            {meta.label}
                          </span>
                          <span className="text-muted-foreground/70 text-[10px] truncate">
                            {boundaryLabel(iv.leftBoundary, t)} →{" "}
                            {boundaryLabel(iv.rightBoundary, t)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {report.candidateFunnel && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />{" "}
                    {t("Candidate funnel", "Филтер на кандидати")}
                  </div>
                  <FunnelBar funnel={report.candidateFunnel} />
                  <div className="text-[10px] text-muted-foreground mt-1.5">
                    {t("Thresholds:", "Прагови:")} ≥
                    {report.candidateFunnel.thresholds.minTotalVisits}{" "}
                    {t("visits", "посети")} · {t("last", "последни")}{" "}
                    {report.candidateFunnel.thresholds.recencyWindowDays}
                    {t("d", "д")} · {t("top", "топ")}{" "}
                    {report.candidateFunnel.thresholds.topN}
                  </div>
                </div>
              )}

              {report.gapsDetected > 0 && (
                <div className="text-xs text-success font-medium">
                  {report.draftsCreated === 0
                    ? language === "mk"
                      ? `Детектирани се ${report.gapsDetected} ${report.gapsDetected === 1 ? "празнина" : "празнини"}, но нема соодветни редовни клиенти за испраќање порака.`
                      : `Detected ${report.gapsDetected} gap${report.gapsDetected === 1 ? "" : "s"} but no eligible returning customers to draft outreach for.`
                    : language === "mk"
                      ? `Подготвени се ${report.draftsCreated} ${report.draftsCreated === 1 ? "порака" : "пораки"} за ${report.gapsDetected} ${report.gapsDetected === 1 ? "празнина" : "празнини"}.`
                      : `Drafted ${report.draftsCreated} outreach message${report.draftsCreated === 1 ? "" : "s"} across ${report.gapsDetected} gap${report.gapsDetected === 1 ? "" : "s"}.`}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FunnelBar({ funnel }: { funnel: FunnelReport }) {
  const { t } = useDashboardI18n();
  const steps: Array<[string, number]> = [
    [t("All customers", "Сите клиенти"), funnel.totalCustomers],
    [t("Opted in", "Пријавени за пораки"), funnel.passedOptIn],
    [t("Not erased", "Неизбришани"), funnel.passedNotErased],
    [t("Has channel", "Има канал за контакт"), funnel.passedHasChannel],
    [
      `≥${funnel.thresholds.minTotalVisits} ${t("visits", "посети")}`,
      funnel.passedRegular,
    ],
    [
      `${t("Last", "Последни")} ${funnel.thresholds.recencyWindowDays}${t("d", "д")}`,
      funnel.passedRecency,
    ],
    [`${t("Top", "Топ")} ${funnel.thresholds.topN}`, funnel.finalCount],
  ];
  const max = Math.max(1, ...steps.map(([, n]) => n));
  return (
    <div className="flex flex-col gap-1.5">
      {steps.map(([label, n], i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground w-[120px] shrink-0 font-medium">
            {label}
          </span>
          <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(n / max) * 100}%` }}
            />
          </div>
          <span className="text-foreground w-8 text-right font-mono font-medium">
            {n}
          </span>
        </div>
      ))}
    </div>
  );
}
