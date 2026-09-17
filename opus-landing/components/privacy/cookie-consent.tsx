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
  const copy = consentCopy.en;
  const pathname = usePathname();
  const snapshot = useSyncExternalStore(
    subscribeConsent,
    readConsentSnapshot,
    serverSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Consent>(DENIED_CONSENT);

  useEffect(() => {
    const show = () => {
      setDraft(getConsent());
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
    setOpen(false);
  };
  if (snapshot !== null && !open) return null;

  return (
    <aside
      aria-label={copy.title}
      className="cookie-consent fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl"
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
            href="/privacy#cookies"
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
