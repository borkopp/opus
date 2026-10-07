"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, ImagePlus } from "lucide-react";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
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
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { websiteLabels } from "@/lib/website-i18n";
import type {
  WebsiteContentKey,
  WebsiteDesign,
  WebsitePanel,
} from "../../../../../../shared/website-design";
import {
  EditorChoice,
  EditorRange,
  EditorSwitch,
  EditorText,
} from "./EditorFields";
import type { EditorControlProps } from "./editor-types";

export function SectionControls({
  panel,
  design,
  site,
  change,
}: EditorControlProps & { panel: WebsitePanel }) {
  const { t } = useDashboardI18n();
  const labels = websiteLabels(design.primaryLanguage);
  const [chosenService, setChosenService] = useState<string>(
    site.services[0]?._id ?? "",
  );
  const text = (
    key: WebsiteContentKey,
    label: string,
    fallback = "",
    multiline = false,
  ) => (
    <EditorText
      key={key}
      label={label}
      value={design.content[key]}
      placeholder={fallback}
      onChange={(value) =>
        change({ ...design, content: { ...design.content, [key]: value } })
      }
      multiline={multiline}
      maxLength={key === "aboutBody" ? 4000 : multiline ? 1000 : 200}
    />
  );
  const choices = (
    label: string,
    value: string,
    items: [string, string][],
    onChange: (value: string) => void,
    thumbnails = true,
  ) => (
    <EditorChoice
      label={label}
      value={value}
      choices={items.map(([value, label]) => ({ value, label }))}
      onChange={onChange}
      thumbnails={thumbnails}
    />
  );
  const layoutLabel = t(
    "Choose a layout",
    "Изберете распоред",
    "Zgjidhni një paraqitje",
  );
  const photoManagement = (
    <Button asChild variant="outline">
      <Link href="/settings?tab=branding" target="_blank" rel="noreferrer">
        <ImagePlus data-icon="inline-start" />
        {t(
          "Manage studio photos",
          "Уреди фотографии",
          "Menaxhoni fotot e studios",
        )}
        <ArrowUpRight data-icon="inline-end" />
      </Link>
    </Button>
  );
  return (
    <FieldGroup>
      {panel === "header" && (
        <>
          {choices(
            layoutLabel,
            design.header.variant,
            [
              ["simple", t("Classic", "Класично", "Klasike")],
              ["centered", t("Centered", "Центрирано", "Në qendër")],
              ["floating", t("Floating", "Лебдечко", "Lundruese")],
            ],
            (variant) =>
              change({
                ...design,
                header: {
                  ...design.header,
                  variant: variant as WebsiteDesign["header"]["variant"],
                },
              }),
          )}
          <EditorSwitch
            label={t(
              "Keep navigation visible",
              "Секогаш видлива навигација",
              "Navigimi gjithmonë i dukshëm",
            )}
            checked={design.header.sticky}
            onChange={(sticky) =>
              change({ ...design, header: { ...design.header, sticky } })
            }
          />
          <EditorSwitch
            label={t("Show studio logo", "Прикажи лого", "Shfaqni logon")}
            checked={design.header.showLogo}
            onChange={(showLogo) =>
              change({ ...design, header: { ...design.header, showLogo } })
            }
          />
        </>
      )}
      {panel === "hero" && (
        <>
          {choices(
            layoutLabel,
            design.hero.variant,
            [
              ["split", t("Split", "Поделено", "E ndarë")],
              ["background", t("Immersive", "Со заднина", "Me sfond")],
              ["minimal", t("Minimal", "Минимално", "Minimale")],
              ["poster", t("Cover story", "Насловна приказна", "Kopertina")],
            ],
            (variant) =>
              change({
                ...design,
                hero: {
                  ...design.hero,
                  variant: variant as WebsiteDesign["hero"]["variant"],
                },
              }),
          )}
          {text("heroTitle", t("Headline", "Наслов", "Titulli"), site.name)}
          {text(
            "heroDescription",
            t("Introduction", "Вовед", "Hyrja"),
            site.tagline || "",
            true,
          )}
          {text(
            "heroButton",
            t("Booking button", "Копче за закажување", "Butoni i rezervimit"),
            labels.book,
          )}
          {text(
            "heroEyebrow",
            t("Small heading", "Мал наслов", "Titulli i vogël"),
          )}
          <EditorSwitch
            label={t(
              "Show studio category",
              "Прикажи категорија",
              "Shfaqni kategorinë",
            )}
            checked={design.hero.showCategory}
            onChange={(showCategory) =>
              change({ ...design, hero: { ...design.hero, showCategory } })
            }
          />
          {choices(
            t("Text alignment", "Порамнување текст", "Rreshtimi i tekstit"),
            design.hero.align,
            [
              ["left", t("Left", "Лево", "Majtas")],
              ["center", t("Center", "Центар", "Në qendër")],
            ],
            (align) =>
              change({
                ...design,
                hero: {
                  ...design.hero,
                  align: align as WebsiteDesign["hero"]["align"],
                },
              }),
            false,
          )}
          {choices(
            t("Section height", "Висина на секција", "Lartësia e seksionit"),
            design.hero.height,
            [
              ["compact", t("Compact", "Збиено", "Kompakte")],
              ["standard", t("Balanced", "Балансирано", "E balancuar")],
              ["tall", t("Tall", "Високо", "E lartë")],
            ],
            (height) =>
              change({
                ...design,
                hero: {
                  ...design.hero,
                  height: height as WebsiteDesign["hero"]["height"],
                },
              }),
            false,
          )}
          {design.hero.variant !== "minimal" && (
            <>
              <Field>
                <FieldLabel htmlFor="sites-cover-photo">
                  {t(
                    "Cover photo",
                    "Насловна фотографија",
                    "Fotoja e ballinës",
                  )}
                </FieldLabel>
                <Select
                  value={design.hero.imageId || "default"}
                  onValueChange={(imageId) =>
                    change({
                      ...design,
                      hero: {
                        ...design.hero,
                        imageId: imageId === "default" ? "" : imageId,
                      },
                    })
                  }
                >
                  <SelectTrigger id="sites-cover-photo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="default">
                        {t(
                          "Studio cover",
                          "Насловна од студиото",
                          "Ballina e studios",
                        )}
                      </SelectItem>
                      {site.media
                        .filter((m) => ["cover", "gallery"].includes(m.type))
                        .map((item, index) => (
                          <SelectItem key={item._id} value={item._id}>
                            {item.caption ||
                              `${t("Photo", "Фотографија", "Foto")} ${index + 1}`}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {["background", "poster"].includes(design.hero.variant) && (
                <EditorRange
                  label={t(
                    "Photo darkness",
                    "Затемнување фотографија",
                    "Errësimi i fotos",
                  )}
                  value={design.hero.overlay}
                  min={0}
                  max={85}
                  unit="%"
                  onChange={(overlay) =>
                    change({ ...design, hero: { ...design.hero, overlay } })
                  }
                />
              )}
              {choices(
                t("Photo focus", "Фокус на фотографија", "Fokusi i fotos"),
                design.hero.imagePosition,
                [
                  ["top", t("Top", "Горе", "Sipër")],
                  ["center", t("Center", "Центар", "Në qendër")],
                  ["bottom", t("Bottom", "Долу", "Poshtë")],
                ],
                (imagePosition) =>
                  change({
                    ...design,
                    hero: {
                      ...design.hero,
                      imagePosition:
                        imagePosition as WebsiteDesign["hero"]["imagePosition"],
                    },
                  }),
                false,
              )}
              {photoManagement}
            </>
          )}
        </>
      )}
      {panel === "services" && (
        <>
          {choices(
            layoutLabel,
            design.services.variant,
            [
              ["cards", t("Cards", "Картички", "Kartat")],
              ["list", t("Menu", "Мени", "Menuja")],
              ["editorial", t("Editorial", "Уредничко", "Editoriale")],
            ],
            (variant) =>
              change({
                ...design,
                services: {
                  ...design.services,
                  variant: variant as WebsiteDesign["services"]["variant"],
                },
              }),
          )}
          {text(
            "servicesTitle",
            t("Heading", "Наслов", "Titulli"),
            labels.chooseService,
          )}
          {text(
            "servicesDescription",
            t("Introduction", "Вовед", "Hyrja"),
            "",
            true,
          )}
          <EditorSwitch
            label={t(
              "Show service photos",
              "Прикажи фотографии",
              "Shfaqni fotot e shërbimeve",
            )}
            checked={design.services.showPhotos}
            onChange={(showPhotos) =>
              change({
                ...design,
                services: { ...design.services, showPhotos },
              })
            }
          />
          <EditorSwitch
            label={t(
              "Show descriptions",
              "Прикажи описи",
              "Shfaqni përshkrimet",
            )}
            checked={design.services.showDescriptions}
            onChange={(showDescriptions) =>
              change({
                ...design,
                services: { ...design.services, showDescriptions },
              })
            }
          />
          {design.services.variant === "cards" &&
            choices(
              t(
                "Desktop columns",
                "Колони на компјутер",
                "Kolonat në kompjuter",
              ),
              String(design.services.columns),
              [
                ["2", "2"],
                ["3", "3"],
              ],
              (columns) =>
                change({
                  ...design,
                  services: {
                    ...design.services,
                    columns: Number(columns) as 2 | 3,
                  },
                }),
              false,
            )}
          {site.services.length > 0 && (
            <>
              <Field>
                <FieldLabel htmlFor="sites-service">
                  {t(
                    "Website service text",
                    "Текст за услуга на веб-страницата",
                    "Teksti i shërbimit në uebsajt",
                  )}
                </FieldLabel>
                <Select value={chosenService} onValueChange={setChosenService}>
                  <SelectTrigger id="sites-service">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {site.services.map((service) => (
                        <SelectItem key={service._id} value={service._id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {t(
                    "Only the public wording changes. Prices and availability come from your services.",
                    "Се менува само јавниот текст. Цените и достапноста се преземаат од услугите.",
                    "Ndryshon vetëm teksti publik. Çmimet dhe disponueshmëria vijnë nga shërbimet tuaja.",
                  )}
                </FieldDescription>
              </Field>
              {(() => {
                const service =
                  site.services.find((s) => s._id === chosenService) ??
                  site.services[0];
                const copy = design.serviceCopy.find(
                  (s) => s.serviceId === service._id,
                );
                const update = (key: "name" | "description", value: string) =>
                  change({
                    ...design,
                    serviceCopy: [
                      ...design.serviceCopy.filter(
                        (s) => s.serviceId !== service._id,
                      ),
                      {
                        serviceId: service._id,
                        name: copy?.name || "",
                        description: copy?.description || "",
                        [key]: value,
                      },
                    ],
                  });
                return (
                  <>
                    <EditorText
                      label={t("Display name", "Јавно име", "Emri publik")}
                      value={copy?.name || ""}
                      placeholder={service.name}
                      maxLength={120}
                      onChange={(value) => update("name", value)}
                    />
                    <EditorText
                      label={t("Description", "Опис", "Përshkrimi")}
                      value={copy?.description || ""}
                      placeholder={service.consumerDescription || ""}
                      multiline
                      maxLength={1000}
                      onChange={(value) => update("description", value)}
                    />
                  </>
                );
              })()}
            </>
          )}
        </>
      )}
      {panel === "about" && (
        <>
          {choices(
            layoutLabel,
            design.about.variant,
            [
              ["split", t("Split", "Поделено", "E ndarë")],
              ["centered", t("Centered", "Центрирано", "Në qendër")],
              ["card", t("Inset card", "Картичка", "Kartë e futur")],
            ],
            (variant) =>
              change({
                ...design,
                about: {
                  variant: variant as WebsiteDesign["about"]["variant"],
                },
              }),
          )}
          {text(
            "aboutTitle",
            t("Heading", "Наслов", "Titulli"),
            labels.aboutTitle,
          )}
          {text(
            "aboutBody",
            t("Your story", "Вашата приказна", "Historia juaj"),
            site.bio || "",
            true,
          )}
        </>
      )}
      {panel === "gallery" && (
        <>
          {choices(
            layoutLabel,
            design.gallery.variant,
            [
              ["bento", "Bento"],
              ["carousel", t("Carousel", "Карусел", "Karusel")],
              ["slideshow", t("Slideshow", "Слајдшоу", "Prezantim")],
              ["grid", t("Grid", "Мрежа", "Rrjetë")],
            ],
            (variant) =>
              change({
                ...design,
                gallery: {
                  ...design.gallery,
                  variant: variant as WebsiteDesign["gallery"]["variant"],
                },
              }),
          )}
          {text(
            "galleryTitle",
            t("Heading", "Наслов", "Titulli"),
            labels.galleryTitle,
          )}
          {text(
            "galleryDescription",
            t("Caption", "Опис", "Përshkrimi"),
            "",
            true,
          )}
          {choices(
            t(
              "Photo proportions",
              "Пропорции на фотографии",
              "Përmasat e fotove",
            ),
            design.gallery.aspect,
            [
              ["square", t("Square", "Квадрат", "Katrore")],
              ["landscape", t("Landscape", "Хоризонтално", "Horizontale")],
              ["portrait", t("Portrait", "Вертикално", "Vertikale")],
            ],
            (aspect) =>
              change({
                ...design,
                gallery: {
                  ...design.gallery,
                  aspect: aspect as WebsiteDesign["gallery"]["aspect"],
                },
              }),
            false,
          )}
          {["slideshow", "carousel"].includes(design.gallery.variant) && (
            <>
              <EditorSwitch
                label={t(
                  "Rotate photos automatically",
                  "Автоматски менувај фотографии",
                  "Ndërroni fotot automatikisht",
                )}
                checked={design.gallery.autoplay}
                onChange={(autoplay) =>
                  change({
                    ...design,
                    gallery: { ...design.gallery, autoplay },
                  })
                }
              />
              {design.gallery.autoplay && (
                <EditorRange
                  label={t(
                    "Time per photo",
                    "Време по фотографија",
                    "Koha për foto",
                  )}
                  value={design.gallery.interval}
                  min={3}
                  max={12}
                  unit="s"
                  onChange={(interval) =>
                    change({
                      ...design,
                      gallery: { ...design.gallery, interval },
                    })
                  }
                />
              )}
            </>
          )}
          {(() => {
            const photos = design.gallery.imageIds.length
              ? design.gallery.imageIds.flatMap((id) => {
                  const photo = site.media.find((m) => m._id === id);
                  return photo ? [photo] : [];
                })
              : site.media.filter((m) => m.type === "gallery");
            const move = (index: number, offset: number) => {
              const ids = photos.map((m) => m._id);
              [ids[index], ids[index + offset]] = [
                ids[index + offset],
                ids[index],
              ];
              change({
                ...design,
                gallery: { ...design.gallery, imageIds: ids },
              });
            };
            return (
              photos.length > 0 && (
                <Field>
                  <FieldLabel>
                    {t(
                      "Photo order",
                      "Редослед на фотографии",
                      "Renditja e fotove",
                    )}
                  </FieldLabel>
                  <div className="sites-photo-order">
                    {photos.map((photo, index) => (
                      <div key={photo._id}>
                        <span className="sites-photo-thumbnail">
                          <Image
                            src={photo.url}
                            alt=""
                            fill
                            unoptimized
                            sizes="44px"
                          />
                        </span>
                        <span>
                          {photo.caption ||
                            `${t("Photo", "Фотографија", "Foto")} ${index + 1}`}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                          aria-label={t(
                            "Move photo up",
                            "Помести фотографија нагоре",
                            "Lëvizni foton lart",
                          )}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === photos.length - 1}
                          onClick={() => move(index, 1)}
                          aria-label={t(
                            "Move photo down",
                            "Помести фотографија надолу",
                            "Lëvizni foton poshtë",
                          )}
                        >
                          <ArrowDown />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Field>
              )
            );
          })()}
          {photoManagement}
        </>
      )}
      {panel === "team" && (
        <>
          {choices(
            layoutLabel,
            design.team.variant,
            [
              ["cards", t("Portraits", "Портрети", "Portretet")],
              ["compact", t("Compact", "Збиено", "Kompakte")],
            ],
            (variant) =>
              change({
                ...design,
                team: { variant: variant as WebsiteDesign["team"]["variant"] },
              }),
          )}
          {text(
            "teamTitle",
            t("Heading", "Наслов", "Titulli"),
            labels.teamTitle,
          )}
          <FieldDescription>
            {t(
              "Profiles come from your studio team.",
              "Профилите се преземаат од тимот на студиото.",
              "Profilet vijnë nga ekipi i studios suaj.",
            )}
          </FieldDescription>
        </>
      )}
      {panel === "info" && (
        <>
          {choices(
            layoutLabel,
            design.info.variant,
            [
              ["cards", t("Cards", "Картички", "Kartat")],
              ["split", t("Split", "Поделено", "E ndarë")],
              ["minimal", t("Minimal", "Минимално", "Minimale")],
            ],
            (variant) =>
              change({
                ...design,
                info: {
                  ...design.info,
                  variant: variant as WebsiteDesign["info"]["variant"],
                },
              }),
          )}
          {text(
            "infoTitle",
            t("Heading", "Наслов", "Titulli"),
            labels.infoTitle,
          )}
          <EditorSwitch
            label={t(
              "Show opening hours",
              "Прикажи работно време",
              "Shfaqni orarin e punës",
            )}
            checked={design.info.showHours}
            onChange={(showHours) =>
              change({ ...design, info: { ...design.info, showHours } })
            }
          />
          <EditorSwitch
            label={t("Show location map", "Прикажи мапа", "Shfaqni hartën")}
            checked={design.info.showMap}
            onChange={(showMap) =>
              change({ ...design, info: { ...design.info, showMap } })
            }
          />
          <FieldDescription>
            {t(
              "Your address, contact details and hours stay connected to studio settings.",
              "Адресата, контактот и работното време остануваат поврзани со поставките на студиото.",
              "Adresa, kontakti dhe orari mbeten të lidhura me cilësimet e studios.",
            )}
          </FieldDescription>
        </>
      )}
      {panel === "footer" && (
        <>
          {choices(
            layoutLabel,
            design.footer.variant,
            [
              ["simple", t("Simple", "Едноставно", "E thjeshtë")],
              ["statement", t("Signature", "Потпис", "Nënshkrimi")],
            ],
            (variant) =>
              change({
                ...design,
                footer: {
                  ...design.footer,
                  variant: variant as WebsiteDesign["footer"]["variant"],
                },
              }),
          )}
          {design.footer.variant === "statement" &&
            text(
              "footerText",
              t("Closing line", "Завршна реченица", "Fjalia përmbyllëse"),
              site.name,
            )}
          <EditorSwitch
            label={t(
              "Show Instagram link",
              "Прикажи Instagram",
              "Shfaqni Instagram",
            )}
            checked={design.footer.showSocial}
            onChange={(showSocial) =>
              change({ ...design, footer: { ...design.footer, showSocial } })
            }
          />
        </>
      )}
      {["about", "gallery", "team"].includes(panel) && (
        <EditorSwitch
          label={t(
            "Show this section",
            "Прикажи ја секцијата",
            "Shfaqni këtë seksion",
          )}
          checked={
            design.sections.find((s) => s.id === panel)?.visible ?? false
          }
          onChange={(visible) =>
            change({
              ...design,
              sections: design.sections.map((section) =>
                section.id === panel ? { ...section, visible } : section,
              ),
            })
          }
        />
      )}
    </FieldGroup>
  );
}
