"use client";

import { useState, useEffect, useRef } from "react";
import { CircleAlert, Globe2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { validHostname, type FieldErrors } from "../validation";
import { SettingsCard } from "../SettingsCard";

interface DomainTabProps {
  orgId: Id<"orgs">;
  initialData: {
    customDomain: string;
  };
}

type Fields = "customDomain";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
      <CircleAlert className="shrink-0" />
      {message}
    </p>
  );
}

export function DomainTab({ orgId, initialData }: DomainTabProps) {
  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const [domain, setDomain] = useState({ customDomain: initialData.customDomain });
  const [errors, setErrors] = useState<FieldErrors<Fields>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDomain({ customDomain: initialData.customDomain });
  }, [initialData.customDomain]);

  const connectCustomDomain = useMutation(api.orgSettings.connectCustomDomain);

  function validate(): FieldErrors<Fields> {
    const errs: FieldErrors<Fields> = {};
    const raw = domain.customDomain.trim();
    // Allow clearing the domain (empty = remove)
    if (raw && !validHostname(raw))
      errs.customDomain =
        "Enter a valid hostname (e.g. book.mybusiness.com). No http://, no trailing slash.";
    return errs;
  }

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setIsSaving(true);
    try {
      await connectCustomDomain({
        orgId,
        customDomain: domain.customDomain.trim() || undefined,
      });
      if (isMounted.current) toast.success("Domain updated");
    } catch (error) {
      if (isMounted.current) {
        toast.error(error instanceof Error ? error.message : "Failed to update domain.");
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent
      value="domain"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <SettingsCard
        title="Custom domain"
        description="Use a domain your customers already recognize for the public booking experience."
        contentClassName="grid gap-6"
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Spinner /> : <Save />}
            {isSaving ? "Connecting…" : "Save domain"}
          </Button>
        }
      >
          <div className="grid gap-2 max-w-xl">
            <Label htmlFor="vercel-bound-cname-endpoint">
              Your custom domain
            </Label>
            <DebouncedInput
              id="vercel-bound-cname-endpoint"
              placeholder="book.mybusiness.com"
              value={domain.customDomain}
              maxLength={253}
              aria-describedby={
                errors.customDomain
                  ? "domain-error"
                  : "domain-hint"
              }
              aria-invalid={!!errors.customDomain}
              className={cn(
                "font-mono text-sm",
                errors.customDomain && "border-destructive",
              )}
              onChange={(val) => {
                setDomain({ customDomain: val });
                if (errors.customDomain) {
                  setErrors((current) => ({ ...current, customDomain: undefined }));
                }
              }}
            />
            <FieldError id="domain-error" message={errors.customDomain} />
          </div>

          <Alert id="domain-hint">
            <Globe2 />
            <AlertTitle>DNS setup</AlertTitle>
            <AlertDescription>
              Add a <strong className="font-mono">CNAME</strong> record at your
              registrar pointing to{" "}
              <strong className="font-mono">cname.vercel-dns.com</strong>, then
              save the hostname here. Clear the field to disconnect it.
            </AlertDescription>
          </Alert>
      </SettingsCard>
    </TabsContent>
  );
}
