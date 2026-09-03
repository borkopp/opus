"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  ScissorsIcon,
  SearchXIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Price } from "@/components/ui/price";
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
import { getErrorMessage, getImageStorageUrl } from "@/lib/file-validation";
import { cn } from "@/lib/utils";
import { ServiceFormDialog } from "./ServiceFormDialog";

type ServiceGroup = {
  key: string;
  name: string;
  services: Doc<"services">[];
};

export function ServiceList({
  orgId,
  searchQuery,
  onAddService,
  onClearSearch,
}: {
  orgId: Id<"orgs">;
  searchQuery: string;
  onAddService: () => void;
  onClearSearch: () => void;
}) {
  const { t } = useDashboardI18n();
  const categories = useQuery(api.serviceCategories.listCategories, { orgId });
  const services = useQuery(api.services.listServices, { orgId });
  const deactivateService = useMutation(api.services.deactivateService);
  const reorderServices = useMutation(api.services.reorderServices);

  const [editingServiceId, setEditingServiceId] =
    useState<Id<"services"> | null>(null);

  const serviceGroups = useMemo<ServiceGroup[]>(() => {
    if (!services || !categories) return [];

    const query = searchQuery.trim().toLocaleLowerCase();
    const categoryNames = new Map(
      categories.map((category) => [category._id, category.name]),
    );
    const visibleServices = query
      ? services.filter((service) => {
          const categoryName = service.categoryId
            ? categoryNames.get(service.categoryId)
            : undefined;

          return (
            service.name.toLocaleLowerCase().includes(query) ||
            categoryName?.toLocaleLowerCase().includes(query)
          );
        })
      : services;

    const groups: ServiceGroup[] = categories
      .map((category) => ({
        key: category._id,
        name: category.name,
        services: visibleServices.filter(
          (service) => service.categoryId === category._id,
        ),
      }))
      .filter((group) => group.services.length > 0);

    const uncategorized = visibleServices.filter(
      (service) =>
        !service.categoryId || !categoryNames.has(service.categoryId),
    );

    if (uncategorized.length > 0) {
      groups.push({
        key: "uncategorized",
        name: t("Other", "Друго"),
        services: uncategorized,
      });
    }

    return groups;
  }, [categories, searchQuery, services, t]);

  if (categories === undefined || services === undefined) {
    return (
      <div className="overflow-hidden rounded-xl border">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 border-b px-5 py-4 last:border-b-0"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <Skeleton className="size-12 rounded-lg sm:size-14" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const handleRemove = async (
    serviceId: Id<"services">,
    serviceName: string,
  ) => {
    if (
      !window.confirm(
        t(
          `Remove “${serviceName}”? Customers will no longer be able to book it.`,
          `Дали сакате да ја отстраните „${serviceName}“? Клиентите повеќе нема да можат да ја закажуваат.`,
        ),
      )
    ) {
      return;
    }

    try {
      await deactivateService({ orgId, serviceId });
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          t("Could not remove service", "Не може да се отстрани услугата"),
        ),
      );
    }
  };

  const moveService = async (
    groupServices: Doc<"services">[],
    index: number,
    direction: "up" | "down",
  ) => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= groupServices.length) return;

    const nextOrder = [...groupServices];
    [nextOrder[index], nextOrder[nextIndex]] = [
      nextOrder[nextIndex],
      nextOrder[index],
    ];

    try {
      await reorderServices({
        orgId,
        serviceIds: nextOrder.map((service) => service._id),
      });
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          t(
            "Could not reorder services",
            "Не може да се промени редоследот на услугите",
          ),
        ),
      );
    }
  };

  if (services.length === 0) {
    return (
      <Empty className="min-h-[360px] border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ScissorsIcon />
          </EmptyMedia>
          <EmptyTitle>{t("No services yet", "Сè уште нема услуги")}</EmptyTitle>
          <EmptyDescription>
            {t(
              "Add your first service so customers can start booking.",
              "Додајте ја вашата прва услуга за клиентите да можат да закажуваат.",
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            onClick={onAddService}
            className="transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none"
          >
            <PlusIcon data-icon="inline-start" />
            {t("Add service", "Додај услуга")}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (serviceGroups.length === 0) {
    return (
      <Empty className="min-h-[280px] border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>
            {t("No matching services", "Нема пронајдено услуги")}
          </EmptyTitle>
          <EmptyDescription>
            {t(
              "Try a different name or category.",
              "Обидете се со друго име или категорија.",
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onClearSearch}>
            {t("Clear search", "Исчисти пребарување")}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card shadow-s">
        {serviceGroups.map((group, groupIndex) => (
          <section key={group.key} className={cn(groupIndex > 0 && "border-t")}>
            {(serviceGroups.length > 1 || group.key !== "uncategorized") && (
              <div className="bg-muted/35 px-4 py-2.5 sm:px-5">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {group.name}
                </h2>
              </div>
            )}

            <div className="divide-y">
              {group.services.map((service, index) => (
                <div
                  key={service._id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5",
                    !service.isActive && "bg-muted/20",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setEditingServiceId(service._id)}
                    className="flex min-w-0 flex-1 items-center gap-3.5 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 sm:gap-4"
                  >
                    <Avatar className="size-12 shrink-0 rounded-lg border bg-muted sm:size-14">
                      <AvatarImage
                        src={getImageStorageUrl(service.photoUrl)}
                        alt={service.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-lg text-muted-foreground">
                        <ScissorsIcon className="size-5" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "truncate font-medium text-foreground",
                            !service.isActive && "text-muted-foreground",
                          )}
                        >
                          {service.name}
                        </span>
                        {!service.isActive && (
                          <Badge variant="secondary">
                            {t("Inactive", "Неактивна")}
                          </Badge>
                        )}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {service.durationMins} {t("min", "мин")}
                      </span>
                    </div>
                  </button>

                  <div className="shrink-0 text-right text-sm font-medium tabular-nums text-foreground sm:text-base">
                    <Price amount={service.priceMinorUnits} />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t(
                          `Actions for ${service.name}`,
                          `Опции за ${service.name}`,
                        )}
                      >
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onSelect={() => setEditingServiceId(service._id)}
                        >
                          <PencilIcon />
                          {t("Edit service", "Уреди услуга")}
                        </DropdownMenuItem>
                        {!searchQuery.trim() && group.services.length > 1 && (
                          <>
                            <DropdownMenuItem
                              disabled={index === 0}
                              onSelect={() =>
                                moveService(group.services, index, "up")
                              }
                            >
                              <ArrowUpIcon />
                              {t("Move up", "Помести нагоре")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={index === group.services.length - 1}
                              onSelect={() =>
                                moveService(group.services, index, "down")
                              }
                            >
                              <ArrowDownIcon />
                              {t("Move down", "Помести надолу")}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() =>
                            handleRemove(service._id, service.name)
                          }
                        >
                          <Trash2Icon />
                          {t("Remove service", "Отстрани услуга")}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {editingServiceId !== null && (
        <ServiceFormDialog
          orgId={orgId}
          serviceId={editingServiceId}
          open
          onOpenChange={(open) => {
            if (!open) setEditingServiceId(null);
          }}
        />
      )}
    </>
  );
}
