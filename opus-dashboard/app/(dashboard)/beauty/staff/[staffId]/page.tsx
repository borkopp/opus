"use client";
import { Id } from "@/convex/_generated/dataModel";
import { WeeklySchedule } from "./_components/WeeklySchedule";
import { TimeOffSection } from "./_components/TimeOffSection";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { use } from "react";
import { cn } from "@/lib/utils";

export default function StaffMemberPage({ params }: { params: Promise<{ staffId: string }> }) {
    const { staffId } = use(params);

    const profile = useQuery(api.users.getMyProfile);
    const orgId = profile?.orgId as Id<"orgs"> | undefined;

    const staffMemberResult = useQuery(api.staff.getStaffMember,
        orgId ? { orgId, staffId: staffId as Id<"staff_members"> } : "skip"
    );

    if (profile === undefined || staffMemberResult === undefined) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
                <Skeleton className="h-20 w-full mb-2" />
                <Skeleton className="h-[600px] w-full mt-4" />
            </div>
        );
    }

    if (!orgId || staffMemberResult === null) {
        return <div>Staff member not found.</div>;
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">

            {/* Header section */}
            <div className="flex flex-col gap-6">
                <Link href="/beauty/staff" className="flex items-center text-base font-medium text-muted-foreground hover:text-foreground w-fit transition-colors group">
                    <IconArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Team
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border/60 p-6 md:p-8 rounded-2xl bg-card shadow-sm">
                    <div className="flex items-center gap-5">
                        <Avatar className="h-16 w-16 border bg-muted shadow-sm">
                            <AvatarImage src={staffMemberResult.avatarUrl} alt={staffMemberResult.displayName} className="object-cover" />
                            <AvatarFallback className="font-semibold text-xl">{staffMemberResult.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col">
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{staffMemberResult.displayName}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                    "text-sm font-semibold uppercase tracking-wider",
                                    staffMemberResult.role === "owner" ? "text-terracotta-600 dark:text-terracotta-500" :
                                        staffMemberResult.role === "manager" ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                                )}>{staffMemberResult.role}</span>
                                <span className="w-1 h-1 rounded-full bg-border"></span>
                                <Badge variant={staffMemberResult.isActive ? "default" : "secondary"} className={staffMemberResult.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium border-emerald-200 dark:border-emerald-800" : "font-medium"}>
                                    {staffMemberResult.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        {/* Edit wrapper removed here - user edits inside Staff List dialog or we can link it later */}
                        <Button variant="outline" size="sm" asChild className="hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors">
                            <Link href="/beauty/staff">Manage Profile</Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Tabs / Sections */}
            <div className="flex flex-col gap-10 mt-6">
                <div className="space-y-4">
                    <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground">Schedule Configuration</h2>
                    <WeeklySchedule orgId={orgId} staffId={staffId as Id<"staff_members">} />
                </div>

                <div className="space-y-4 border-t pt-8">
                    <TimeOffSection orgId={orgId} staffId={staffId as Id<"staff_members">} />
                </div>
            </div>

        </div>
    );
}
