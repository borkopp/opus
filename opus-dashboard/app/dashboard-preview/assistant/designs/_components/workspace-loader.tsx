"use client";

import dynamic from "next/dynamic";

// Match the existing gallery: report number/date formatting happens in the browser.
export const DesignWorkspaceLoader = dynamic(
  () => import("./design-workspace").then((module) => module.DesignWorkspace),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="p-8 text-sm text-muted-foreground">
        Loading design…
      </p>
    ),
  },
);
