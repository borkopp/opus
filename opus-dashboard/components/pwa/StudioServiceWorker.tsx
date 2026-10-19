"use client";

import { useEffect } from "react";
import { registerStudioServiceWorker } from "@/lib/studio-service-worker";

export function StudioServiceWorker() {
  useEffect(() => {
    // Installation and the offline screen work without notification permission.
    // A failed registration must never prevent someone using their dashboard.
    const register = () => {
      void registerStudioServiceWorker().catch(() => {});
    };
    register();
    window.addEventListener("online", register);
    return () => window.removeEventListener("online", register);
  }, []);

  return null;
}
