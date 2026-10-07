"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowLeftIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { StaffAccountPanel } from "@/components/staff/StaffAccountPanel";
import { StaffDetailsForm } from "@/components/staff/StaffDetailsForm";
import { TimeOffSection } from "./TimeOffSection";
import { WeeklySchedule } from "./WeeklySchedule";

export function StaffMemberWorkspace({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  const { t } = useDashboardI18n();
  const { staffId: staffIdParam } = use(params);
  const staffId = staffIdParam as Id<"staff_members">;
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId as Id<"orgs"> | undefined;
  const staffMember = useQuery(
    api.staff.getStaffMember,
    orgId ? { orgId, staffId } : "skip",
  );
  const query = useSearchParams();

  if (profile === undefined || staffMember === undefined) {
    return (
      <div className="flex w-full flex-col gap-6">
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
    return (
      <div data-replay-public>
        {t(
          "Staff member not found.",
          "Вработениот не е пронајден.",
          "Anëtari i stafit nuk u gjet.",
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-1 flex-col gap-6">
      <Link
        data-replay-public
        href="/beauty/services?tab=staff"
        className="flex w-fit items-center gap-2 rounded-sm text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
      >
        <ArrowLeftIcon className="size-4" />
        {t("All staff", "Сите вработени", "Gjithë stafi")}
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
              <Badge variant="outline">{formatRole(staffMember.role, t)}</Badge>
              <Badge
                data-replay-public
                variant={staffMember.isActive ? "success" : "secondary"}
              >
                {staffMember.isActive
                  ? t("Active", "Активен", "Aktiv")
                  : t("Inactive", "Неактивен", "Joaktiv")}
              </Badge>
              <span
                data-replay-public
                className="text-sm text-muted-foreground"
              >
                {staffMember.isActive
                  ? t(
                      "Manage profile, login access and availability.",
                      "Управувајте со профилот, пристапот и достапноста.",
                      "Menaxhoni profilin, qasjen dhe disponueshmërinë.",
                    )
                  : t(
                      "Inactive staff cannot be booked.",
                      "Неактивните вработени не можат да бидат закажани.",
                      "Stafi joaktiv nuk mund të rezervohet.",
                    )}
              </span>
            </div>
          </div>
        </div>
      </header>

      <Tabs
        defaultValue={query.get("tab") === "hours" ? "hours" : "profile"}
        className="min-w-0 gap-6"
      >
        <TabsList className="h-11 w-full sm:w-fit">
          <TabsTrigger value="profile">
            {t("Profile & login", "Профил и најава", "Profili dhe hyrja")}
          </TabsTrigger>
          <TabsTrigger value="hours">
            {t("Hours", "Часови", "Orari")}
          </TabsTrigger>
          <TabsTrigger value="time-off">
            {t("Time off", "Отсуства", "Pushimet")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="m-0">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "Profile details",
                    "Детали за профилот",
                    "Detajet e profilit",
                  )}
                </CardTitle>
                <CardDescription>
                  {t(
                    "The information shown on your booking website.",
                    "Информации прикажани на страницата за закажување.",
                    "Informacioni i shfaqur në faqen tuaj të rezervimit.",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StaffDetailsForm orgId={orgId} staffId={staffId} />
              </CardContent>
            </Card>
            {(profile?.role === "owner" || profile?.role === "manager") && (
              <StaffAccountPanel
                orgId={orgId}
                staffId={staffId}
                role={staffMember.role}
                owner={profile.role === "owner"}
                paid={profile.plan === "paid"}
              />
            )}
          </div>
        </TabsContent>
        <TabsContent value="hours" className="m-0">
          <WeeklySchedule orgId={orgId} staffId={staffId} />
        </TabsContent>
        <TabsContent value="time-off" className="m-0">
          <TimeOffSection orgId={orgId} staffId={staffId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatRole(
  role: Doc<"staff_members">["role"],
  t: (en: string, mk: string, sq?: string) => string,
) {
  if (role === "owner") return t("Owner", "Сопственик", "Pronar");
  if (role === "manager") return t("Manager", "Менаџер", "Menaxher");
  return t("Staff member", "Вработен", "Anëtar i stafit");
}

function getInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
