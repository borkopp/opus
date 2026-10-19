"use client";

import Image from "next/image";
import { createContext, useContext, useRef, useState } from "react";
import { Check, Download, Share2, PlusSquare, Ellipsis, X } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStudioInstall } from "@/hooks/use-studio-install";
import { StudioServiceWorker } from "./StudioServiceWorker";
import {
  promptStudioInstall,
  type StudioInstallState,
} from "@/lib/studio-install";

const InstallContext = createContext<{
  state: StudioInstallState;
  openInstall: (trigger?: HTMLElement) => void;
} | null>(null);

export const useStudioInstallContext = () => useContext(InstallContext);

export function StudioInstallProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = useStudioInstall();
  const { t } = useDashboardI18n();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const openInstall = (trigger?: HTMLElement) => {
    opener.current =
      trigger ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    setError(false);
    setOpen(true);
  };

  const steps =
    state.platform === "ios"
      ? [
          t(
            "Open this dashboard in Safari and tap Share. You may find Share inside the browser menu.",
            "Отворете ја контролната табла во Safari и допрете Сподели. Може да биде во менито на прелистувачот.",
            "Hapeni panelin në Safari dhe prekni Share. Mund të jetë brenda menysë së shfletuesit.",
          ),
          t(
            "Choose “Add to Home Screen”. You may need to scroll down.",
            "Изберете „Add to Home Screen“ (Додај на почетниот екран). Можеби треба да лизнете надолу.",
            "Zgjidhni “Add to Home Screen”. Mund t’ju duhet të lëvizni poshtë.",
          ),
          t(
            "Keep “Open as Web App” on if shown, then tap Add.",
            "Ако се прикаже „Open as Web App“, оставете го вклучено, па допрете Add.",
            "Nëse shfaqet “Open as Web App”, mbajeni aktiv dhe prekni Add.",
          ),
        ]
      : state.platform === "android"
        ? [
            t(
              "Open this dashboard in Chrome, then open its menu (⋮).",
              "Отворете ја контролната табла во Chrome, па отворете го менито (⋮).",
              "Hapeni panelin në Chrome, pastaj hapni menynë (⋮).",
            ),
            t(
              "Choose “Install app” or “Add to Home screen”.",
              "Изберете „Install app“ или „Add to Home screen“.",
              "Zgjidhni “Install app” ose “Add to Home screen”.",
            ),
            t(
              "Confirm, then open OPUS Studio from your home screen.",
              "Потврдете, па отворете OPUS Studio од почетниот екран.",
              "Konfirmoni, pastaj hapni OPUS Studio nga ekrani kryesor.",
            ),
          ]
        : state.platform === "safari"
          ? [
              t(
                "Open Safari’s File menu or Share menu.",
                "Отворете го менито File или Share во Safari.",
                "Hapni menynë File ose Share në Safari.",
              ),
              t(
                "Choose “Add to Dock”, then confirm Add.",
                "Изберете „Add to Dock“, па потврдете со Add.",
                "Zgjidhni “Add to Dock”, pastaj konfirmoni Add.",
              ),
              t(
                "Open OPUS Studio from your Dock. If the option is missing, try an up-to-date Safari or Chrome.",
                "Отворете OPUS Studio од Dock. Ако ја нема опцијата, обидете се со ажуриран Safari или Chrome.",
                "Hapni OPUS Studio nga Dock. Nëse opsioni mungon, provoni Safari ose Chrome të përditësuar.",
              ),
            ]
          : [
              t(
                "Look for the install icon in the address bar, or open the browser menu.",
                "Побарајте ја иконата за инсталирање во адресната лента или отворете го менито на прелистувачот.",
                "Kërkoni ikonën e instalimit në shiritin e adresës ose hapni menynë e shfletuesit.",
              ),
              t(
                "Choose “Install OPUS Studio” or “Install this site as an app”.",
                "Изберете „Install OPUS Studio“ или „Install this site as an app“.",
                "Zgjidhni “Install OPUS Studio” ose “Install this site as an app”.",
              ),
              t(
                "If no install option appears, open this dashboard in Chrome or Edge.",
                "Ако нема опција за инсталирање, отворете ја контролната табла во Chrome или Edge.",
                "Nëse nuk shfaqet opsioni i instalimit, hapeni panelin në Chrome ose Edge.",
              ),
            ];

  return (
    <InstallContext.Provider value={{ state, openInstall }}>
      <StudioServiceWorker />
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            const target = opener.current?.isConnected
              ? opener.current
              : (document.getElementById("install-app") ??
                document.getElementById("dashboard-content"));
            if (target) {
              event.preventDefault();
              target.focus({ preventScroll: true });
            }
          }}
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-md motion-reduce:animate-none"
          data-replay-public
        >
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 size-11"
              aria-label={t("Close", "Затвори", "Mbyll")}
            >
              <X aria-hidden="true" />
            </Button>
          </DialogClose>
          <DialogHeader className="items-center gap-3 pt-2 text-center sm:text-center">
            <Image
              src="/studio-apple-touch-icon.png"
              alt=""
              width={72}
              height={72}
              className="rounded-2xl border border-border shadow-sm"
              unoptimized
            />
            <DialogTitle className="text-xl leading-tight">
              {state.installed
                ? t(
                    "OPUS Studio is installed",
                    "OPUS Studio е инсталирана",
                    "OPUS Studio është instaluar",
                  )
                : t(
                    "Your studio, one tap away",
                    "Вашето студио, на еден допир",
                    "Studioja juaj, me një prekje",
                  )}
            </DialogTitle>
            <DialogDescription className="max-w-xs leading-relaxed">
              {t(
                "Open your appointments directly from your home screen or desktop, in a dedicated app window.",
                "Отворајте ги термините директно од почетниот екран или работната површина, во посебен прозорец за апликацијата.",
                "Hapni terminet direkt nga ekrani kryesor ose desktopi, në një dritare të veçantë të aplikacionit.",
              )}
            </DialogDescription>
          </DialogHeader>
          {state.installed ? (
            <p className="flex items-center justify-center gap-2 py-4 text-sm">
              <Check className="size-5 text-brand" aria-hidden="true" />
              {t(
                "Ready to open from your apps.",
                "Подготвена за отворање од вашите апликации.",
                "Gati për t’u hapur nga aplikacionet tuaja.",
              )}
            </p>
          ) : !state.secure ? (
            <p className="rounded-xl bg-muted p-4 text-sm">
              {t(
                "Open the secure dashboard at studio.opus.mk to install the app.",
                "Отворете ја безбедната контролна табла на studio.opus.mk за да ја инсталирате апликацијата.",
                "Hapeni panelin e sigurt në studio.opus.mk për të instaluar aplikacionin.",
              )}
            </p>
          ) : state.canPrompt || state.installing ? (
            <Button
              className="mt-2 min-h-11 w-full"
              variant="brand"
              disabled={state.installing}
              onClick={async () => {
                setError(false);
                try {
                  if ((await promptStudioInstall()) === "accepted")
                    setOpen(false);
                } catch {
                  setError(true);
                }
              }}
            >
              <Download aria-hidden="true" />
              {state.installing
                ? t(
                    "Waiting for your browser…",
                    "Се чека прелистувачот…",
                    "Në pritje të shfletuesit…",
                  )
                : t(
                    "Install OPUS Studio",
                    "Инсталирај OPUS Studio",
                    "Instalo OPUS Studio",
                  )}
            </Button>
          ) : (
            <ol className="mt-2 space-y-3 rounded-xl bg-muted/60 p-4">
              {steps.map((step, index) => {
                const Icon =
                  index === 0
                    ? state.platform === "ios"
                      ? Share2
                      : Ellipsis
                    : index === 1
                      ? PlusSquare
                      : Check;
                return (
                  <li
                    key={index}
                    className="flex gap-3 text-sm leading-relaxed"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-brand">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="sr-only">{index + 1}. </span>
                      {step}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {t(
                "The install prompt could not open. Use the browser menu steps above, or try again after reloading.",
                "Прозорецот за инсталирање не се отвори. Следете ги чекорите погоре или освежете ја страницата.",
                "Dritarja e instalimit nuk u hap. Ndiqni hapat më sipër ose rifreskoni faqen.",
              )}
            </p>
          )}
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            {t(
              "An internet connection is needed to view and manage appointments.",
              "Потребна е интернет-врска за преглед и управување со термините.",
              "Nevojitet lidhje interneti për të parë dhe menaxhuar terminet.",
            )}
          </p>
        </DialogContent>
      </Dialog>
    </InstallContext.Provider>
  );
}
