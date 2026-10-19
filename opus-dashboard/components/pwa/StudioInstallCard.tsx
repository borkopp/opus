"use client";

import Image from "next/image";
import { Check, Download, X } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { useDismissibleBanner } from "@/hooks/use-dismissible-banner";
import { useStudioInstallContext } from "./StudioInstallProvider";

export function StudioInstallCard({ banner = false }: { banner?: boolean }) {
  const install = useStudioInstallContext();
  const { t } = useDashboardI18n();
  const dismissal = useDismissibleBanner("opus-studio-install-dismissed-v1");
  if (!install?.state.ready) return null;
  const { state, openInstall } = install;
  if (
    banner &&
    (dismissal.dismissed ||
      state.installed ||
      !state.secure ||
      (!state.canPrompt &&
        state.platform !== "ios" &&
        state.platform !== "android"))
  )
    return null;

  return (
    <section
      id={banner ? undefined : "install-app"}
      tabIndex={-1}
      aria-label={t(
        "Install OPUS Studio",
        "Инсталирај OPUS Studio",
        "Instalo OPUS Studio",
      )}
      className={`${banner ? "dashboard-setup-banner mb-4" : ""} relative rounded-2xl border border-border bg-card p-5`}
      data-replay-public
    >
      <div
        className={`flex flex-wrap items-center gap-4 ${banner ? "pr-8" : ""}`}
      >
        <Image
          src="/studio-apple-touch-icon.png"
          width={52}
          height={52}
          alt=""
          className="shrink-0 rounded-xl border border-border"
          unoptimized
        />
        <div className="min-w-0 flex-1 basis-44 space-y-1">
          <h2 className="text-base font-medium">
            {t(
              "OPUS on your home screen",
              "OPUS на почетниот екран",
              "OPUS në ekranin kryesor",
            )}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {state.installed
              ? t(
                  "OPUS Studio is installed on this device.",
                  "OPUS Studio е инсталирана на овој уред.",
                  "OPUS Studio është instaluar në këtë pajisje.",
                )
              : t(
                  "A shortcut to your studio, with its own app window.",
                  "Брз пристап до студиото, во посебен прозорец за апликацијата.",
                  "Qasje e shpejtë te studioja, në një dritare të veçantë.",
                )}
          </p>
        </div>
        {state.installed ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4 text-brand" aria-hidden="true" />
            {t("Installed", "Инсталирана", "Instaluar")}
          </span>
        ) : (
          <Button
            variant="outline"
            className="min-h-11"
            onClick={(event) => openInstall(event.currentTarget)}
          >
            <Download aria-hidden="true" />
            {t(
              "Install web app",
              "Инсталирај веб-апликација",
              "Instalo aplikacionin web",
            )}
          </Button>
        )}
      </div>
      {banner && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 size-11"
          onClick={dismissal.dismiss}
          aria-label={t(
            "Dismiss install suggestion",
            "Сокриј предлог за инсталирање",
            "Hiq sugjerimin e instalimit",
          )}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </section>
  );
}
