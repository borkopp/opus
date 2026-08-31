"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Terminal, X, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type IntervalReport = {
    startAt: number;
    endAt: number;
    durationMins: number;
    leftBoundary: string;
    rightBoundary: string;
    classification: string;
};

type FunnelReport = {
    thresholds: { minTotalVisits: number; recencyWindowDays: number; topN: number };
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
    thresholds: { minGapMins: number; minGapSource: string; bufferTimeMins: number };
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

function boundaryLabel(source: string): string {
    switch (source) {
        case "workingStart": return "Workday start";
        case "workingEnd": return "Workday end";
        case "booking": return "Booking";
        case "break": return "Break";
        case "now": return "Now";
        default: return source;
    }
}

function classificationMeta(c: string): { label: string; color: string } {
    switch (c) {
        case "interior_gap":
            return { label: "Interior gap", color: "text-success bg-success/10 border-success/30" };
        case "below_threshold":
            return { label: "Below threshold", color: "text-warning bg-highlight/10 border-highlight/30" };
        case "edge_of_day":
            return { label: "Edge of day", color: "text-muted-foreground bg-muted/30 border-border" };
        case "now_bounded":
            return { label: "Bounded by now", color: "text-primary bg-accent border-accent" };
        case "past_workday":
            return { label: "Past workday", color: "text-muted-foreground bg-muted/30 border-border" };
        default:
            return { label: c, color: "text-muted-foreground bg-muted/30 border-border" };
    }
}

function staffStatusMeta(s: StaffReport["status"]): { label: string; icon: ReactElement } {
    switch (s) {
        case "day_off":
            return { label: "Day off", icon: <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" /> };
        case "no_working_hours":
            return { label: "No availability rule", icon: <AlertCircle className="w-3.5 h-3.5 text-warning" /> };
        case "past_workday":
            return { label: "Workday already ended", icon: <Clock className="w-3.5 h-3.5 text-muted-foreground" /> };
        case "scanned":
        default:
            return { label: "Scanned", icon: <CheckCircle2 className="w-3.5 h-3.5 text-success" /> };
    }
}

export function GapOptimizerHeader({ orgId }: { orgId: string }) {
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
            toast.success("Scan completed");
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to scan");
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">Fill <span className="font-display italic text-primary">Gaps</span></h1>
                    <p className="text-sm text-muted-foreground mt-1">AI discovers gaps in your schedule and drafts outreach messages to your best customers.</p>
                </div>
                <div>
                    <Button
                        onClick={handleScan}
                        disabled={isScanning}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors rounded-md h-10 px-5 gap-2 active:scale-[0.98]"
                    >
                        {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isScanning ? "Scanning..." : "Scan today"}
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {scanResults && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="mt-4 overflow-hidden"
                    >
                        <div className="bg-ink-surface text-background rounded-lg p-4 border border-border text-xs sm:text-sm">
                            <div className="flex items-center justify-between mb-3 border-b border-background/15 pb-2">
                                <div className="flex items-center gap-2 text-background/70 font-semibold tracking-wider uppercase text-xs font-mono">
                                    <Terminal className="w-4 h-4" />
                                    Scan Diagnostics
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setScanResults(null)}
                                    className="h-6 w-6 p-0 text-background/60 hover:text-background hover:bg-background/10 rounded-md"
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 font-sans">
                                <Stat label="Date" value={scanResults.serviceDate} hint={scanResults.timezone} />
                                <Stat
                                    label="Min gap"
                                    value={`${scanResults.thresholds.minGapMins}m`}
                                    hint={`from ${scanResults.thresholds.minGapSource}`}
                                />
                                <Stat
                                    label="Buffer"
                                    value={`${scanResults.thresholds.bufferTimeMins}m`}
                                    hint="appended after each booking"
                                />
                                <Stat
                                    label="Gaps found"
                                    value={String(scanResults.totals.gapsFound)}
                                    hint={`${scanResults.totals.messageDraftsCreated} drafts`}
                                    highlight={scanResults.totals.gapsFound > 0}
                                />
                            </div>

                            {scanResults.staffReports.length === 0 && (
                                <EmptyDiagnostic
                                    title="No active staff to scan"
                                    body="Add or activate staff members with availability rules to enable gap detection."
                                />
                            )}

                            {scanResults.totals.gapsFound === 0 && scanResults.staffReports.length > 0 && (
                                <ZeroGapsSummary reports={scanResults.staffReports} />
                            )}

                            <div className="flex flex-col gap-2 font-sans">
                                {scanResults.staffReports.map(r => (
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

function Stat({ label, value, hint, highlight }: { label: string; value: string; hint?: string; highlight?: boolean }) {
    return (
        <div className="bg-card border border-border rounded-lg px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className={cn("text-sm font-semibold", highlight ? "text-success" : "text-foreground")}>{value}</div>
            {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
        </div>
    );
}

function EmptyDiagnostic({ title, body }: { title: string; body: string }) {
    return (
        <div className="bg-muted/30 border border-border rounded-lg p-3 text-muted-foreground font-sans">
            <div className="text-foreground font-semibold text-sm">{title}</div>
            <div className="text-xs mt-1">{body}</div>
        </div>
    );
}

function ZeroGapsSummary({ reports }: { reports: StaffReport[] }) {
    const totalBookings = reports.reduce((a, r) => a + r.bookingCount, 0);
    const scannedStaff = reports.filter(r => r.status === "scanned").length;
    const dayOff = reports.filter(r => r.status === "day_off").length;
    const noRules = reports.filter(r => r.status === "no_working_hours").length;
    const past = reports.filter(r => r.status === "past_workday").length;

    let headline = "No interior gaps today.";
    let explainer = "Every free interval was at the edges of the workday or already past.";
    if (totalBookings === 0 && scannedStaff > 0) {
        headline = "No bookings on the schedule today.";
        explainer = "The 'Fill Gaps' optimizer only finds dead zones between existing appointments. With an empty schedule, there's nothing to fill between.";
    } else if (scannedStaff === 0 && (dayOff + noRules + past) > 0) {
        headline = "No staff were available to scan today.";
        explainer = `${dayOff} day off, ${noRules} without availability rules, ${past} past workday.`;
    }

    return (
        <div className="bg-accent border border-accent rounded-lg p-3 mb-3 font-sans">
            <div className="text-primary font-semibold text-sm">{headline}</div>
            <div className="text-xs text-muted-foreground mt-1">{explainer}</div>
        </div>
    );
}

function StaffRow({ report }: { report: StaffReport }) {
    const [open, setOpen] = useState(false);
    const status = staffStatusMeta(report.status);

    return (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    {status.icon}
                    <span className="font-semibold text-background truncate">{report.staffName}</span>
                    <span className="text-[10px] uppercase tracking-wider text-background/60">{status.label}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {report.workingWindow && (
                        <span className="hidden sm:inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {fmt(report.workingWindow.startAt)}–{fmt(report.workingWindow.endAt)}
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                        {report.bookingCount} bookings · {report.breakCount} breaks
                    </span>
                    <span className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                        report.gapsDetected > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    )}>
                        {report.gapsDetected} gap{report.gapsDetected === 1 ? "" : "s"}
                    </span>
                    {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
            </button>

            {open && (
                <div className="px-3 pb-3 pt-1 border-t border-border flex flex-col gap-3">
                    {report.status !== "scanned" && (
                        <div className="text-xs text-muted-foreground pt-2">
                            {report.status === "day_off" && "This staff member has a day-off override for the selected date."}
                            {report.status === "no_working_hours" && "No availability rule or custom-hours override for this weekday. Add one in Settings → Availability."}
                            {report.status === "past_workday" && "The configured workday already ended. No future gaps remain today."}
                        </div>
                    )}

                    {report.status === "scanned" && (
                        <>
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Free intervals</div>
                                {report.intervals.length === 0 ? (
                                    <div className="text-xs text-muted-foreground">Fully booked — no free time.</div>
                                ) : (
                                    <div className="flex flex-col gap-1.5">
                                        {report.intervals.map((iv, i) => {
                                            const meta = classificationMeta(iv.classification);
                                            return (
                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                    <span className="font-mono text-foreground w-[96px]">
                                                        {fmt(iv.startAt)}–{fmt(iv.endAt)}
                                                    </span>
                                                    <span className="text-muted-foreground w-14">{iv.durationMins}m</span>
                                                    <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-semibold", meta.color)}>
                                                        {meta.label}
                                                    </span>
                                                    <span className="text-muted-foreground/70 text-[10px] truncate">
                                                        {boundaryLabel(iv.leftBoundary)} → {boundaryLabel(iv.rightBoundary)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {report.candidateFunnel && (
                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                        <Users className="w-3 h-3" /> Candidate funnel
                                    </div>
                                    <FunnelBar funnel={report.candidateFunnel} />
                                    <div className="text-[10px] text-muted-foreground mt-1.5">
                                        Thresholds: ≥{report.candidateFunnel.thresholds.minTotalVisits} visits ·
                                        last {report.candidateFunnel.thresholds.recencyWindowDays}d ·
                                        top {report.candidateFunnel.thresholds.topN}
                                    </div>
                                </div>
                            )}

                            {report.gapsDetected > 0 && (
                                <div className="text-xs text-success">
                                    {report.draftsCreated === 0
                                        ? `Detected ${report.gapsDetected} gap${report.gapsDetected === 1 ? "" : "s"} but no eligible customers to draft outreach for.`
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
    const steps: Array<[string, number]> = [
        ["All customers", funnel.totalCustomers],
        ["Opted in", funnel.passedOptIn],
        ["Not erased", funnel.passedNotErased],
        ["Has channel", funnel.passedHasChannel],
        [`≥${funnel.thresholds.minTotalVisits} visits`, funnel.passedRegular],
        [`Last ${funnel.thresholds.recencyWindowDays}d`, funnel.passedRecency],
        [`Top ${funnel.thresholds.topN}`, funnel.finalCount],
    ];
    const max = Math.max(1, ...steps.map(([, n]) => n));
    return (
        <div className="flex flex-col gap-1">
            {steps.map(([label, n], i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="text-muted-foreground w-[120px] shrink-0">{label}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary/70"
                            style={{ width: `${(n / max) * 100}%` }}
                        />
                    </div>
                    <span className="text-foreground w-8 text-right font-mono">{n}</span>
                </div>
            ))}
        </div>
    );
}
