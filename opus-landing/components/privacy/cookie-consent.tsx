"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
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
import { useI18n } from "@/lib/i18n/context";
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
  const { locale } = useI18n();
  const copy = consentCopy[locale] || consentCopy.mk;
  const pathname = usePathname();
  const snapshot = useSyncExternalStore(
    subscribeConsent,
    readConsentSnapshot,
    serverSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [draft, setDraft] = useState<Consent>(DENIED_CONSENT);

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
    return observePixel(process.env.NEXT_PUBLIC_META_PIXEL_ID, "landing");
  }, [pathname]);

  if (snapshot === "server" || !isPlatformHost(window.location.hostname))
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

  if (snapshot !== null && !open) return null;

  return (
    <aside
      aria-label={isConfiguring ? copy.preferences : copy.title}
      className="cookie-consent fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl"
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
              href="/privacy#cookies"
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
        <CardFooter className="flex flex-wrap justify-end gap-2 px-4 sm:px-6">
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
