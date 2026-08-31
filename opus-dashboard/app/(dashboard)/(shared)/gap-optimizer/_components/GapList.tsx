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
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-card/50">
                <p className="text-muted-foreground font-medium">No gaps found. Schedule looks solid!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
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
        <Card className="flex flex-col overflow-hidden group">
            <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-secondary/40 relative">

                <div className="flex flex-col gap-1 z-10">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-semibold font-display tracking-tight text-foreground">{timeLabel}</span>
                        <span className="bg-secondary text-secondary-foreground text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {gap.durationMins}m
                        </span>
                        {gap.status === "outreach_sent" && (
                            <span className="bg-brand-soft text-primary text-xs font-semibold px-2 py-0.5 rounded-full border border-brand-soft">
                                Sent
                            </span>
                        )}
                    </div>
                    <div className="text-muted-foreground text-sm flex items-center gap-2 font-medium">
                        <span>{gap.staffName}</span>
                        <span className="text-border text-xs">•</span>
                        <span className="text-success font-semibold">
                            <Price amount={gap.estimatedRevenueMinorUnits} />
                        </span>
                    </div>
                </div>
                
                {gap.status === "open" && (
                    <Button variant="ghost" size="sm" onClick={onDismiss} className="text-muted-foreground hover:text-destructive z-10 shrink-0">
                        Dismiss gap
                    </Button>
                )}
            </div>

            <div className="flex flex-col bg-background/50 divide-y divide-border/50">
                {gap.topCandidates.length === 0 ? (
                    <div className="p-5 text-sm text-muted-foreground text-center">No suitable candidates found for this gap.</div>
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
        <div className="flex flex-col p-4 transition-colors hover:bg-secondary/20">
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{candidate.customerName}</span>
                        {/* Status Badge */}
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border",
                            candidate.confidenceScore > 0.8 
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-highlight/10 text-warning border-highlight/20"
                        )}>
                            {(candidate.confidenceScore * 100).toFixed(0)}% Match
                        </div>
                        {isSent && (
                            <span className="bg-brand-soft text-primary text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border border-brand-soft">
                                Sent
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5">Top reason: {candidate.scoreRationale}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setExpanded(!expanded)} 
                        className="text-muted-foreground hover:text-foreground h-8 px-2"
                    >
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        Preview
                        {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                    </Button>
                    
                    {!isSent && gapStatus !== "filled" && (
                        <>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={onDismiss} 
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={onSend} 
                                disabled={isSending}
                                className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                            >
                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                {isSending ? "..." : "Send"}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="mt-4 p-3 bg-secondary/50 rounded-xl border border-secondary text-sm text-foreground relative">
                    <div className="absolute -left-1.5 top-4 w-3 h-3 bg-secondary/50 border-t border-l border-secondary rotate-[-45deg]" />
                    {candidate.draftedMessage}
                </div>
            )}
        </div>
    );
}
