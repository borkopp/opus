"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Instagram } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { SettingsSection } from "@/components/settings/SettingsCard";

export function InstagramConnection({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { t } = useDashboardI18n();
  const status = useQuery(api.ai.connections.getStatus, {});
  const connect = useAction(api.ai.instagram.startConnection);
  const disconnect = useMutation(api.ai.connections.disconnect);
  const search = useSearchParams();
  const [busy, setBusy] = useState(false);
  async function handleConnect() {
    setBusy(true);
    try {
      const result = await connect({});
      window.location.assign(result.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              "Unable to connect Instagram.",
              "Instagram не може да се поврзе.",
              "Lidhja me Instagram nuk mund të bëhet.",
            ),
      );
      setBusy(false);
    }
  }
  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnect({});
      toast.success(
        t(
          "Instagram disconnected",
          "Instagram е исклучен",
          "Instagram u shkëput",
        ),
      );
    } catch {
      toast.error(
        t(
          "Unable to disconnect Instagram.",
          "Instagram не може да се исклучи.",
          "Shkëputja e Instagram nuk mund të bëhet.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <SettingsSection
      title="Instagram"
      description={t(
        "Connect the studio’s professional Instagram account to answer DMs and book confirmed appointments.",
        "Поврзете ја професионалната Instagram сметка на студиото за одговори на пораки и закажување потврдени термини.",
        "Lidhni llogarinë profesionale të Instagram-it të studios për t'iu përgjigjur mesazheve dhe për të rezervuar termine të konfirmuara.",
      )}
    >
      <div className="flex max-w-2xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Instagram className="size-5" />
          <span className="min-w-0 break-all text-sm font-medium">
            {status?.username
              ? `@${status.username}`
              : t(
                  "No account connected",
                  "Нема поврзана сметка",
                  "Asnjë llogari e lidhur",
                )}
          </span>
          <Badge
            data-replay-public
            variant={status?.ready ? "default" : "secondary"}
          >
            {status?.ready
              ? t(
                  "Automatic replies on",
                  "Автоматските одговори се вклучени",
                  "Përgjigjet automatike janë aktive",
                )
              : status?.connected
                ? t(
                    "Connected · replies paused",
                    "Поврзано · одговорите се паузирани",
                    "E lidhur · përgjigjet të pezulluara",
                  )
                : t("Not connected", "Не е поврзано", "E palidhur")}
          </Badge>
        </div>
        {status && (!status.provider.instagram || !status.provider.ai) && (
          <p data-replay-public className="text-sm text-muted-foreground">
            {t(
              "OPUS needs to finish the messaging provider setup before automatic replies can start. You can prepare and save your studio context now.",
              "OPUS треба да го заврши поврзувањето со сервисите пред да започнат автоматските одговори. Можете да го подготвите и зачувате контекстот за студиото сега.",
              "OPUS duhet të përfundojë konfigurimin e ofruesit të mesazheve përpara se të fillojnë përgjigjet automatike. Mund të përgatitni dhe ruani kontekstin e studios tani.",
            )}
          </p>
        )}
        {(status?.error || search.get("instagram") === "error") && (
          <p
            data-replay-public
            role="alert"
            className="text-sm text-destructive"
          >
            {t(
              "Instagram could not be connected or needs to be reconnected. Try again and allow access to messages.",
              "Instagram не е поврзан или треба повторно да се поврзе. Обидете се повторно и дозволете пристап до пораките.",
              "Instagram nuk mund të lidhej ose duhet të rilidhet. Provoni përsëri dhe lejoni qasjen në mesazhe.",
            )}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={
              disabled ||
              !status?.canManage ||
              !status.provider.instagram ||
              busy
            }
            onClick={handleConnect}
          >
            {busy && <Spinner />}
            {status?.connected
              ? t(
                  "Reconnect Instagram",
                  "Поврзи Instagram повторно",
                  "Rilidh Instagram-in",
                )
              : t("Connect Instagram", "Поврзи Instagram", "Lidh Instagram-in")}
          </Button>
          {status?.connected && (
            <Button
              data-replay-public
              type="button"
              variant="ghost"
              disabled={disabled || !status.canManage || busy}
              onClick={handleDisconnect}
            >
              {t("Disconnect", "Исклучи", "Shkëput")}
            </Button>
          )}
          {disabled ? (
            <Button data-replay-public variant="ghost" disabled>
              {t("Open inbox", "Отвори сандаче", "Hap kutinë postare")}
            </Button>
          ) : (
            <Button asChild variant="ghost">
              <Link data-replay-public href="/ai-inbox">
                {t("Open inbox", "Отвори сандаче", "Hap kutinë postare")}
              </Link>
            </Button>
          )}
        </div>
        <p data-replay-public className="text-xs text-muted-foreground">
          {t(
            "The AI replies after a client messages you. Your team can take over at any time.",
            "AI одговара откако клиент ќе ви испрати порака. Вашиот тим може да го преземе разговорот во секое време.",
            "AI përgjigjet pasi një klient ju shkruan. Ekipi juaj mund ta marrë bisedën në çdo kohë.",
          )}
        </p>
      </div>
    </SettingsSection>
  );
}
