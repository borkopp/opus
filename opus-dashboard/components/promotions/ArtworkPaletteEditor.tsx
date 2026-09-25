"use client";

import { useId } from "react";
import { RotateCcw } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DEFAULT_PROMOTION_PALETTE,
  PROMOTION_PALETTES,
  type PromotionPalette,
} from "@/lib/promotion-palette";
import type { PromotionArtwork } from "@/lib/promotion-artwork";

export function ArtworkPaletteEditor({
  palette,
  kind,
  onChange,
  disabled,
}: {
  palette: PromotionPalette;
  kind: PromotionArtwork["kind"];
  onChange: (palette: PromotionPalette) => void;
  disabled?: boolean;
}) {
  const { t } = useDashboardI18n();
  const id = useId();
  const selected = PROMOTION_PALETTES.find((preset) =>
    (Object.keys(palette) as (keyof PromotionPalette)[]).every(
      (key) => palette[key] === preset.colors[key],
    ),
  );
  const labels: Record<keyof PromotionPalette, string> = {
    background: t("Background", "Позадина"),
    text:
      kind === "qr" ? t("QR color", "Боја на QR-кодот") : t("Text", "Текст"),
    accent: t("Accent", "Акцент"),
    surface: t("Appointment card", "Картичка за терминот"),
  };
  const keys: (keyof PromotionPalette)[] =
    kind === "qr"
      ? ["background", "text"]
      : kind === "opening"
        ? ["background", "text", "accent", "surface"]
        : ["background", "text", "accent"];

  return (
    <Card className="@container min-w-0">
      <CardHeader>
        <CardTitle>{t("Colors", "Бои")}</CardTitle>
        <CardDescription>
          {t(
            "Choose a palette or make it your own.",
            "Изберете палета или приспособете ги боите.",
          )}
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            disabled={disabled}
            onClick={() => onChange(DEFAULT_PROMOTION_PALETTE)}
            aria-label={t("Reset colors", "Врати ги почетните бои")}
            title={t("Reset colors", "Врати ги почетните бои")}
          >
            <RotateCcw />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pb-5">
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel id={`${id}-presets`}>
              {t("Palette", "Палета")} ·{" "}
              {selected
                ? t(selected.name.en, selected.name.mk)
                : t("Custom", "Сопствена")}
            </FieldLabel>
            <ToggleGroup
              type="single"
              value={selected?.id || ""}
              onValueChange={(value) => {
                const preset = PROMOTION_PALETTES.find(
                  (item) => item.id === value,
                );
                if (preset) onChange(preset.colors);
              }}
              disabled={disabled}
              aria-labelledby={`${id}-presets`}
              variant="outline"
              spacing={2}
              className="flex-wrap"
            >
              {PROMOTION_PALETTES.map((preset) => (
                <ToggleGroupItem
                  key={preset.id}
                  value={preset.id}
                  className="size-11 p-2"
                  aria-label={t(preset.name.en, preset.name.mk)}
                  title={t(preset.name.en, preset.name.mk)}
                >
                  <span
                    className="flex size-7 overflow-hidden rounded-full border"
                    aria-hidden="true"
                  >
                    {[
                      preset.colors.background,
                      preset.colors.accent,
                      preset.colors.text,
                    ].map((color, index) => (
                      <span
                        key={index}
                        className="flex-1"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <FieldGroup className="grid gap-4 @sm:grid-cols-2">
            {keys.map((key) => (
              <Field
                key={key}
                orientation="horizontal"
                data-disabled={disabled}
                className="min-w-0"
              >
                <FieldContent className="min-w-0">
                  <FieldLabel htmlFor={`${id}-${key}`}>
                    {labels[key]}
                  </FieldLabel>
                  <FieldDescription className="font-mono text-xs">
                    {palette[key].toUpperCase()}
                  </FieldDescription>
                </FieldContent>
                <Input
                  id={`${id}-${key}`}
                  type="color"
                  value={palette[key]}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({ ...palette, [key]: event.target.value })
                  }
                  className="size-11 shrink-0 cursor-pointer p-1 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-lg [&::-moz-color-swatch]:border-0"
                />
              </Field>
            ))}
          </FieldGroup>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(
              "Remembered for this studio on this browser. Text and QR contrast adjust for readability.",
              "Се запомнуваат за ова студио во овој прелистувач. Контрастот на текстот и QR-кодот се приспособува за читливост.",
            )}
          </p>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
