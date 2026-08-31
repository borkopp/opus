"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { StaffFormDialog } from "../_components/StaffFormDialog";
import { TimeOffSection } from "./_components/TimeOffSection";
import { WeeklySchedule } from "./_components/WeeklySchedule";

export default function StaffMemberPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  const { staffId: staffIdParam } = use(params);
  const staffId = staffIdParam as Id<"staff_members">;
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId as Id<"orgs"> | undefined;
  const staffMember = useQuery(
    api.staff.getStaffMember,
    orgId ? { orgId, staffId } : "skip",
  );
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (profile === undefined || staffMember === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-4 border-b pb-6">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-[620px] w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!orgId || staffMember === null) {
    return <div>Staff member not found.</div>;
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col gap-6">
      <Link
        href="/beauty/staff"
        className="flex w-fit items-center gap-2 rounded-sm text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
      >
        <ArrowLeftIcon className="size-4" />
        All staff
      </Link>

      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-14 border bg-muted">
            <AvatarImage
              src={staffMember.avatarUrl}
              alt={staffMember.displayName}
              className="object-cover"
            />
            <AvatarFallback className="text-lg font-medium">
              {getInitials(staffMember.displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-semibold tracking-tight text-foreground">
              {staffMember.displayName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{formatRole(staffMember.role)}</Badge>
              <Badge variant={staffMember.isActive ? "success" : "secondary"}>
                {staffMember.isActive ? "Active" : "Inactive"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {staffMember.isActive
                  ? "Manage working hours and time off."
                  : "Inactive staff cannot be booked."}
              </span>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
          <PencilIcon data-icon="inline-start" />
          Edit details
        </Button>
      </header>

      <div className="flex flex-col gap-6">
        <WeeklySchedule orgId={orgId} staffId={staffId} />
        <TimeOffSection orgId={orgId} staffId={staffId} />
      </div>

      {isEditOpen && (
        <StaffFormDialog
          orgId={orgId}
          staffId={staffId}
          open
          onOpenChange={setIsEditOpen}
        />
      )}
    </div>
  );
}

function formatRole(role: Doc<"staff_members">["role"]) {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  return "Staff member";
}

function getInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
