"use client";

import { type ComponentProps, useSyncExternalStore } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { BookingSidebar } from "./BookingSidebar";

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeToViewport(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function BookingDetailsPanel(
  props: ComponentProps<typeof BookingSidebar>,
) {
  const { t } = useDashboardI18n();
  const isDesktop = useSyncExternalStore(
    subscribeToViewport,
    getDesktopSnapshot,
    getServerSnapshot,
  );

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
      <DrawerContent className="h-[90dvh] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
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
