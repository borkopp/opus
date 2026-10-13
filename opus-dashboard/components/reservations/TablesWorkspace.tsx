"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Layers, LayoutGrid, MapPin, Table2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ReservationSectionNavigation } from "./ReservationSectionNavigation";
import { VenueResources } from "./VenueResources";

type Workspace = FunctionReturnType<typeof api.hospitality.getWorkspace>;

export function TablesWorkspace() {
  const copy = useReservationCopy();
  const { t } = useDashboardI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const access = useQuery(api.hospitality.getAccess);
  const workspace = useQuery(
    api.hospitality.getWorkspace,
    access?.hasVenue ? {} : "skip",
  );
  if (!access || (access.hasVenue && !workspace))
    return <Skeleton className="h-96" />;
  if (!workspace) return null;
  const canManage = workspace.role === "owner" || workspace.role === "manager";
  const requested = searchParams.get("tab");
  const tab =
    canManage && ["tables", "areas", "combinations"].includes(requested ?? "")
      ? requested!
      : "overview";
  const navigate = (value: string) =>
    router.replace(`/hospitality/tables?tab=${value}`, { scroll: false });
  const sections = [
    {
      value: "overview",
      label: t("Overview", "Преглед", "Përmbledhje"),
      icon: LayoutGrid,
    },
    { value: "tables", label: copy("Tables"), icon: Table2 },
    { value: "areas", label: copy("Areas"), icon: MapPin },
    {
      value: "combinations",
      label: t("Combinations", "Комбинации", "Kombinimet"),
      icon: Layers,
    },
  ];
  return (
    <div className="flex min-h-full w-full min-w-0 flex-col gap-6 pb-12">
      <DashboardPageHeader
        title={copy("Tables")}
        description={t(
          "See your floor at a glance. Table status updates with each visit.",
          "Преглед на масите. Статусот се ажурира со секоја посета.",
          "Shikoni tavolinat me një vështrim. Statusi përditësohet me çdo vizitë.",
        )}
      >
        {canManage && tab === "overview" && (
          <Button asChild>
            <Link href="/hospitality/tables?tab=tables">
              <Table2 data-icon="inline-start" />
              {t("Manage tables", "Уреди маси", "Menaxho tavolinat")}
            </Link>
          </Button>
        )}
      </DashboardPageHeader>
      {canManage ? (
        <Tabs
          key={workspace.org._id}
          value={tab}
          onValueChange={navigate}
          orientation="vertical"
          className="dashboard-settings-tabs w-full"
        >
          <ReservationSectionNavigation
            sections={sections}
            value={tab}
            onValueChange={navigate}
          />
          <div className="min-w-0">
            <TabsContent value="overview">
              <TableOverview workspace={workspace} />
            </TabsContent>
            <TabsContent value="tables">
              <VenueResources workspace={workspace} section="table" />
            </TabsContent>
            <TabsContent value="areas">
              <VenueResources workspace={workspace} section="area" />
            </TabsContent>
            <TabsContent value="combinations">
              <VenueResources workspace={workspace} section="combination" />
            </TabsContent>
          </div>
        </Tabs>
      ) : (
        <TableOverview workspace={workspace} />
      )}
    </div>
  );
}

function TableOverview({ workspace }: { workspace: Workspace }) {
  const copy = useReservationCopy();
  const { t } = useDashboardI18n();
  if (!workspace.tables.length)
    return (
      <Card>
        <CardContent className="pt-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Table2 />
              </EmptyMedia>
              <EmptyTitle>
                {t(
                  "Your tables will appear here",
                  "Масите ќе се прикажат тука",
                  "Tavolinat tuaja do të shfaqen këtu",
                )}
              </EmptyTitle>
              <EmptyDescription>
                {workspace.role === "staff"
                  ? t(
                      "An owner or manager can add the venue’s tables.",
                      "Сопственик или менаџер може да ги додаде масите.",
                      "Pronari ose menaxheri mund të shtojë tavolinat.",
                    )
                  : t(
                      "Add tables, then arrange them into areas and optional combinations.",
                      "Додајте маси, па организирајте ги во зони и опционални комбинации.",
                      "Shtoni tavolina, pastaj organizojini në zona dhe kombinime opsionale.",
                    )}
              </EmptyDescription>
            </EmptyHeader>
            {workspace.role !== "staff" && (
              <Button asChild>
                <Link href="/hospitality/tables?tab=tables">
                  {copy("Add table")}
                </Link>
              </Button>
            )}
          </Empty>
        </CardContent>
      </Card>
    );
  const groups = [
    ...workspace.areas.map((area) => ({
      id: area._id,
      name: area.name,
      active: area.isActive,
      tables: workspace.tables.filter(
        (table) => table.floorPlanId === area._id,
      ),
    })),
    {
      id: "other",
      name: t("Other tables", "Други маси", "Tavolina të tjera"),
      active: false,
      tables: workspace.tables.filter(
        (table) =>
          !workspace.areas.some((area) => area._id === table.floorPlanId),
      ),
    },
  ].filter((group) => group.tables.length);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {t(
          "Current table state. Future bookings and visit actions are in Reservations.",
          "Тековна состојба на масите. Идните резервации и посетите се во Резервации.",
          "Gjendja aktuale e tavolinave. Rezervimet e ardhshme dhe veprimet për vizitat janë te Rezervimet.",
        )}
      </p>
      {groups.map((group) => (
        <section
          key={group.id}
          className="flex flex-col gap-3"
          aria-label={group.name}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium [overflow-wrap:anywhere]">
              {group.name}
            </h2>
            {!group.active && (
              <Badge variant="secondary">{copy("Inactive")}</Badge>
            )}
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.tables.map((table) => (
              <Card key={table._id} role="article" aria-label={table.label}>
                <CardHeader>
                  <CardTitle className="[overflow-wrap:anywhere]">
                    {table.label}
                  </CardTitle>
                  <CardDescription>
                    {table.minCapacity ?? 1}–{table.capacity} {copy("guests")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      table.status === "occupied" ? "default" : "secondary"
                    }
                  >
                    {copy(table.status)}
                  </Badge>
                  {group.active &&
                    table.isActive === false &&
                    table.status !== "inactive" && (
                      <Badge variant="outline">{copy("Inactive")}</Badge>
                    )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
