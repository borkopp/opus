"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Globe2, X } from "lucide-react";
import { toast } from "sonner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Appear } from "@/components/ui/appear";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { appearStep } from "@/lib/appear";

export function LiveWebsiteCard({
  websiteUrl,
  showEnhancements = false,
}: {
  websiteUrl: string;
  showEnhancements?: boolean;
}) {
  const { t } = useDashboardI18n();
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const address = new URL(websiteUrl).host;
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(websiteUrl);
      setCopied(true);
      toast.success(
        t("Website link copied", "Линкот до веб-страницата е копиран"),
      );
    } catch {
      toast.error(
        t(
          "Could not copy the website link",
          "Не можеше да се копира линкот до веб-страницата",
        ),
      );
    }
  }

  return (
    <Appear
      as="section"
      delay={90}
      className="flex min-w-0 flex-col gap-4 rounded-[25px] bg-card p-5 md:min-h-[272px] md:gap-5 md:p-6"
      aria-label={t("Studio website", "Веб-страница на студиото")}
    >
      <div
        className="flex items-center gap-3 md:items-start"
        data-appear="item"
        style={appearStep(1)}
      >
        <span
          className="relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary md:size-12"
          aria-hidden="true"
        >
          <Globe2 className="size-5 md:size-6" />
          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-500 ring-[3px] ring-card" />
        </span>
        <h2
          data-replay-public
          className="min-w-0 flex-1 self-center text-sm font-medium leading-snug tracking-tight md:text-base"
        >
          {t("Website is live", "Веб-страницата е активна")}
        </h2>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-10 shrink-0"
        >
          <a
            href={websiteUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={t("Open website", "Отвори страница")}
          >
            <ExternalLink />
          </a>
        </Button>
      </div>

      <p
        data-replay-public
        className="hidden text-sm leading-relaxed text-muted-foreground md:block"
        data-appear="item"
        style={appearStep(2)}
      >
        {t(
          "Share your website so clients can find a service and book a time.",
          "Споделете ја веб-страницата за клиентите да изберат услуга и да закажат термин.",
        )}
      </p>

      <div
        className="flex min-w-0 items-center gap-2 rounded-2xl bg-secondary/70 py-1.5 pl-3 pr-1.5 md:mt-auto"
        data-appear="item"
        style={appearStep(3)}
      >
        <a
          href={websiteUrl}
          target="_blank"
          rel="noreferrer"
          title={address}
          className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t(`Open ${address}`, `Отвори ${address}`)}
        >
          {address}
        </a>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 shrink-0"
              onClick={() => void copyLink()}
              aria-label={
                copied
                  ? t("Link copied", "Линкот е копиран")
                  : t("Copy website link", "Копирај линк до веб-страницата")
              }
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </TooltipTrigger>
          <TooltipContent data-replay-public>
            {copied ? t("Copied", "Копирано") : t("Copy link", "Копирај линк")}
          </TooltipContent>
        </Tooltip>
      </div>

      <div data-appear="item" style={appearStep(4)}>
        <Button
          data-replay-public
          onClick={() => void copyLink()}
          className="min-h-12 h-auto w-full justify-between whitespace-normal"
        >
          {copied
            ? t("Link copied", "Линкот е копиран")
            : t("Copy booking link", "Копирај линк за закажување")}
          {copied ? (
            <Check data-icon="inline-end" />
          ) : (
            <Copy data-icon="inline-end" />
          )}
        </Button>
      </div>
      {showEnhancements && !dismissed && (
        <div className="flex items-start gap-2 border-t border-border pt-3">
          <details className="min-w-0 flex-1 text-sm text-muted-foreground">
            <summary data-replay-public className="cursor-pointer py-3">
              {t(
                "Improve your website (optional)",
                "Подобрете ја страницата (незадолжително)",
              )}
            </summary>
            <div className="flex flex-col gap-1">
              <Link
                data-replay-public
                className="min-h-11 py-3 hover:text-foreground"
                href="/settings?tab=branding"
              >
                {t(
                  "Add photos, a logo, or contact details",
                  "Додајте фотографии, лого или контакт",
                )}
              </Link>
              <Link
                data-replay-public
                className="min-h-11 py-3 hover:text-foreground"
                href="/beauty/services"
              >
                {t(
                  "Add more services or team members",
                  "Додајте услуги или членови на тимот",
                )}
              </Link>
            </div>
          </details>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            onClick={() => setDismissed(true)}
            aria-label={t("Dismiss suggestions", "Сокриј предлози")}
          >
            <X />
          </Button>
        </div>
      )}
    </Appear>
  );
}
