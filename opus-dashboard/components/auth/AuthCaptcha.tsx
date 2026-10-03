"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { mountAuthCaptcha } from "../../../shared/turnstile";
import { Field, FieldDescription } from "@/components/ui/field";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export function AuthCaptcha({
  siteKey,
  onToken,
  onError,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  onError: () => void;
}) {
  const { t } = useDashboardI18n();
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready && container.current)
      return mountAuthCaptcha(container.current, siteKey, onToken, onError);
  }, [ready, siteKey, onToken, onError]);

  return (
    <Field>
      <FieldDescription data-replay-public>
        {t(
          "Complete the security check to receive your code.",
          "Завршете ја безбедносната проверка за да го добиете кодот.",
        )}
      </FieldDescription>
      <div ref={container} className="min-h-16 w-full" />
      <Script
        id="opus-auth-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={onError}
      />
    </Field>
  );
}
