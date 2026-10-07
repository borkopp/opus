"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Globe2, Paintbrush } from "lucide-react";
import Link from "next/link";
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
  canCustomize = false,
}: {
  websiteUrl: string;
  canCustomize?: boolean;
}) {
  const { t } = useDashboardI18n();
  const [copied, setCopied] = useState(false);
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
        t(
          "Website link copied",
          "Линкот до веб-страницата е копиран",
          "Linku i uebsajtit u kopjua",
        ),
      );
    } catch {
      toast.error(
        t(
          "Could not copy the website link",
          "Не можеше да се копира линкот до веб-страницата",
          "Nuk mund të kopjohej linku i uebsajtit",
        ),
      );
    }
  }

  return (
    <Appear
      as="section"
      delay={90}
      className="flex min-w-0 flex-col gap-4 rounded-[25px] bg-card p-5 md:min-h-[272px] md:gap-5 md:p-6"
      aria-label={t(
        "Studio website",
        "Веб-страница на студиото",
        "Uebsajti i studios",
      )}
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
          {t(
            "Website is live",
            "Веб-страницата е активна",
            "Faqja e internetit është aktive",
          )}
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
            aria-label={t("Open website", "Отвори страница", "Hap uebsajtin")}
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
          "Ndani uebsajtin tuaj që klientët të gjejnë një shërbim dhe të rezervojnë një orar.",
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
          aria-label={t(
            `Open ${address}`,
            `Отвори ${address}`,
            `Hap ${address}`,
          )}
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
                  ? t("Link copied", "Линкот е копиран", "Linku u kopjua")
                  : t(
                      "Copy website link",
                      "Копирај линк до веб-страницата",
                      "Kopjo linkun e uebsajtit",
                    )
              }
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </TooltipTrigger>
          <TooltipContent data-replay-public>
            {copied
              ? t("Copied", "Копирано", "U kopjua")
              : t("Copy link", "Копирај линк", "Kopjo linkun")}
          </TooltipContent>
        </Tooltip>
      </div>

      <div data-appear="item" style={appearStep(4)}>
        {canCustomize && (
          <Button asChild variant="outline" className="mb-2 w-full">
            <Link href="/website">
              <Paintbrush data-icon="inline-start" />
              {t(
                "Customize website",
                "Уреди веб-страница",
                "Personalizoni uebsajtin",
              )}
            </Link>
          </Button>
        )}
        <Button
          data-replay-public
          onClick={() => void copyLink()}
          className="min-h-12 h-auto w-full justify-between whitespace-normal"
        >
          {copied
            ? t("Link copied", "Линкот е копиран", "Linku u kopjua")
            : t(
                "Copy booking link",
                "Копирај линк за закажување",
                "Kopjo linkun e rezervimit",
              )}
          {copied ? (
            <Check data-icon="inline-end" />
          ) : (
            <Copy data-icon="inline-end" />
          )}
        </Button>
      </div>
    </Appear>
  );
}
