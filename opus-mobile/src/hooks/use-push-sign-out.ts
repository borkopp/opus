import { useCallback } from "react";
import { signOutWithPushCleanup } from "@/lib/sign-out";

export function usePushSignOut() {
  return useCallback(() => signOutWithPushCleanup(), []);
}
