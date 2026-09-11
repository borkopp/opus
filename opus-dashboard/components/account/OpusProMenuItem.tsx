"use client";

import { ArrowUpRight } from "lucide-react";
import { LogoPro } from "@/components/Logo";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function OpusProMenuItem() {
  const { t } = useDashboardI18n();

  return (
    <DropdownMenuItem asChild className="cursor-pointer justify-between py-3">
      <a
        href="https://opus.mk/#pricing"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t(
          "Explore OPUS Pro (opens in a new tab)",
          "Разгледајте го OPUS Pro (се отвора во нов таб)",
        )}
      >
        <LogoPro className="text-lg" markClassName="size-5" />
        <ArrowUpRight aria-hidden="true" />
      </a>
    </DropdownMenuItem>
  );
}
