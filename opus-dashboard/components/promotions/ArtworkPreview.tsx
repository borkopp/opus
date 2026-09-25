"use client";

import { useMemo, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  renderPromotionArtwork,
  type PromotionArtwork,
} from "@/lib/promotion-artwork";
import { promotionPng, downloadPromotion } from "./export-image";
import { CopyButton } from "./CopyButton";
import type { PromotionPalette } from "@/lib/promotion-palette";

export function ArtworkPreview({
  artwork,
  filename,
  beforeExport,
  palette,
}: {
  artwork: PromotionArtwork;
  filename: string;
  beforeExport?: () => Promise<void>;
  palette: PromotionPalette;
}) {
  const { t } = useDashboardI18n();
  const [busy, setBusy] = useState(false);
  const svg = useMemo(
    () => renderPromotionArtwork({ ...artwork, palette }),
    [artwork, palette],
  );
  async function exportImage(share: boolean) {
    setBusy(true);
    try {
      await beforeExport?.();
      const blob = await promotionPng(svg);
      const file = new File([blob], `${filename}.png`, { type: "image/png" });
      const download = () => {
        downloadPromotion(blob, file.name);
        toast.success(t("Image downloaded", "Сликата е преземена"));
      };
      if (share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError")
            throw error;
          // Some browsers lose share permission while preparing the image.
          // Keep the finished graphic available through a regular download.
          download();
        }
      } else {
        download();
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              "Could not create the image. Try again.",
              "Не успеа создавањето на сликата. Обидете се повторно.",
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-6"
      data-promotion-preview
    >
      <div className="flex justify-center rounded-3xl bg-muted/60 p-5 sm:p-8">
        {/* The preview and downloaded PNG use exactly the same self-contained SVG. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
          alt={t(
            `Promotion preview for ${artwork.name}`,
            `Преглед на промоцијата за ${artwork.name}`,
          )}
          className="h-auto w-full max-w-[280px] rounded-xl shadow-lg lg:max-h-[calc(100dvh-16rem)] lg:w-auto lg:object-contain"
        />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          className="min-h-11"
          disabled={busy}
          onClick={() => void exportImage(false)}
        >
          {busy ? <Spinner /> : <Download data-icon="inline-start" />}
          {t("Download PNG", "Преземи PNG")}
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={() => void exportImage(true)}
        >
          <Share2 data-icon="inline-start" />
          {t("Share image", "Сподели слика")}
        </Button>
        <CopyButton
          text={artwork.bookingUrl}
          label={t("Copy booking link", "Копирај линк за закажување")}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {artwork.kind === "poster"
          ? t("Print at A5 · 1748 × 2480 px", "Печатете во A5 · 1748 × 2480 px")
          : artwork.kind === "qr"
            ? "1080 × 1080 px"
            : t(
                "Instagram Story · 1080 × 1920 px",
                "Instagram Story · 1080 × 1920 px",
              )}
      </p>
    </div>
  );
}
