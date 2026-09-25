"use client";

import { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export function CopyButton({
  text,
  label,
  disabled = false,
}: {
  text: string;
  label: string;
  disabled?: boolean;
}) {
  const { t } = useDashboardI18n();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11"
      disabled={disabled || !text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          toast.error(
            t(
              "Could not copy. Select and copy the text instead.",
              "Не успеа копирањето. Означете го текстот и копирајте го.",
            ),
          );
        }
      }}
    >
      {copied ? (
        <Check data-icon="inline-start" />
      ) : (
        <Copy data-icon="inline-start" />
      )}
      <span aria-live="polite">{copied ? t("Copied", "Копирано") : label}</span>
    </Button>
  );
}
