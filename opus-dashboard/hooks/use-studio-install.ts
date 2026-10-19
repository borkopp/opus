"use client";

import { useSyncExternalStore } from "react";
import {
  getServerStudioInstallState,
  getStudioInstallState,
  subscribeToStudioInstall,
} from "@/lib/studio-install";

export function useStudioInstall() {
  return useSyncExternalStore(
    subscribeToStudioInstall,
    getStudioInstallState,
    getServerStudioInstallState,
  );
}
