"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StaffList } from "./_components/StaffList";
import { useState } from "react";
import { StaffFormDialog } from "./_components/StaffFormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export default function StaffPage() {
  const profile = useQuery(api.users.getMyProfile);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  if (profile === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (profile === null || !profile.orgId) return <div>Not found</div>;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Staff
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add team members and manage when customers can book them.
          </p>
        </div>

        <Button
          onClick={() => setIsAddStaffOpen(true)}
          className="w-full transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none sm:w-auto"
        >
          <PlusIcon data-icon="inline-start" />
          Add staff member
        </Button>
      </header>

      <StaffList
        orgId={profile.orgId}
        onAddClick={() => setIsAddStaffOpen(true)}
      />

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
