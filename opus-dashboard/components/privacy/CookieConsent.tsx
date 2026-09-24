"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { syncPostHogConsent } from "@/lib/analytics-consent";
import {
  consentCopy,
  DENIED_CONSENT,
  getConsent,
  isPlatformHost,
  PREFERENCES_EVENT,
  readConsentSnapshot,
  saveConsent,
  subscribeConsent,
  type CookieConsent as Consent,
} from "../../../shared/analytics/consent";
import { observePixel } from "../../../shared/analytics/meta-pixel";

const serverSnapshot = () => "server";

export function CookieConsent() {
  const pathname = usePathname();
  const layoutSegment = useSelectedLayoutSegment();
  const snapshot = useSyncExternalStore(
    subscribeConsent,
    readConsentSnapshot,
    serverSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Consent>(DENIED_CONSENT);
  const { language } = useDashboardI18n();
  const copy = consentCopy[language];

  useEffect(() => {
    const show = () => {
      setDraft(getConsent());
      setOpen(true);
    };
    window.addEventListener(PREFERENCES_EVENT, show);
    return () => window.removeEventListener(PREFERENCES_EVENT, show);
  }, []);

  useEffect(() => {
    syncPostHogConsent();
    return observePixel(process.env.NEXT_PUBLIC_META_PIXEL_ID, "studio");
  }, [pathname]);

  if (
    snapshot === "server" ||
    !isPlatformHost(window.location.hostname) ||
    pathname.startsWith("/sites/")
  )
    return null;

  const save = (choice: Consent) => {
    saveConsent(choice);
    setDraft(choice);
    setOpen(false);
  };
  if (snapshot !== null && !open) {
    // Keep the shortcut off previews, auth, and onboarding; the dashboard menu provides it.
    if (
      layoutSegment === "(dashboard)" ||
      ["/login", "/signup", "/onboarding", "/dashboard-preview"].some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      )
    )
      return null;

    return (
      <div className="fixed bottom-3 left-3 z-40">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(getConsent());
            setOpen(true);
          }}
        >
          {copy.preferences}
        </Button>
      </div>
    );
  }

  return (
    <aside
      aria-label={copy.title}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl"
    >
      <Card className="max-h-[80dvh] overflow-y-auto shadow-xl">
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4">
            {(["analytics", "marketing"] as const).map((category) => (
              <Field key={category} orientation="horizontal">
                <FieldLabel htmlFor={`cookie-${category}`}>
                  {copy[category]}
                </FieldLabel>
                <Switch
                  id={`cookie-${category}`}
                  checked={draft[category]}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, [category]: checked })
                  }
                />
              </Field>
            ))}
          </FieldGroup>
          <a
            className="mt-4 inline-block text-sm underline underline-offset-4"
            href="https://opus.mk/privacy#cookies"
            target="_blank"
            rel="noreferrer"
          >
            {copy.privacy}
          </a>
        </CardContent>
        <CardFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => save(DENIED_CONSENT)}>
            {copy.reject}
          </Button>
          <Button
            variant="outline"
            onClick={() => save({ analytics: true, marketing: true })}
          >
            {copy.accept}
          </Button>
          <Button onClick={() => save(draft)}>{copy.save}</Button>
        </CardFooter>
      </Card>
    </aside>
  );
}
