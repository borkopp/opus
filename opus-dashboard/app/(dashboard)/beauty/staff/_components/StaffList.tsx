"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarClockIcon,
  MailIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { getErrorMessage } from "@/lib/file-validation";
import { cn } from "@/lib/utils";
import { StaffFormDialog } from "./StaffFormDialog";

export function StaffList({
  orgId,
  onAddClick,
  canManageAppointmentEmail,
}: {
  orgId: Id<"orgs">;
  onAddClick: () => void;
  canManageAppointmentEmail: boolean;
}) {
  const { t } = useDashboardI18n();
  const staff = useQuery(api.staff.listStaffMembers, { orgId });
  const deactivateStaffMember = useMutation(api.staff.deactivateStaffMember);
  const updateStaffMember = useMutation(api.staff.updateStaffMember);
  const [editingStaffId, setEditingStaffId] =
    useState<Id<"staff_members"> | null>(null);

  if (staff === undefined) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="grid gap-4 border-b px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(12rem,0.8fr)_auto] sm:items-center sm:px-5"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <Empty className="min-h-[360px] border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>{t("No staff yet", "Сè уште нема вработени")}</EmptyTitle>
          <EmptyDescription>
            {t(
              "Add your first team member, then set the hours customers can book.",
              "Додајте го вашиот прв член на тимот, па поставете го работното време за закажување.",
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            onClick={onAddClick}
            className="transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none"
          >
            <PlusIcon data-icon="inline-start" />
            {t("Add staff member", "Додај вработен")}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const handleRemove = async (
    staffId: Id<"staff_members">,
    displayName: string,
  ) => {
    if (
      !window.confirm(
        t(
          `Remove ${displayName} from the team? They will no longer be available for bookings.`,
          `Дали сакате да го отстраните ${displayName} од тимот? Повеќе нема да биде достапен за закажување.`,
        ),
      )
    ) {
      return;
    }

    try {
      await deactivateStaffMember({ orgId, staffId });
      toast.success(
        t(
          `${displayName} was removed from the team.`,
          `${displayName} беше отстранет од тимот.`,
        ),
      );
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          t(
            "Could not remove staff member",
            "Не може да се отстрани вработениот",
          ),
        ),
      );
    }
  };

  const handleReactivate = async (
    staffId: Id<"staff_members">,
    displayName: string,
  ) => {
    try {
      await updateStaffMember({ orgId, staffId, isActive: true });
      toast.success(
        t(
          `${displayName} is available for bookings again.`,
          `${displayName} е повторно достапен за закажување.`,
        ),
      );
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          t(
            "Could not reactivate staff member",
            "Не може повторно да се активира вработениот",
          ),
        ),
      );
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card shadow-s">
        {staff.map((member) => (
          <div
            key={member._id}
            className={cn(
              "grid gap-4 border-b px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(12rem,0.8fr)_auto] sm:items-center sm:px-5",
              !member.isActive && "bg-muted/20",
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-11 border bg-muted">
                <AvatarImage
                  src={member.avatarUrl}
                  alt={member.displayName}
                  className="object-cover"
                />
                <AvatarFallback className="font-medium">
                  {getInitials(member.displayName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-foreground">
                    {member.displayName}
                  </p>
                  {!member.isActive && (
                    <Badge variant="secondary">
                      {t("Inactive", "Неактивен")}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatRole(member.role, t)}
                </p>
                {canManageAppointmentEmail && (
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <MailIcon className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {member.appointmentEmail ||
                        t("No appointment email", "Нема е-пошта за термини")}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <ScheduleSummary orgId={orgId} staffId={member._id} />

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="min-w-0 flex-1 sm:flex-none"
              >
                <Link href={`/beauty/staff/${member._id}`}>
                  <CalendarClockIcon data-icon="inline-start" />
                  {t("Manage hours", "Управувај со часови")}
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t(
                      `Actions for ${member.displayName}`,
                      `Опции за ${member.displayName}`,
                    )}
                  >
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onSelect={() => setEditingStaffId(member._id)}
                    >
                      <PencilIcon />
                      {t("Edit details", "Уреди детали")}
                    </DropdownMenuItem>
                    {!member.isActive && (
                      <DropdownMenuItem
                        onSelect={() =>
                          handleReactivate(member._id, member.displayName)
                        }
                      >
                        <RotateCcwIcon />
                        {t("Mark as active", "Означи како активен")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  {member.isActive && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() =>
                            handleRemove(member._id, member.displayName)
                          }
                        >
                          <Trash2Icon />
                          {t("Remove from team", "Отстрани од тимот")}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {editingStaffId !== null && (
        <StaffFormDialog
          orgId={orgId}
          staffId={editingStaffId}
          open
          canManageAppointmentEmail={canManageAppointmentEmail}
          onOpenChange={(open) => {
            if (!open) setEditingStaffId(null);
          }}
        />
      )}
    </>
  );
}

function ScheduleSummary({
  orgId,
  staffId,
}: {
  orgId: Id<"orgs">;
  staffId: Id<"staff_members">;
}) {
  const { t } = useDashboardI18n();
  const schedule = useQuery(api.availability.getWeeklySchedule, {
    orgId,
    staffId,
  });

  if (schedule === undefined) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-36" />
      </div>
    );
  }

  const activeDays = schedule.filter((day) => day.isActive);
  const uniqueHours = new Set(
    activeDays.map((day) => `${day.startTime}-${day.endTime}`),
  );
  const hoursLabel =
    activeDays.length === 0
      ? t("No working hours set", "Нема поставено работно време")
      : uniqueHours.size === 1
        ? activeDays.length === 1
          ? t(
              `1 day · ${activeDays[0].startTime}–${activeDays[0].endTime}`,
              `1 ден · ${activeDays[0].startTime}–${activeDays[0].endTime}`,
            )
          : t(
              `${activeDays.length} days · ${activeDays[0].startTime}–${activeDays[0].endTime}`,
              `${activeDays.length} дена · ${activeDays[0].startTime}–${activeDays[0].endTime}`,
            )
        : activeDays.length === 1
          ? t("1 day · Hours vary", "1 ден · Различно време")
          : t(
              `${activeDays.length} days · Hours vary`,
              `${activeDays.length} дена · Различно време`,
            );

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">
        {t("Regular hours", "Редовно работно време")}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-medium",
          activeDays.length === 0 ? "text-danger" : "text-foreground",
        )}
      >
        {hoursLabel}
      </p>
    </div>
  );
}

function formatRole(
  role: Doc<"staff_members">["role"],
  t: (en: string, mk: string) => string,
) {
  if (role === "owner") return t("Owner", "Сопственик");
  if (role === "manager") return t("Manager", "Менаџер");
  return t("Staff member", "Вработен");
}

function getInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
