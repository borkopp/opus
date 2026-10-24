"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useI18n } from "@/lib/i18n/context";
import { localizedPath } from "@/lib/i18n/routing";

export function LocalizedLink({ href, ...props }: ComponentProps<typeof Link>) {
  const { locale } = useI18n();
  return (
    <Link
      {...props}
      href={typeof href === "string" ? localizedPath(href, locale) : href}
    />
  );
}
