"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const pathname = usePathname();
  // Both dashboard appearances have their own light palette. Keep system dark
  // mode from overriding their tokens, including portal-based dialogs.
  const dashboard = [
    "/beauty",
    "/settings",
    "/notifications",
    "/gap-optimizer",
    "/ai-inbox",
    "/onboarding",
    "/dashboard-preview",
  ].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  return (
    <NextThemesProvider
      {...props}
      forcedTheme={dashboard ? "light" : props.forcedTheme}
    >
      {children}
    </NextThemesProvider>
  );
}
