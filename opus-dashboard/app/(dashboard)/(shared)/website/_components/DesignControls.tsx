"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WEBSITE_THEMES, websiteColors } from "@/lib/website-presets";
import type { WebsiteDesign } from "../../../../../../shared/website-design";
import { EditorChoice } from "./EditorFields";
import type { EditorControlProps } from "./editor-types";

export function DesignControls({ design, change, select }: EditorControlProps) {
  const { t: translate } = useDashboardI18n();
  const t = (en: string, mk: string, sq: string) => translate(en, mk, sq);
  const colors = websiteColors(design);
  const sectionLabels = {
    hero: t("Hero", "Насловна", "Ballina"),
    services: t("Services", "Услуги", "Shërbimet"),
    about: t("About", "За студиото", "Rreth studios"),
    gallery: t("Gallery", "Галерија", "Galeria"),
    team: t("Team", "Тим", "Ekipi"),
    info: t("Visit & contact", "Посета и контакт", "Vizita dhe kontakti"),
  };
  function move(index: number, offset: number) {
    const sections = [...design.sections];
    [sections[index], sections[index + offset]] = [
      sections[index + offset],
      sections[index],
    ];
    change({ ...design, sections });
  }
  return (
    <FieldGroup>
      <Field>
        <FieldLabel>
          {t("Start with a palette", "Изберете палета", "Zgjidhni një paletë")}
        </FieldLabel>
        <ToggleGroup
          type="single"
          value={design.theme}
          onValueChange={(theme) => {
            if (theme)
              change({
                ...design,
                theme: theme as WebsiteDesign["theme"],
                accentColor: "",
                backgroundColor: "",
              });
          }}
          className="sites-theme-choices"
          spacing={2}
          aria-label={t(
            "Color palettes",
            "Палети на бои",
            "Paletat e ngjyrave",
          )}
        >
          {WEBSITE_THEMES.map((theme) => (
            <ToggleGroupItem
              key={theme.id}
              value={theme.id}
              className="sites-theme-choice"
            >
              <span
                className="sites-theme-swatch"
                style={{ background: theme.background, color: theme.text }}
                aria-hidden="true"
              >
                <span style={{ background: theme.surface }} />
                <i style={{ background: theme.accent }} />
                Aa
              </span>
              <span>{t(theme.name[0], theme.name[1], theme.name[2])}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
      <div className="sites-color-fields">
        <Field>
          <FieldLabel htmlFor="sites-accent">
            {t("Accent", "Акцент", "Theksi")}
          </FieldLabel>
          <Input
            id="sites-accent"
            type="color"
            value={colors.accent}
            onChange={(event) =>
              change({ ...design, accentColor: event.target.value })
            }
          />
          <span className="sites-color-code">{colors.accent}</span>
        </Field>
        <Field>
          <FieldLabel htmlFor="sites-background">
            {t("Background", "Заднина", "Sfondi")}
          </FieldLabel>
          <Input
            id="sites-background"
            type="color"
            value={colors.background}
            onChange={(event) =>
              change({ ...design, backgroundColor: event.target.value })
            }
          />
          <span className="sites-color-code">{colors.background}</span>
        </Field>
      </div>
      <EditorChoice
        label={t("Typography", "Типографија", "Tipografia")}
        value={design.font}
        choices={[
          { value: "modern", label: t("Modern", "Модерно", "Moderne") },
          {
            value: "editorial",
            label: t("Editorial", "Уредничко", "Editoriale"),
          },
          { value: "classic", label: t("Classic", "Класично", "Klasike") },
          { value: "mono", label: "Mono" },
        ]}
        onChange={(font) =>
          change({ ...design, font: font as WebsiteDesign["font"] })
        }
      />
      <EditorChoice
        label={t("Corners", "Агли", "Këndet")}
        value={design.radius}
        choices={[
          { value: "none", label: t("Sharp", "Прави", "Të drejta") },
          { value: "soft", label: t("Soft", "Меки", "Të buta") },
          { value: "round", label: t("Round", "Заоблени", "Të rrumbullakëta") },
        ]}
        onChange={(radius) =>
          change({ ...design, radius: radius as WebsiteDesign["radius"] })
        }
      />
      <EditorChoice
        label={t(
          "Breathing room",
          "Простор меѓу секции",
          "Hapësira mes seksioneve",
        )}
        value={design.spacing}
        choices={[
          { value: "compact", label: t("Compact", "Збиено", "Kompakte") },
          {
            value: "comfortable",
            label: t("Balanced", "Балансирано", "E balancuar"),
          },
          { value: "airy", label: t("Spacious", "Пространо", "E gjerë") },
        ]}
        onChange={(spacing) =>
          change({ ...design, spacing: spacing as WebsiteDesign["spacing"] })
        }
      />
      <EditorChoice
        label={t(
          "Content width",
          "Ширина на содржина",
          "Gjerësia e përmbajtjes",
        )}
        value={design.width}
        choices={[
          {
            value: "contained",
            label: t("Focused", "Фокусирано", "E përqendruar"),
          },
          { value: "wide", label: t("Wide", "Широко", "E gjerë") },
        ]}
        onChange={(width) =>
          change({ ...design, width: width as WebsiteDesign["width"] })
        }
      />
      <Field>
        <FieldLabel>
          {t(
            "Your page, your order",
            "Ваш редослед на секции",
            "Renditja juaj e seksioneve",
          )}
        </FieldLabel>
        <div className="sites-section-order">
          {design.sections.map((section, index) => (
            <div key={section.id} data-visible={section.visible}>
              <button
                type="button"
                className="sites-order-label"
                onClick={() => select(section.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {sectionLabels[section.id]}
              </button>
              <div className="flex items-center gap-0.5">
                {!["hero", "services", "info"].includes(section.id) && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      section.visible
                        ? t(
                            "Hide section",
                            "Сокриј секција",
                            "Fshihni seksionin",
                          )
                        : t(
                            "Show section",
                            "Прикажи секција",
                            "Shfaqni seksionin",
                          )
                    }
                    onClick={() =>
                      change({
                        ...design,
                        sections: design.sections.map((s) =>
                          s.id === section.id
                            ? { ...s, visible: !s.visible }
                            : s,
                        ),
                      })
                    }
                  >
                    {section.visible ? <Eye /> : <EyeOff />}
                  </Button>
                )}
                {index > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={index < 2}
                      onClick={() => move(index, -1)}
                      aria-label={t(
                        "Move up",
                        "Помести нагоре",
                        "Lëvizni lart",
                      )}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === design.sections.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={t(
                        "Move down",
                        "Помести надолу",
                        "Lëvizni poshtë",
                      )}
                    >
                      <ArrowDown />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Field>
    </FieldGroup>
  );
}
