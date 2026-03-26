"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StaffList } from "./_components/StaffList";
import { useState } from "react";
import { StaffFormDialog } from "./_components/StaffFormDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function StaffPage() {
    const profile = useQuery(api.users.getMyProfile);
    const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

    if (profile === undefined) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                    <Skeleton className="h-[160px] w-full rounded-xl" />
                    <Skeleton className="h-[160px] w-full rounded-xl" />
                    <Skeleton className="h-[160px] w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (profile === null || !profile.orgId) return <div>Not found</div>;

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1700px] mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold font-display tracking-tight text-foreground">Staff Members</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Manage your team and their specialities.</p>
                </div>
            </div>

            <StaffList orgId={profile.orgId} onAddClick={() => setIsAddStaffOpen(true)} />

            {isAddStaffOpen && (
                <StaffFormDialog
                    orgId={profile.orgId}
                    open={isAddStaffOpen}
                    onOpenChange={(open) => !open && setIsAddStaffOpen(false)}
                />
            )}
        </div>
    );
}
