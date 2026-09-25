"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { LogoPro } from "@/components/Logo";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function OpusProMenuItem() {
  const { t } = useDashboardI18n();

  return (
    <DropdownMenuItem asChild className="cursor-pointer justify-between py-3">
      <Link
        href="/settings?tab=billing"
        aria-label={t("Explore OPUS Pro", "Разгледајте го OPUS Pro")}
      >
        <LogoPro className="text-lg" markClassName="size-5" />
        <ArrowUpRight aria-hidden="true" />
      </Link>
    </DropdownMenuItem>
  );
}
