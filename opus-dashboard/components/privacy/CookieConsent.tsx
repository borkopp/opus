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
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [draft, setDraft] = useState<Consent>(DENIED_CONSENT);
  const { language } = useDashboardI18n();
  const copy = consentCopy[language];

  useEffect(() => {
    const show = () => {
      setDraft(getConsent());
      setIsConfiguring(true);
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
    setIsConfiguring(false);
    setOpen(false);
  };
  const handleBack = () => {
    if (snapshot !== null) {
      setOpen(false);
    } else {
      setIsConfiguring(false);
    }
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
            setIsConfiguring(true);
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
      aria-label={isConfiguring ? copy.preferences : copy.title}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl"
    >
      <Card className="max-h-[80dvh] overflow-y-auto shadow-xl">
        <CardHeader className="px-4 pb-3 sm:px-6">
          <CardTitle>{isConfiguring ? copy.preferences : copy.title}</CardTitle>
          <CardDescription>
            {isConfiguring ? copy.description : copy.summary}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-3 sm:px-6">
          {isConfiguring && (
            <FieldGroup className="mb-4 gap-4">
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
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <a
              className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
              href="https://opus.mk/privacy#cookies"
              target="_blank"
              rel="noreferrer"
            >
              {copy.privacy}
            </a>
            <Button
              variant="ghost"
              className="ml-auto min-h-11 px-2"
              onClick={
                isConfiguring ? handleBack : () => setIsConfiguring(true)
              }
            >
              {isConfiguring ? copy.back : copy.preferences}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-2 px-4 pb-4 sm:px-6">
          <Button
            variant="outline"
            className="min-h-11 px-3"
            onClick={() => save(DENIED_CONSENT)}
          >
            {copy.reject}
          </Button>
          <Button
            className="min-h-11 px-3"
            onClick={() =>
              save(isConfiguring ? draft : { analytics: true, marketing: true })
            }
          >
            {isConfiguring ? copy.save : copy.accept}
          </Button>
        </CardFooter>
      </Card>
    </aside>
  );
}
