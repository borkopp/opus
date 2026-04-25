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
            return { label: "Interior gap", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
        case "below_threshold":
            return { label: "Below threshold", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
        case "edge_of_day":
            return { label: "Edge of day", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30" };
        case "now_bounded":
            return { label: "Bounded by now", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
        case "past_workday":
            return { label: "Past workday", color: "text-zinc-500 bg-zinc-500/10 border-zinc-500/30" };
        default:
            return { label: c, color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30" };
    }
}

function staffStatusMeta(s: StaffReport["status"]): { label: string; icon: ReactElement } {
    switch (s) {
        case "day_off":
            return { label: "Day off", icon: <AlertCircle className="w-3.5 h-3.5 text-zinc-500" /> };
        case "no_working_hours":
            return { label: "No availability rule", icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> };
        case "past_workday":
            return { label: "Workday already ended", icon: <Clock className="w-3.5 h-3.5 text-zinc-500" /> };
        case "scanned":
        default:
            return { label: "Scanned", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> };
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
        } catch (e: any) {
            toast.error(e.message || "Failed to scan");
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">Fill <span className="serif-accent-inline text-3xl">Gaps</span></h1>
                    <p className="text-sm text-muted-foreground mt-1">AI discovers gaps in your schedule and drafts outreach messages to your best customers.</p>
                </div>
                <div>
                    <Button
                        onClick={handleScan}
                        disabled={isScanning}
                        className="bg-accent hover:bg-accent/90 text-white font-medium shadow-sm transition-all rounded-full h-10 px-5 gap-2 active:scale-[0.98]"
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
                        <div className="bg-zinc-950 text-zinc-300 rounded-[16px] p-4 border border-zinc-800 shadow-inner text-xs sm:text-sm">
                            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                                <div className="flex items-center gap-2 text-zinc-400 font-semibold tracking-wider uppercase text-xs font-mono">
                                    <Terminal className="w-4 h-4" />
                                    Scan Diagnostics
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setScanResults(null)}
                                    className="h-6 w-6 p-0 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full"
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
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
            <div className={cn("text-sm font-semibold", highlight ? "text-emerald-400" : "text-zinc-100")}>{value}</div>
            {hint && <div className="text-[10px] text-zinc-500 mt-0.5">{hint}</div>}
        </div>
    );
}

function EmptyDiagnostic({ title, body }: { title: string; body: string }) {
    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-zinc-400 font-sans">
            <div className="text-zinc-200 font-semibold text-sm">{title}</div>
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
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 mb-3 font-sans">
            <div className="text-indigo-300 font-semibold text-sm">{headline}</div>
            <div className="text-xs text-zinc-400 mt-1">{explainer}</div>
        </div>
    );
}

function StaffRow({ report }: { report: StaffReport }) {
    const [open, setOpen] = useState(false);
    const status = staffStatusMeta(report.status);

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-900 transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    {status.icon}
                    <span className="font-semibold text-zinc-100 truncate">{report.staffName}</span>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">{status.label}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400 shrink-0">
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
                        report.gapsDetected > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                    )}>
                        {report.gapsDetected} gap{report.gapsDetected === 1 ? "" : "s"}
                    </span>
                    {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
            </button>

            {open && (
                <div className="px-3 pb-3 pt-1 border-t border-zinc-800 flex flex-col gap-3">
                    {report.status !== "scanned" && (
                        <div className="text-xs text-zinc-400 pt-2">
                            {report.status === "day_off" && "This staff member has a day-off override for the selected date."}
                            {report.status === "no_working_hours" && "No availability rule or custom-hours override for this weekday. Add one in Settings → Availability."}
                            {report.status === "past_workday" && "The configured workday already ended. No future gaps remain today."}
                        </div>
                    )}

                    {report.status === "scanned" && (
                        <>
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">Free intervals</div>
                                {report.intervals.length === 0 ? (
                                    <div className="text-xs text-zinc-500">Fully booked — no free time.</div>
                                ) : (
                                    <div className="flex flex-col gap-1.5">
                                        {report.intervals.map((iv, i) => {
                                            const meta = classificationMeta(iv.classification);
                                            return (
                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                    <span className="font-mono text-zinc-300 w-[96px]">
                                                        {fmt(iv.startAt)}–{fmt(iv.endAt)}
                                                    </span>
                                                    <span className="text-zinc-500 w-14">{iv.durationMins}m</span>
                                                    <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-semibold", meta.color)}>
                                                        {meta.label}
                                                    </span>
                                                    <span className="text-zinc-600 text-[10px] truncate">
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
                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1.5">
                                        <Users className="w-3 h-3" /> Candidate funnel
                                    </div>
                                    <FunnelBar funnel={report.candidateFunnel} />
                                    <div className="text-[10px] text-zinc-500 mt-1.5">
                                        Thresholds: ≥{report.candidateFunnel.thresholds.minTotalVisits} visits ·
                                        last {report.candidateFunnel.thresholds.recencyWindowDays}d ·
                                        top {report.candidateFunnel.thresholds.topN}
                                    </div>
                                </div>
                            )}

                            {report.gapsDetected > 0 && (
                                <div className="text-xs text-emerald-400">
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
                    <span className="text-zinc-500 w-[120px] shrink-0">{label}</span>
                    <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500/70"
                            style={{ width: `${(n / max) * 100}%` }}
                        />
                    </div>
                    <span className="text-zinc-300 w-8 text-right font-mono">{n}</span>
                </div>
            ))}
        </div>
    );
}
