"use client";

import dynamic from "next/dynamic";

// The real assistant mounts reports after its client-side query resolves.
// Match that behavior: browser and server Intl locale support can differ.
export const AssistantCanvasLoader = dynamic(
  () => import("./assistant-canvas").then((module) => module.AssistantCanvas),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="p-8 text-sm text-muted-foreground">
        Loading preview…
      </p>
    ),
  },
);
