"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { ArtworkPreview } from "@/components/promotions/ArtworkPreview";
import { ArtworkPaletteEditor } from "@/components/promotions/ArtworkPaletteEditor";
import { usePromotionPalette } from "@/hooks/use-promotion-palette";
import { CopyButton } from "@/components/promotions/CopyButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PromotionWorkspace } from "@/lib/promotions";
import type { PromotionArtwork } from "@/lib/promotion-artwork";
import type { PromotionLanguage } from "@/convex/lib/promotionTemplates";

export function PromotionKit({
  data,
  language,
}: {
  data: PromotionWorkspace;
  language: PromotionLanguage;
}) {
  const { t } = useDashboardI18n();
  const [kind, setKind] =
    useState<Exclude<PromotionArtwork["kind"], "opening">>("poster");
  const [palette, setPalette] = usePromotionPalette(data.bookingUrl);
  return (
    <div className="grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex min-w-0 flex-col gap-7">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle data-replay-public>
              {t(
                "Your booking link, everywhere.",
                "Вашиот линк за закажување, насекаде.",
                "Linku juaj i rezervimit, kudo.",
              )}
            </CardTitle>
            <CardDescription data-replay-public>
              {t(
                "Share your booking link or put a QR code at your counter. Clients book without an app or account.",
                "Споделете го линкот за закажување или поставете QR-код на пултот. Клиентите закажуваат без апликација или профил.",
                "Shpërndani linkun e rezervimit ose vendosni një QR-kod në banak. Klientët rezervojnë pa aplikacion ose llogari.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <FieldGroup>
              <Field>
                <FieldLabel data-replay-public htmlFor="promotion-format">
                  {t("Format", "Формат", "Formati")}
                </FieldLabel>
                <Select
                  value={kind}
                  onValueChange={(value) => setKind(value as typeof kind)}
                >
                  <SelectTrigger id="promotion-format" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem data-replay-public value="poster">
                        {t("Counter sign · A5", "Постер за пулт · A5", "Shenjë për banak · A5")}
                      </SelectItem>
                      <SelectItem data-replay-public value="story">
                        {t(
                          "Book online · Instagram Story",
                          "Закажи онлајн · Instagram Story",
                          "Rezervo online · Instagram Story",
                        )}
                      </SelectItem>
                      <SelectItem data-replay-public value="qr">
                        {t("Booking QR code", "QR-код за закажување", "QR-kod për rezervim")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription data-replay-public>
                  {t(
                    "Your QR code opens your live booking page and keeps working as your availability changes.",
                    "QR-кодот ја отвора вашата страница за закажување и останува ист кога ќе се променат слободните термини.",
                    "QR-kodi juaj hap faqen e rezervimit dhe vazhdon të funksionojë ndërsa oraret tuaja ndryshojnë.",
                  )}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel data-replay-public htmlFor="promotion-link">
                  {t("Booking link", "Линк за закажување", "Linku i rezervimit")}
                </FieldLabel>
                <Input
                  id="promotion-link"
                  readOnly
                  value={data.bookingUrl}
                  onFocus={(event) => event.target.select()}
                />
                <div>
                  <CopyButton
                    text={data.bookingUrl}
                    disabled={!data.published}
                    label={t("Copy link", "Копирај линк", "Kopjo linkun")}
                  />
                </div>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        <ArtworkPaletteEditor
          palette={palette}
          kind={kind}
          onChange={setPalette}
        />
      </div>
      {data.published ? (
        <ArtworkPreview
          palette={palette}
          artwork={{
            kind,
            language,
            name: data.name,
            address: data.address,
            bookingUrl: data.bookingUrl,
          }}
          filename={`${data.slug}-booking-${kind}-${language}`}
        />
      ) : (
        <Empty className="min-h-80 rounded-3xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <QrCode />
            </EmptyMedia>
            <EmptyTitle>
              {t("Your kit is almost ready", "Вашиот пакет е речиси подготвен", "Paketa juaj është pothuajse gati")}
            </EmptyTitle>
            <EmptyDescription>
              {t(
                "Publish your website to download graphics with a working booking link.",
                "Објавете ја веб-страницата за да преземете слики со активен линк за закажување.",
                "Publikoni faqen tuaj të internetit për të shkarkuar grafika me një link funksional rezervimi.",
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
