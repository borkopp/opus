"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { IconDeviceFloppy, IconAlertCircle } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { validHostname, type FieldErrors } from "../validation";

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
      <IconAlertCircle size={13} className="shrink-0" />
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
    } catch (e: any) {
      if (isMounted.current) toast.error(e.message ?? "Failed to update domain.");
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent
      value="domain"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
        <div className="mb-8">
          <h2 className="text-2xl font-medium tracking-tight mb-1">Custom Domain</h2>
          <p className="text-muted-foreground">Use your own domain for your booking page.</p>
        </div>
        <div className="space-y-4">
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
                "bg-white font-mono text-sm",
                errors.customDomain && "border-destructive",
              )}
              onChange={(val) => {
                setDomain({ customDomain: val });
                errors.customDomain &&
                  setErrors((e) => ({ ...e, customDomain: undefined }));
              }}
            />
            <FieldError id="domain-error" message={errors.customDomain} />
          </div>

          <p id="domain-hint" className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            At your domain registrar (e.g. GoDaddy, Cloudflare), add a <strong className="text-foreground font-mono text-xs">CNAME</strong> record pointing to{" "}
            <strong className="text-foreground font-mono text-xs">cname.vercel-dns.com</strong>
            {" "}before saving here. Leave this field empty to remove the custom domain.
          </p>
        </div>

        <div className="mt-10 pt-6 flex">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <IconDeviceFloppy size={18} />
            {isSaving ? "Connecting…" : "Connect Domain"}
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
