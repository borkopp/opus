"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, FileText } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { MessageFooter } from "@/components/ui/message";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AssistantMessageActions({
  text,
  reportHref,
  onOpenReport,
}: {
  text: string;
  reportHref?: string;
  onOpenReport?: () => void;
}) {
  const { t } = useDashboardI18n();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (reset.current) clearTimeout(reset.current);
    },
    [],
  );
  async function copy() {
    if (reset.current) clearTimeout(reset.current);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      reset.current = setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
    }
  }
  const copyLabel =
    copyState === "copied"
      ? t("Copied", "Копирано", "U kopjua")
      : t("Copy answer", "Копирај го одговорот", "Kopjo përgjigjen");
  const reportLabel = t("Full report", "Цел извештај", "Raporti i plotë");
  return (
    <TooltipProvider delayDuration={250}>
      <MessageFooter className="gap-1 px-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-11 sm:size-8"
              aria-label={copyLabel}
              onClick={copy}
            >
              {copyState === "copied" ? <Check /> : <Copy />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copyLabel}</TooltipContent>
        </Tooltip>
        {(onOpenReport || reportHref) && (
          <Tooltip>
            <TooltipTrigger asChild>
              {onOpenReport ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-11 sm:size-8"
                  aria-label={reportLabel}
                  onClick={onOpenReport}
                >
                  <FileText />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-11 sm:size-8"
                  asChild
                >
                  <Link href={reportHref!} aria-label={reportLabel}>
                    <FileText />
                  </Link>
                </Button>
              )}
            </TooltipTrigger>
            <TooltipContent>{reportLabel}</TooltipContent>
          </Tooltip>
        )}
        <span
          role="status"
          className={
            copyState === "failed" ? "text-xs text-muted-foreground" : "sr-only"
          }
        >
          {copyState === "copied"
            ? copyLabel
            : copyState === "failed"
              ? t(
                  "Could not copy. Select the answer text to copy it.",
                  "Копирањето не успеа. Изберете го текстот за да го копирате.",
                  "Kopjimi dështoi. Përzgjidhni tekstin për ta kopjuar.",
                )
              : ""}
        </span>
      </MessageFooter>
    </TooltipProvider>
  );
}
