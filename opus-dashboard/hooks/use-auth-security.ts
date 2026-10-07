"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthSecurityPolicy } from "@/lib/auth-protection";

/** Shared CAPTCHA readiness for sign-in and booking-time account creation. */
export function useAuthSecurity(enabled = true) {
  const [policy, setPolicy] = useState<AuthSecurityPolicy | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void fetch("/api/auth/security", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Security check unavailable");
        const value: AuthSecurityPolicy = await response.json();
        if (
          typeof value.required !== "boolean" ||
          (value.required && !value.siteKey)
        )
          throw new Error("Security check unavailable");
        setPolicy(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, [enabled]);
  const reset = useCallback(() => {
    setToken(null);
    setGeneration((value) => value + 1);
  }, []);
  return {
    policy,
    unavailable,
    token,
    setToken,
    generation,
    reset,
    ready: Boolean(policy && !unavailable && (!policy.required || token)),
  };
}
