"use client";

import type { LucideIcon } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReservationSelect } from "./ReservationFields";

export function ReservationSectionNavigation({
  sections,
  value,
  onValueChange,
}: {
  sections: { value: string; label: string; icon: LucideIcon }[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const { t } = useDashboardI18n();
  return (
    <div className="dashboard-settings-nav min-w-0">
      <div className="md:hidden">
        <ReservationSelect
          label={t("Section", "Секција", "Seksioni")}
          value={value}
          onChange={onValueChange}
          options={sections}
        />
      </div>
      <div className="hidden md:block">
        <TabsList
          aria-label={t("Sections", "Секции", "Seksionet")}
          className="w-full border-0 bg-transparent"
        >
          {sections.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <Icon />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </div>
  );
}
