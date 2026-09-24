"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const pathname = usePathname();
  // Clarity is the dashboard's single production appearance. Studio remains
  // a design reference until theme switching is implemented separately.
  const clarity = [
    "/beauty",
    "/settings",
    "/notifications",
    "/gap-optimizer",
    "/ai-inbox",
  ].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  return (
    <NextThemesProvider
      {...props}
      forcedTheme={clarity ? "light" : props.forcedTheme}
    >
      {children}
    </NextThemesProvider>
  );
}
