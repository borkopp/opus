"use client";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

import { useState } from "react";
import { useQuery } from "convex/react";
import { PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";
import { CategoryList } from "./CategoryList";
import { ServiceFormDialog } from "./ServiceFormDialog";
import { ServiceList } from "./ServiceList";

export function ServicesWorkspace() {
  const { t } = useDashboardI18n();
  const profile = useQuery(api.users.getMyProfile);
  const orgId = profile?.orgId;
  const services = useQuery(
    api.services.listServices,
    orgId ? { orgId } : "skip",
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);

  if (profile === undefined || services === undefined) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
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
      </div>
    );
  }

  if (profile === null || !orgId)
    return <div>{t("Not found", "Не е пронајдено")}</div>;

  const activeCount = services.filter((service) => service.isActive).length;
  const serviceSummary =
    services.length === 0
      ? t(
          "Add the services customers can book.",
          "Додајте ги услугите што клиентите можат да ги закажат.",
        )
      : activeCount === 1
        ? t("1 service available to book.", "1 достапна услуга за закажување.")
        : t(
            `${activeCount} services available to book.`,
            `${activeCount} достапни услуги за закажување.`,
          );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex min-h-full w-full flex-1 flex-col gap-6"
    >
      <DashboardPageHeader
        title={t("Services", "Услуги")}
        description={serviceSummary}
      >
        <div className="flex w-full gap-2 sm:w-auto">
          <CategoryList orgId={orgId} />
          <Button
            className="flex-1 transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none sm:flex-none"
            onClick={() => setIsAddServiceOpen(true)}
          >
            <PlusIcon data-icon="inline-start" />
            {t("Add service", "Додај услуга")}
          </Button>
        </div>
      </DashboardPageHeader>

      {(services.length > 6 || Boolean(searchQuery)) && (
        <InputGroup className="w-full sm:max-w-xs">
          <InputGroupInput
            aria-label={t("Search services", "Пребарај услуги")}
            placeholder={t("Search services", "Пребарај услуги")}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <InputGroupAddon align="inline-start">
            <SearchIcon />
          </InputGroupAddon>
          {searchQuery && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label={t("Clear search", "Исчисти пребарување")}
                size="icon-xs"
                onClick={() => setSearchQuery("")}
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      )}

      <ServiceList
        orgId={orgId}
        searchQuery={searchQuery}
        onAddService={() => setIsAddServiceOpen(true)}
        onClearSearch={() => setSearchQuery("")}
      />

      {isAddServiceOpen && (
        <ServiceFormDialog
          orgId={orgId}
          open={isAddServiceOpen}
          onOpenChange={setIsAddServiceOpen}
        />
      )}
    </motion.div>
  );
}
