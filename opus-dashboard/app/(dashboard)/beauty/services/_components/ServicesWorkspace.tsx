"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { PlusIcon, ScissorsIcon, UsersIcon } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { StaffFormDialog } from "@/components/staff/StaffFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { CategoryList } from "./CategoryList";
import { ServiceFormDialog } from "./ServiceFormDialog";
import { ServiceList } from "./ServiceList";
import { StaffList } from "./StaffList";
import { StaffPlanFooter } from "./StaffPlanFooter";
import { WorkspaceSearch } from "./WorkspaceSearch";
import { WorkspaceSkeleton } from "./WorkspaceSkeleton";

export function ServicesWorkspace() {
  const { t } = useDashboardI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "staff" ? "staff" : "services";
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;
  const services = useQuery(
    api.services.listServices,
    orgId ? { orgId } : "skip",
  );
  const staff = useQuery(
    api.staff.listStaffMembers,
    orgId ? { orgId } : "skip",
  );
  const planStatus = useQuery(
    api.staff.getStaffPlanStatus,
    orgId ? {} : "skip",
  );
  const [serviceSearch, setServiceSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  if (profile === undefined) return <WorkspaceSkeleton />;
  if (!orgId) return <div>{t("Not found", "Не е пронајдено")}</div>;

  const selectTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "staff") params.set("tab", "staff");
    else params.delete("tab");
    const query = params.toString();
    // Keep the selected tab bookmarkable and restore it with browser Back.
    window.history.pushState(
      null,
      "",
      `${pathname}${query ? `?${query}` : ""}`,
    );
  };

  return (
    <div className="flex min-h-full w-full min-w-0 flex-1 flex-col gap-6">
      <DashboardPageHeader
        title={t("Services & staff", "Услуги и тим")}
        description={t(
          "Manage what customers can book and the team behind each appointment.",
          "Управувајте со услугите, тимот и работното време на едно место.",
        )}
      />

      <Tabs
        value={activeTab}
        onValueChange={selectTab}
        className="min-w-0 flex-1 gap-6"
      >
        <TabsList
          aria-label={t("Services and staff", "Услуги и тим")}
          className="grid w-full grid-cols-2 group-data-[orientation=horizontal]/tabs:h-12 sm:w-80"
        >
          <TabsTrigger
            value="services"
            className="min-w-0 gap-1.5 px-2 sm:gap-2 sm:px-3"
          >
            <ScissorsIcon className="hidden sm:block" />
            {t("Services", "Услуги")}
            {services && <Badge variant="secondary">{services.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger
            value="staff"
            className="min-w-0 gap-1.5 px-2 sm:gap-2 sm:px-3"
          >
            <UsersIcon className="hidden sm:block" />
            {t("Staff", "Тим")}
            {staff && <Badge variant="secondary">{staff.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="min-w-0">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-muted-foreground">
                {t(
                  "Set prices, duration and who provides each service.",
                  "Поставете цени, времетраење и кој ја извршува секоја услуга.",
                )}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <CategoryList orgId={orgId} />
                <Button
                  className="h-11"
                  onClick={() => setIsAddServiceOpen(true)}
                >
                  <PlusIcon data-icon="inline-start" />
                  {t("Add service", "Додај услуга")}
                </Button>
              </div>
            </div>
            {(!!services?.length || serviceSearch) && (
              <WorkspaceSearch
                label={t(
                  "Search services or categories",
                  "Пребарај услуги или категории",
                )}
                value={serviceSearch}
                onChange={setServiceSearch}
              />
            )}
            <ServiceList
              orgId={orgId}
              searchQuery={serviceSearch}
              onAddService={() => setIsAddServiceOpen(true)}
              onClearSearch={() => setServiceSearch("")}
            />
          </div>
        </TabsContent>

        <TabsContent value="staff" className="min-w-0">
          <div className="flex min-h-full flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-muted-foreground">
                {t(
                  "Manage your team, working hours and time off.",
                  "Управувајте со тимот, работното време и отсуствата.",
                )}
              </p>
              <Button
                onClick={() => setIsAddStaffOpen(true)}
                disabled={!planStatus?.canUseStaffRole}
                aria-describedby={
                  planStatus?.isFree ? "staff-plan-limit" : undefined
                }
                className="h-11 w-full sm:w-fit sm:shrink-0"
              >
                <PlusIcon data-icon="inline-start" />
                {t("Add staff member", "Додај вработен")}
              </Button>
            </div>
            {(!!staff?.length || staffSearch) && (
              <WorkspaceSearch
                label={t("Search staff", "Пребарај вработени")}
                value={staffSearch}
                onChange={setStaffSearch}
              />
            )}
            <StaffList
              orgId={orgId}
              searchQuery={staffSearch}
              onClearSearch={() => setStaffSearch("")}
              onAddClick={() => setIsAddStaffOpen(true)}
              canManageAppointmentEmail={profile.role === "owner"}
            />
            <StaffPlanFooter />
          </div>
        </TabsContent>
      </Tabs>

      {isAddServiceOpen && (
        <ServiceFormDialog
          orgId={orgId}
          open
          onOpenChange={setIsAddServiceOpen}
        />
      )}
      {isAddStaffOpen && (
        <StaffFormDialog
          orgId={orgId}
          open
          canManageAppointmentEmail={profile.role === "owner"}
          onOpenChange={setIsAddStaffOpen}
        />
      )}
    </div>
  );
}
