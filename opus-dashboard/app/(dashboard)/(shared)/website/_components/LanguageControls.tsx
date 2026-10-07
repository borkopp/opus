"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WEBSITE_LANGUAGE_NAMES } from "@/lib/website-i18n";
import {
  mergeWebsiteTranslations,
  websiteSources,
} from "../../../../../../shared/website-design";
import {
  SUPPORTED_LOCALES,
  type Locale,
} from "../../../../../../shared/i18n/locale";
import { EditorSwitch, EditorText } from "./EditorFields";
import type { EditorControlProps } from "./editor-types";

export function LanguageControls({
  design,
  site,
  change,
  translate,
  translating,
  available,
  status,
  canManageLanguages,
}: EditorControlProps & {
  translate: () => void;
  translating: boolean;
  available: boolean;
  status: string;
  canManageLanguages: boolean;
}) {
  const { t } = useDashboardI18n();
  const [reviewLanguage, setReviewLanguage] = useState<Locale>(
    design.languages.find((l) => l !== design.primaryLanguage) ?? "en",
  );
  const [search, setSearch] = useState("");
  const extras = design.languages.filter((l) => l !== design.primaryLanguage);
  const reviewOptions = extras.length
    ? extras
    : SUPPORTED_LOCALES.filter(
        (language) => language !== design.primaryLanguage,
      );
  const review = reviewOptions.includes(reviewLanguage)
    ? reviewLanguage
    : reviewOptions[0];
  const translationDisabled = !canManageLanguages || extras.length === 0;
  const sources = websiteSources(design, site).filter(
    (source) =>
      !search || source.source.toLowerCase().includes(search.toLowerCase()),
  );
  const contentNames: Record<string, string> = {
    heroEyebrow: t("Small heading", "Мал наслов", "Titulli i vogël"),
    heroTitle: t("Hero headline", "Наслов на насловна", "Titulli i ballinës"),
    heroDescription: t("Introduction", "Вовед", "Hyrja"),
    heroButton: t(
      "Booking button",
      "Копче за закажување",
      "Butoni i rezervimit",
    ),
    servicesTitle: t(
      "Services heading",
      "Наслов за услуги",
      "Titulli i shërbimeve",
    ),
    servicesDescription: t(
      "Services introduction",
      "Вовед за услуги",
      "Hyrja e shërbimeve",
    ),
    aboutTitle: t(
      "About heading",
      "Наслов за студиото",
      "Titulli rreth studios",
    ),
    aboutBody: t("Studio story", "Приказна за студиото", "Historia e studios"),
    galleryTitle: t(
      "Gallery heading",
      "Наслов за галерија",
      "Titulli i galerisë",
    ),
    galleryDescription: t(
      "Gallery caption",
      "Опис на галерија",
      "Përshkrimi i galerisë",
    ),
    teamTitle: t("Team heading", "Наслов за тимот", "Titulli i ekipit"),
    infoTitle: t("Contact heading", "Наслов за контакт", "Titulli i kontaktit"),
    footerText: t("Closing line", "Завршна реченица", "Fjalia përmbyllëse"),
  };
  function sourceName(key: string) {
    const [type, id, field] = key.split(".");
    if (type === "content") return contentNames[id] ?? id;
    if (type === "service")
      return `${site.services.find((s) => s._id === id)?.name ?? labels.service} · ${field === "name" ? t("Name", "Име", "Emri") : field === "category" ? t("Category", "Категорија", "Kategoria") : t("Description", "Опис", "Përshkrimi")}`;
    if (type === "staff")
      return `${site.staff.find((s) => s._id === id)?.displayName ?? t("Team profile", "Профил на тим", "Profili i ekipit")} · ${field === "bio" ? t("Biography", "Биографија", "Biografia") : t("Specialties", "Специјалности", "Specialitetet")}`;
    return t("Photo caption", "Опис на фотографија", "Përshkrimi i fotos");
  }
  const labels = { service: t("Service", "Услуга", "Shërbimi") };
  return (
    <FieldGroup>
      <Alert>
        <Languages />
        <AlertDescription>
          {t(
            "Write once in your primary language. OPUS can translate the other languages for you.",
            "Пишувајте само на главниот јазик. OPUS може да ги преведе другите јазици за вас.",
            "Shkruani vetëm në gjuhën kryesore. OPUS mund të përkthejë gjuhët e tjera për ju.",
          )}
        </AlertDescription>
      </Alert>
      {!canManageLanguages && (
        <FieldDescription>
          {t(
            "Website languages and automatic translation are included in Pro. Upgrade to enable these controls.",
            "Јазиците на веб-страницата и автоматскиот превод се дел од Pro. Надградете за да ги овозможите овие контроли.",
            "Gjuhët e uebsajtit dhe përkthimi automatik përfshihen në Pro. Përmirësoni planin për t'i aktivizuar këto kontrolle.",
          )}
        </FieldDescription>
      )}
      <Field>
        <FieldLabel htmlFor="sites-primary-language">
          {t(
            "Primary website language",
            "Главен јазик на веб-страницата",
            "Gjuha kryesore e uebsajtit",
          )}
        </FieldLabel>
        <Select
          value={design.primaryLanguage}
          disabled={!canManageLanguages}
          onValueChange={(language) =>
            change({
              ...design,
              primaryLanguage: language as Locale,
              languages: [
                ...new Set([language as Locale, ...design.languages]),
              ],
              translations: [],
            })
          }
        >
          <SelectTrigger id="sites-primary-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {SUPPORTED_LOCALES.map((language) => (
                <SelectItem key={language} value={language}>
                  {WEBSITE_LANGUAGE_NAMES[language]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>
          {t(
            "This is the language you write in. Your editor language stays independent.",
            "На овој јазик ја пишувате содржината. Јазикот на уредувачот е независен.",
            "Kjo është gjuha në të cilën shkruani. Gjuha e redaktuesit mbetet e pavarur.",
          )}
        </FieldDescription>
      </Field>
      {SUPPORTED_LOCALES.filter((l) => l !== design.primaryLanguage).map(
        (language) => (
          <EditorSwitch
            key={language}
            label={WEBSITE_LANGUAGE_NAMES[language]}
            checked={design.languages.includes(language)}
            disabled={!canManageLanguages}
            onChange={(enabled) =>
              change({
                ...design,
                languages: enabled
                  ? [...design.languages, language]
                  : design.languages.filter((l) => l !== language),
              })
            }
          />
        ),
      )}
      <>
        <EditorSwitch
          label={t(
            "Translate automatically on publish",
            "Преведи автоматски при објавување",
            "Përktheni automatikisht kur publikoni",
          )}
          checked={design.autoTranslate}
          disabled={translationDisabled}
          onChange={(autoTranslate) => change({ ...design, autoTranslate })}
        />
        <Button
          variant="outline"
          onClick={translate}
          disabled={translationDisabled || translating || !available}
        >
          <Languages data-icon="inline-start" />
          {translating
            ? t("Translating…", "Се преведува…", "Duke përkthyer…")
            : t(
                "Prepare translations",
                "Подготви преводи",
                "Përgatitni përkthimet",
              )}
        </Button>
        {canManageLanguages && extras.length === 0 && (
          <FieldDescription>
            {t(
              "Enable another website language to prepare translations.",
              "Овозможете друг јазик на веб-страницата за да подготвите преводи.",
              "Aktivizoni një gjuhë tjetër të uebsajtit për të përgatitur përkthimet.",
            )}
          </FieldDescription>
        )}
        {!available && (
          <FieldDescription>
            {t(
              "Automatic translation is unavailable until the provider is configured. Your original content still works.",
              "Автоматскиот превод е недостапен додека не се конфигурира провајдерот. Оригиналната содржина останува достапна.",
              "Përkthimi automatik nuk është i disponueshëm derisa të konfigurohet ofruesi. Përmbajtja origjinale mbetet e disponueshme.",
            )}
          </FieldDescription>
        )}
        {status === "failed" && (
          <Alert>
            <AlertDescription>
              {t(
                "Translations could not be completed. You can retry; the original text remains available.",
                "Преводите не можеа да се завршат. Обидете се повторно; оригиналниот текст останува достапен.",
                "Përkthimet nuk mund të përfundonin. Provoni përsëri; teksti origjinal mbetet i disponueshëm.",
              )}
            </AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="sites-review-language">
            {t(
              "Optional translation corrections",
              "Незадолжителни поправки на превод",
              "Korrigjime opsionale të përkthimit",
            )}
          </FieldLabel>
          <Select
            value={review}
            disabled={translationDisabled}
            onValueChange={(value) => setReviewLanguage(value as Locale)}
          >
            <SelectTrigger id="sites-review-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {reviewOptions.map((l) => (
                  <SelectItem key={l} value={l}>
                    {WEBSITE_LANGUAGE_NAMES[l]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            {t(
              "Corrections are preserved until their original text changes.",
              "Поправките се зачувуваат додека не се промени оригиналниот текст.",
              "Korrigjimet ruhen derisa të ndryshojë teksti origjinal.",
            )}
          </FieldDescription>
        </Field>
        <Input
          aria-label={t(
            "Find text to translate",
            "Најди текст за превод",
            "Gjeni tekstin për përkthim",
          )}
          placeholder={t("Find text…", "Најди текст…", "Gjeni tekstin…")}
          value={search}
          disabled={translationDisabled}
          onChange={(e) => setSearch(e.target.value)}
        />
        {review &&
          sources.map((source) => {
            const existing = design.translations
              .find((entry) => entry.locale === review)
              ?.messages.find(
                (entry) =>
                  entry.key === source.key && entry.source === source.source,
              );
            return (
              <EditorText
                key={`${review}:${source.key}`}
                label={sourceName(source.key)}
                value={existing?.value ?? ""}
                placeholder={source.source}
                multiline
                maxLength={6000}
                description={source.source}
                disabled={translationDisabled}
                onChange={(value) =>
                  change(
                    mergeWebsiteTranslations(design, review, [
                      { ...source, value, manual: true },
                    ]),
                  )
                }
              />
            );
          })}
      </>
    </FieldGroup>
  );
}
