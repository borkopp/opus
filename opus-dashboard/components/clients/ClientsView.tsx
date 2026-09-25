"use client";

import {
  ArrowLeft,
  ArrowRight,
  Search,
  UsersRound,
  Repeat2,
  CalendarCheck2,
  X,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PaidFeatureOverlay } from "@/components/ui/paid-feature-overlay";
import type { ClientDirectory, ClientSegment, ClientSort } from "@/lib/clients";
import { ClientList } from "./ClientList";

export type ClientFilters = {
  search: string;
  segment: ClientSegment;
  sort: ClientSort;
  page: number;
};
export const DEFAULT_CLIENT_FILTERS: ClientFilters = {
  search: "",
  segment: "all",
  sort: "recent",
  page: 0,
};

export function ClientsView({
  data,
  filters,
  onFiltersChange,
  onSelect,
  locked = false,
}: {
  data?: ClientDirectory;
  filters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
  onSelect: (id: string) => void;
  locked?: boolean;
}) {
  const { t } = useDashboardI18n();
  const change = (patch: Partial<ClientFilters>) =>
    onFiltersChange({ ...filters, page: 0, ...patch });
  const metrics = [
    {
      label: t("Clients", "Клиенти"),
      shortLabel: t("Clients", "Клиенти"),
      value: data?.summary.clients,
      icon: UsersRound,
      description: t(
        "In your studio's address book",
        "Во именикот на вашето студио",
      ),
    },
    {
      label: t("Completed visits", "Завршени посети"),
      shortLabel: t("Visits", "Посети"),
      value: data?.summary.completedVisits,
      icon: CalendarCheck2,
      description: t("Every completed appointment", "Секој завршен термин"),
    },
    {
      label: t("Returning clients", "Клиенти што се враќаат"),
      shortLabel: t("Returning", "Повторни"),
      value: data?.summary.returningClients,
      icon: Repeat2,
      description: t(
        "Two or more completed visits",
        "Две или повеќе завршени посети",
      ),
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <div className="relative">
        <DashboardPageHeader
          title={t("Clients", "Клиенти")}
          description={t(
            "Contact details, past visits and the next appointment.",
            "Контакт, претходни посети и следниот закажан термин.",
          )}
        />
        <Badge variant="pro" className="absolute top-0 right-0">
          Pro
        </Badge>
      </div>
      {locked ? (
        <PaidFeatureOverlay
          locked
          featureLabel={t(
            "Client profiles are included in Pro",
            "Профилите на клиенти се дел од Pro",
          )}
        >
          <div className="flex min-h-96 flex-col gap-5 rounded-3xl bg-card p-8">
            <Skeleton className="h-12 w-2/3" />
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-14 w-full" />
            ))}
          </div>
        </PaidFeatureOverlay>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {metrics.map((metric) => (
              <Card
                key={metric.label}
                className="gap-3 rounded-2xl border-0 py-4 shadow-none sm:rounded-3xl sm:py-5"
              >
                <CardHeader className="flex flex-row items-center justify-between gap-3 px-3 pb-0 sm:px-5">
                  <CardDescription className="text-xs sm:text-sm">
                    <span className="sm:hidden">{metric.shortLabel}</span>
                    <span className="hidden sm:inline">{metric.label}</span>
                  </CardDescription>
                  <metric.icon
                    className="hidden size-4 shrink-0 text-muted-foreground sm:block"
                    aria-hidden="true"
                  />
                </CardHeader>
                <CardContent className="flex flex-col gap-2 px-3 sm:px-5">
                  <p className="text-3xl font-medium tracking-tight tabular-nums">
                    {metric.value ?? "—"}
                  </p>
                  <p className="hidden text-xs text-muted-foreground sm:block">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="min-w-0 gap-5 rounded-3xl border-0 py-5 shadow-none">
            <CardHeader className="min-w-0 grid-cols-1 gap-4 px-5 sm:px-6">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
                <CardTitle>
                  {t("Client directory", "Именик на клиенти")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Visit totals count completed appointments only.",
                    "Вкупните посети ги вклучуваат само завршените термини.",
                  )}
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <InputGroup className="w-full lg:max-w-sm">
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label={t("Search clients", "Пребарај клиенти")}
                    placeholder={t(
                      "Search name, email or phone",
                      "Пребарај име, е-пошта или телефон",
                    )}
                    value={filters.search}
                    maxLength={150}
                    onChange={(event) => change({ search: event.target.value })}
                  />
                  {filters.search && (
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label={t("Clear search", "Исчисти пребарување")}
                        size="icon-xs"
                        onClick={() => change({ search: "" })}
                      >
                        <X />
                      </InputGroupButton>
                    </InputGroupAddon>
                  )}
                </InputGroup>
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <Tabs
                    className="min-w-0 w-full sm:w-auto"
                    value={filters.segment}
                    onValueChange={(value) =>
                      change({ segment: value as ClientSegment })
                    }
                  >
                    <TabsList
                      className="w-full"
                      aria-label={t("Filter clients", "Филтрирај клиенти")}
                    >
                      <TabsTrigger
                        value="all"
                        className="px-2 text-xs sm:px-3 sm:text-sm"
                      >
                        {t("All", "Сите")}
                      </TabsTrigger>
                      <TabsTrigger
                        value="returning"
                        className="px-2 text-xs sm:px-3 sm:text-sm"
                      >
                        {t("Returning", "Повторни")}
                      </TabsTrigger>
                      <TabsTrigger
                        value="unvisited"
                        className="px-2 text-xs sm:px-3 sm:text-sm"
                      >
                        {t("No visits yet", "Без посети")}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Select
                    value={filters.sort}
                    onValueChange={(sort) =>
                      change({ sort: sort as ClientSort })
                    }
                  >
                    <SelectTrigger
                      aria-label={t("Sort clients", "Подреди клиенти")}
                      className="w-full sm:w-44"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="recent">
                          {t("Recent visits", "Последни посети")}
                        </SelectItem>
                        <SelectItem value="visits">
                          {t("Most visits", "Најмногу посети")}
                        </SelectItem>
                        <SelectItem value="name">
                          {t("Name A–Z", "Име А–Ш")}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 px-5 sm:px-6">
              {!data ? (
                <div
                  aria-label={t("Loading clients", "Се вчитуваат клиентите")}
                  className="flex flex-col gap-3"
                >
                  {[0, 1, 2, 3, 4].map((row) => (
                    <Skeleton key={row} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <ClientList
                    clients={data.clients}
                    filtered={Boolean(
                      filters.search || filters.segment !== "all",
                    )}
                    onSelect={onSelect}
                    onClear={() => onFiltersChange(DEFAULT_CLIENT_FILTERS)}
                  />
                  {data.total > 0 && (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                      <p aria-live="polite">
                        {data.page * data.pageSize + 1}–
                        {Math.min((data.page + 1) * data.pageSize, data.total)}{" "}
                        {t("of", "од")} {data.total}{" "}
                        {data.total === 1
                          ? t("client", "клиент")
                          : t("clients", "клиенти")}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={data.page === 0}
                          onClick={() => change({ page: data.page - 1 })}
                        >
                          <ArrowLeft data-icon="inline-start" />
                          {t("Previous", "Претходни")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            (data.page + 1) * data.pageSize >= data.total
                          }
                          onClick={() => change({ page: data.page + 1 })}
                        >
                          {t("Next", "Следни")}
                          <ArrowRight data-icon="inline-end" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
