"use client";

import { type ComponentProps } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { BookingSidebar } from "./BookingSidebar";

export function BookingDetailsPanel(
  props: ComponentProps<typeof BookingSidebar>,
) {
  const { t } = useDashboardI18n();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (isDesktop) {
    return (
      <div className="hidden w-[380px] shrink-0 flex-col rounded-xl bg-card lg:flex">
        <BookingSidebar key={props.booking?._id ?? "empty"} {...props} />
      </div>
    );
  }

  return (
    <Drawer
      autoFocus
      open={props.booking !== null}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DrawerContent className="dashboard-panel h-[90dvh] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
        <DrawerTitle className="sr-only">
          {t("Booking details", "Детали за термин")}
        </DrawerTitle>
        <DrawerDescription className="sr-only">
          {t(
            "View and manage the selected appointment.",
            "Прегледајте и управувајте со избраниот термин.",
          )}
        </DrawerDescription>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {props.booking && (
            <BookingSidebar
              key={props.booking._id}
              {...props}
              className="h-auto min-h-full"
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
