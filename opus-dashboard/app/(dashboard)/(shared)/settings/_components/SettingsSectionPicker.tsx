"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export function SettingsSectionPicker({
  sections,
  value,
  onValueChange,
}: {
  sections: readonly {
    value: string;
    labelEn: string;
    labelMk: string;
    labelSq?: string;
    icon: LucideIcon;
  }[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const { t } = useDashboardI18n();
  const [open, setOpen] = useState(false);
  const selected =
    sections.find((section) => section.value === value) ?? sections[0];
  const Icon = selected.icon;
  return (
    <Drawer autoFocus open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="min-h-12 w-full justify-between md:hidden"
          aria-label={t(
            `Settings section: ${selected.labelEn}`,
            `Секција за поставки: ${selected.labelMk}`,
            `Seksioni i cilësimeve: ${selected.labelSq ?? selected.labelEn}`,
          )}
        >
          <span data-replay-public className="flex items-center gap-3">
            <Icon />
            {t(selected.labelEn, selected.labelMk, selected.labelSq)}
          </span>
          <ChevronDown />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="dashboard-panel data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
        <DrawerHeader>
          <DrawerTitle data-replay-public>
            {t("Settings sections", "Секции за поставки", "Seksionet e cilësimeve")}
          </DrawerTitle>
          <DrawerDescription data-replay-public>
            {t(
              "Choose what you want to manage.",
              "Изберете што сакате да уредите.",
              "Zgjidhni çfarë dëshironi të menaxhoni.",
            )}
          </DrawerDescription>
        </DrawerHeader>
        <nav
          className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          aria-label={t("Settings sections", "Секции за поставки", "Seksionet e cilësimeve")}
        >
          {sections.map(
            ({ value: sectionValue, labelEn, labelMk, labelSq, icon: SectionIcon }) => (
              <Button
                data-replay-public
                key={sectionValue}
                variant={value === sectionValue ? "secondary" : "ghost"}
                className="min-h-12 w-full justify-start gap-3"
                aria-current={value === sectionValue ? "page" : undefined}
                onClick={() => {
                  onValueChange(sectionValue);
                  setOpen(false);
                }}
              >
                <SectionIcon data-icon="inline-start" />
                {t(labelEn, labelMk, labelSq)}
                {value === sectionValue && <Check className="ml-auto" />}
              </Button>
            ),
          )}
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
