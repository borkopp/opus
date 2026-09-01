"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { Price } from "@/components/ui/price";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Clock, MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Gap = FunctionReturnType<typeof api.ai.gapOptimizerHelpers.getOpenGapsForOrg>[number];
type Candidate = Gap["topCandidates"][number];

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Something went wrong";
}

export function GapList({ gaps, orgId }: { gaps: Gap[]; orgId: Id<"orgs"> }) {
    if (gaps.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-xl bg-card/40">
                <p className="text-muted-foreground text-sm font-medium">No gaps found. Schedule looks solid!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {gaps.map(gap => (
                <GapCard key={gap._id} gap={gap} orgId={orgId} />
            ))}
        </div>
    );
}

function GapCard({ gap, orgId }: { gap: Gap; orgId: Id<"orgs"> }) {
    const dismissGap = useMutation(api.ai.gapOptimizerHelpers.dismissGap);

    const onDismiss = async () => {
        try {
            await dismissGap({ orgId, gapId: gap._id });
            toast.success("Gap dismissed");
        } catch (error: unknown) {
            toast.error(errorMessage(error));
        }
    };

    // Booking times are stored as pseudo-UTC (org local time encoded as UTC ms),
    // so read UTC components to recover the intended wall-clock label.
    const start = new Date(gap.gapStartAt);
    const end = new Date(gap.gapEndAt);
    const timeLabel = `${String(start.getUTCHours()).padStart(2, "0")}:${String(start.getUTCMinutes()).padStart(2, "0")} - ${String(end.getUTCHours()).padStart(2, "0")}:${String(end.getUTCMinutes()).padStart(2, "0")}`;

    return (
        <Card className="flex flex-col overflow-hidden border border-border bg-card shadow-xs">
            <div className="px-4 py-2.5 flex items-center justify-between gap-3 bg-muted/30 border-b border-border/60">
                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold font-display tracking-tight text-foreground">{timeLabel}</span>
                        <span className="bg-secondary text-secondary-foreground text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {gap.durationMins}m
                        </span>
                        {gap.status === "outreach_sent" && (
                            <span className="bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full border border-primary/20">
                                Sent
                            </span>
                        )}
                    </div>
                    <div className="text-muted-foreground text-xs flex items-center gap-1.5 font-medium">
                        <span className="text-foreground/80">{gap.staffName}</span>
                        <span className="text-border">•</span>
                        <span className="text-success font-semibold font-display">
                            <Price amount={gap.estimatedRevenueMinorUnits} />
                        </span>
                    </div>
                </div>

                {gap.status === "open" && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDismiss}
                        className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-md"
                    >
                        Dismiss gap
                    </Button>
                )}
            </div>

            <div className="flex flex-col bg-background/50 divide-y divide-border/50">
                {gap.topCandidates.length === 0 ? (
                    <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">No suitable candidates found</span>
                        <span className="text-[11px] text-muted-foreground/80">
                            Requires returning customers with visit history & contact preferences
                        </span>
                    </div>
                ) : (
                    gap.topCandidates.map((candidate) => (
                        <CandidateRow key={candidate._id} candidate={candidate} orgId={orgId} gapStatus={gap.status} />
                    ))
                )}
            </div>
        </Card>
    );
}

function CandidateRow({
    candidate,
    orgId,
    gapStatus,
}: {
    candidate: Candidate;
    orgId: Id<"orgs">;
    gapStatus: Gap["status"];
}) {
    const [expanded, setExpanded] = useState(false);
    const approveAndSend = useMutation(api.ai.gapOptimizerHelpers.approveAndSendCandidate);
    const dismissCandidate = useMutation(api.ai.gapOptimizerHelpers.dismissCandidate);
    const [isSending, setIsSending] = useState(false);

    const onSend = async () => {
        setIsSending(true);
        try {
            await approveAndSend({ orgId, candidateId: candidate._id });
            toast.success(`Message sent to ${candidate.customerName}`);
        } catch (error: unknown) {
            toast.error(errorMessage(error));
        } finally {
            setIsSending(false);
        }
    };

    const onDismiss = async () => {
        try {
            await dismissCandidate({ orgId, candidateId: candidate._id });
            toast.success("Candidate skipped");
        } catch (error: unknown) {
            toast.error(errorMessage(error));
        }
    };

    const isSent = candidate.status === "sent";

    return (
        <div className="flex flex-col px-4 py-2.5 transition-colors hover:bg-muted/30">
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-foreground truncate">{candidate.customerName}</span>
                        {/* Status Badge */}
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded border shrink-0",
                            candidate.confidenceScore > 0.8 
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                            {(candidate.confidenceScore * 100).toFixed(0)}% Match
                        </div>
                        {isSent && (
                            <span className="bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.2 rounded border border-primary/20 shrink-0">
                                Sent
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-0.5 truncate">Top reason: {candidate.scoreRationale}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setExpanded(!expanded)} 
                        className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                    >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        Preview
                        {expanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                    </Button>
                    
                    {!isSent && gapStatus !== "filled" && (
                        <>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={onDismiss} 
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                            >
                                <X className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={onSend} 
                                disabled={isSending}
                                className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                            >
                                <Send className="w-3 h-3 mr-1" />
                                {isSending ? "..." : "Send"}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="mt-2.5 p-3 bg-muted/40 rounded-lg border border-border text-xs text-foreground relative leading-relaxed">
                    <div className="absolute -left-1 top-3.5 w-2.5 h-2.5 bg-muted/40 border-t border-l border-border rotate-[-45deg]" />
                    {candidate.draftedMessage}
                </div>
            )}
        </div>
    );
}
