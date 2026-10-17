"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PersonalStaffCalendar } from "@/components/staff/PersonalStaffCalendar";
import { BookingsSplitView } from "@/components/bookings/BookingsSplitView";
import { BookingsLoading } from "@/components/bookings/BookingsLoading";

export default function BookingsPage() {
  // We get orgId from profile
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;
  const personal = profile?.bookingAccess === "own";

  const bookings = useQuery(
    api.bookings.listBookingsByOrg,
    orgId ? { orgId } : "skip",
  );
  const staffMembers = useQuery(
    api.staff.listStaffMembers,
    orgId && !personal ? { orgId } : "skip",
  );

  if (!orgId || bookings === undefined) return <BookingsLoading />;

  if (personal)
    return <PersonalStaffCalendar orgId={orgId} bookings={bookings} />;

  if (staffMembers === undefined) return <BookingsLoading />;

  return (
    <div className="flex flex-col gap-6 w-full flex-1 min-h-0">
      <BookingsSplitView
        bookings={bookings}
        staffMembers={staffMembers}
        orgId={orgId}
      />
    </div>
  );
}
