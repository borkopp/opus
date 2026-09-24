"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DashboardTheme } from "@/lib/dashboard-theme";

const DashboardAppearanceContext = createContext<DashboardTheme>("clarity");

export function DashboardAppearanceProvider({
  theme,
  children,
}: {
  theme: DashboardTheme;
  children: ReactNode;
}) {
  return (
    <DashboardAppearanceContext.Provider value={theme}>
      {children}
    </DashboardAppearanceContext.Provider>
  );
}

export function useDashboardAppearance() {
  return useContext(DashboardAppearanceContext);
}
