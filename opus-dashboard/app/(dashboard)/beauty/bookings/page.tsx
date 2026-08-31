"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IconLoader2 } from "@tabler/icons-react";
import { BookingsSplitView } from "@/components/bookings/BookingsSplitView";

export default function BookingsPage() {
    // We get orgId from profile
    const profile = useQuery(api.users.getMyProfile);
    const orgId = profile?.orgId;

    const bookings = useQuery(api.bookings.listBookingsByOrg, orgId ? { orgId } : "skip");
    const staffMembers = useQuery(api.staff.listStaffMembers, orgId ? { orgId } : "skip");

    if (!orgId || bookings === undefined || staffMembers === undefined) {
        return (
            <div className="flex items-center justify-center p-12 min-h-[60vh]">
                <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1700px] mx-auto flex-1 min-h-full">
            <BookingsSplitView bookings={bookings} staffMembers={staffMembers} orgId={orgId} />
        </div>
    );
}
