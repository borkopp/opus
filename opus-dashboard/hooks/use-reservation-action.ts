"use client";
import { useState } from "react";
import { toast } from "sonner";
import { accountErrorMessage } from "@/lib/account-errors";
import { useReservationCopy } from "./use-reservation-copy";

export function useReservationAction() {
  const copy = useReservationCopy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<unknown>, success?: string) {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      await action();
      if (success)
        toast.success(success, {
          id: "reservation-action-success",
          position: "top-center",
          // Status-only feedback must not obstruct the next visit action.
          style: { pointerEvents: "none" },
        });
      return true;
    } catch (cause) {
      setError(
        accountErrorMessage(
          cause,
          copy("Could not save this change. Please try again."),
        ),
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}
