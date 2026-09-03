"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation } from "convex/react";
import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  type CompressImageOptions,
  IMAGE_PRESETS,
  uploadCompressedImage,
} from "@/lib/image-compression";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { SettingsCard } from "../SettingsCard";

interface IdentityProfileTabProps {
  orgId: Id<"orgs">;
  initialData: {
    name: string;
    logoUrl: string;
    tagline: string;
    bio: string;
    phone: string;
    instagramHandle: string;
    instagramPageId: string;
    websiteUrl: string;
  };
  media: Array<{
    _id: Id<"org_media">;
    type: string;
    url: string;
    caption?: string;
  }>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function upload(
  file: File,
  generateUploadUrl: () => Promise<string>,
  preset?: CompressImageOptions,
): Promise<Id<"_storage">> {
  return (await uploadCompressedImage({
    file,
    getUploadUrl: generateUploadUrl,
    options: preset,
  })) as Id<"_storage">;
}

const MAX_GALLERY_PHOTOS = 3;

export function IdentityProfileTab({
  orgId,
  initialData,
  media,
}: IdentityProfileTabProps) {
  const { t } = useDashboardI18n();
  const [branding, setBranding] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const updateBranding = useMutation(api.orgSettings.updateOrgBranding);
  const updateLogo = useMutation(api.orgSettings.updateLogo);
  const removeLogo = useMutation(api.orgSettings.removeLogo);
  const generateUploadUrl = useMutation(api.activation.generateUploadUrl);
  const addMedia = useMutation(api.orgMedia.addMedia);
  const removeMedia = useMutation(api.orgMedia.removeMedia);

  const cover = media.find((item) => item.type === "cover");
  const gallery = media.filter((item) => item.type === "gallery");

  const handleSave = async () => {
    if (!branding.name.trim()) {
      toast.error(
        t("Business name is required.", "Името на бизнисот е задолжително."),
      );
      return;
    }
    setIsSaving(true);
    try {
      await updateBranding({
        orgId,
        name: branding.name.trim(),
        logoUrl: branding.logoUrl || undefined,
        tagline: branding.tagline.trim() || undefined,
        bio: branding.bio.trim() || undefined,
        phone: branding.phone.trim() || undefined,
        instagramHandle: branding.instagramHandle.trim() || undefined,
        instagramPageId: branding.instagramPageId.trim() || undefined,
        websiteUrl: branding.websiteUrl.trim() || undefined,
      });
      toast.success(
        t("Business profile saved", "Профилот на бизнисот е зачуван"),
      );
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          t("Changes could not be saved.", "Промените не може да се зачуваат."),
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const chooseFile = (
    multiple: boolean,
    onFiles: (files: File[]) => Promise<void>,
  ) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = multiple;
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (files.length) void onFiles(files);
    };
    input.click();
  };

  const handleLogo = () =>
    chooseFile(false, async ([file]) => {
      setUploading("logo");
      try {
        const storageId = await upload(
          file,
          generateUploadUrl,
          IMAGE_PRESETS.logo,
        );
        const logoUrl = await updateLogo({ orgId, storageId });
        setBranding((current) => ({ ...current, logoUrl }));
        toast.success(t("Logo updated", "Логото е ажурирано"));
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            t(
              "Changes could not be saved.",
              "Промените не може да се зачуваат.",
            ),
          ),
        );
      } finally {
        setUploading(null);
      }
    });

  const handleRemoveLogo = async () => {
    try {
      await removeLogo({ orgId });
      setBranding((current) => ({ ...current, logoUrl: "" }));
      toast.success(t("Logo removed", "Логото е отстрането"));
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          t("Changes could not be saved.", "Промените не може да се зачуваат."),
        ),
      );
    }
  };

  const handleMedia = (type: "cover" | "gallery") => {
    if (type === "gallery" && gallery.length >= MAX_GALLERY_PHOTOS) {
      toast.error(
        t(
          `Maximum of ${MAX_GALLERY_PHOTOS} gallery photos reached.`,
          `Достигнат е максимумот од ${MAX_GALLERY_PHOTOS} фотографии во галеријата.`,
        ),
      );
      return;
    }
    const remainingSlots =
      type === "gallery" ? MAX_GALLERY_PHOTOS - gallery.length : 1;
    chooseFile(type === "gallery", async (rawFiles) => {
      let files = rawFiles;
      if (type === "gallery" && files.length > remainingSlots) {
        toast.error(
          remainingSlots === 1
            ? t(
                "You can only add up to 1 more gallery photo (maximum 3).",
                "Може да додадете уште најмногу 1 фотографија во галеријата (максимум 3).",
              )
            : t(
                `You can only add up to ${remainingSlots} more gallery photos (maximum ${MAX_GALLERY_PHOTOS}).`,
                `Може да додадете уште најмногу ${remainingSlots} фотографии во галеријата (максимум ${MAX_GALLERY_PHOTOS}).`,
              ),
        );
        files = files.slice(0, remainingSlots);
      }
      setUploading(type);
      try {
        const preset =
          type === "cover" ? IMAGE_PRESETS.cover : IMAGE_PRESETS.gallery;
        for (const [index, file] of files.entries()) {
          const storageId = await upload(file, generateUploadUrl, preset);
          await addMedia({
            orgId,
            storageId,
            type,
            sortOrder: type === "cover" ? 0 : gallery.length + index + 1,
          });
        }
        toast.success(
          type === "cover"
            ? t("Cover updated", "Насловната слика е ажурирана")
            : t("Gallery updated", "Галеријата е ажурирана"),
        );
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            t(
              "Changes could not be saved.",
              "Промените не може да се зачуваат.",
            ),
          ),
        );
      } finally {
        setUploading(null);
      }
    });
  };

  const handleRemove = async (mediaId: Id<"org_media">) => {
    try {
      await removeMedia({ orgId, mediaId });
      toast.success(t("Photo removed", "Фотографијата е отстранета"));
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          t("Changes could not be saved.", "Промените не може да се зачуваат."),
        ),
      );
    }
  };

  const update = (field: keyof typeof branding, value: string) =>
    setBranding((current) => ({ ...current, [field]: value }));

  return (
    <TabsContent value="branding" className="m-0">
      <div className="flex flex-col gap-6">
        <SettingsCard
          title={t("Storefront images", "Слики за страницата")}
          description={t(
            "Your logo and cover are shared by onboarding, Settings, and opus.mk.",
            "Вашето лого и насловна слика се користат при воведот, во Поставки и на opus.mk.",
          )}
          contentClassName="grid gap-6 md:grid-cols-[208px_1fr]"
        >
          <div className="flex flex-col gap-3">
            <FieldLabel>{t("Logo", "Лого")}</FieldLabel>
            <div className="group relative flex h-52 w-52 max-w-full aspect-square flex-col justify-end overflow-hidden rounded-2xl border bg-secondary md:w-full">
              {branding.logoUrl ? (
                <Image
                  src={branding.logoUrl}
                  alt={t("Business logo", "Лого на бизнисот")}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(min-width: 768px) 208px, 100vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImagePlus className="text-muted-foreground" />
                </div>
              )}
              {uploading === "logo" && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-xs">
                  <Spinner />
                </div>
              )}
              <div className="relative z-10 flex justify-end gap-2 bg-gradient-to-t from-black/60 p-4 pt-10">
                {branding.logoUrl && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    onClick={handleRemoveLogo}
                    disabled={uploading === "logo"}
                    aria-label={t("Remove logo", "Отстрани лого")}
                  >
                    <Trash2 data-icon="inline-start" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleLogo}
                  disabled={uploading === "logo"}
                >
                  {uploading === "logo" && <Spinner data-icon="inline-start" />}
                  {uploading === "logo"
                    ? t("Uploading…", "Се прикачува…")
                    : branding.logoUrl
                      ? t("Replace", "Замени")
                      : t("Upload logo", "Прикачи лого")}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <FieldLabel>{t("Cover photo", "Насловна слика")}</FieldLabel>
            <div className="group relative flex h-52 w-full flex-col justify-end overflow-hidden rounded-2xl border bg-secondary">
              {cover ? (
                <Image
                  src={cover.url}
                  alt={t("Business cover", "Насловна слика на бизнисот")}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(min-width: 768px) 700px, 100vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImagePlus className="text-muted-foreground" />
                </div>
              )}
              {uploading === "cover" && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-xs">
                  <Spinner />
                </div>
              )}
              <div className="relative z-10 flex justify-end gap-2 bg-gradient-to-t from-black/60 p-4 pt-10">
                {cover && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    onClick={() => handleRemove(cover._id)}
                    disabled={uploading === "cover"}
                    aria-label={t("Remove cover", "Отстрани насловна слика")}
                  >
                    <Trash2 data-icon="inline-start" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleMedia("cover")}
                  disabled={uploading === "cover"}
                >
                  {uploading === "cover" && (
                    <Spinner data-icon="inline-start" />
                  )}
                  {uploading === "cover"
                    ? t("Uploading…", "Се прикачува…")
                    : cover
                      ? t("Replace", "Замени")
                      : t("Upload cover", "Прикачи насловна слика")}
                </Button>
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title={t("Identity and contact", "Идентитет и контакт")}
          description={t(
            "Customer-facing information used across the booking experience.",
            "Информации видливи за клиентите при процесот на закажување.",
          )}
          footer={
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              {isSaving
                ? t("Saving…", "Се зачувува…")
                : t("Save profile", "Зачувај профил")}
            </Button>
          }
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="settings-name">
                {t("Business name", "Име на бизнис")}
              </FieldLabel>
              <Input
                id="settings-name"
                value={branding.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-tagline">
                {t("Tagline", "Краток опис")}
              </FieldLabel>
              <Input
                id="settings-tagline"
                value={branding.tagline}
                onChange={(event) => update("tagline", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-bio">
                {t("About", "За нас")}
              </FieldLabel>
              <Textarea
                id="settings-bio"
                value={branding.bio}
                onChange={(event) => update("bio", event.target.value)}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="settings-phone">
                  {t("Phone", "Телефон")}
                </FieldLabel>
                <Input
                  id="settings-phone"
                  value={branding.phone}
                  onChange={(event) => update("phone", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-instagram">
                  {t("Instagram", "Instagram")}
                </FieldLabel>
                <Input
                  id="settings-instagram"
                  value={branding.instagramHandle}
                  onChange={(event) =>
                    update("instagramHandle", event.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-page-id">
                  {t("Instagram page ID", "ID на Instagram страница")}
                </FieldLabel>
                <Input
                  id="settings-page-id"
                  value={branding.instagramPageId}
                  onChange={(event) =>
                    update("instagramPageId", event.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-website">
                  {t("Website", "Веб-страница")}
                </FieldLabel>
                <Input
                  id="settings-website"
                  value={branding.websiteUrl}
                  onChange={(event) => update("websiteUrl", event.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
        </SettingsCard>

        <SettingsCard
          title={t("Gallery", "Галерија")}
          description={t(
            "Optional photos of your space, team, or work.",
            "Изборни фотографии од вашиот простор, тим или изработени третмани.",
          )}
          action={
            <span className="rounded-full border border-border/80 bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {gallery.length}/{MAX_GALLERY_PHOTOS}
            </span>
          }
          contentClassName="flex flex-col gap-4"
        >
          <div className="grid grid-cols-3 gap-3">
            {gallery.map((item) => (
              <div
                key={item._id}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-xs"
              >
                <Image
                  src={item.url}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="180px"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  className="absolute right-2 top-2"
                  onClick={() => handleRemove(item._id)}
                  aria-label={t(
                    "Remove gallery photo",
                    "Отстрани фотографија од галерија",
                  )}
                >
                  <Trash2 data-icon="inline-start" />
                </Button>
              </div>
            ))}

            {gallery.length < MAX_GALLERY_PHOTOS && (
              <button
                type="button"
                onClick={() => handleMedia("gallery")}
                disabled={uploading === "gallery"}
                className="group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dotted border-border/80 bg-muted/15 transition-all hover:border-primary/60 hover:bg-muted/35 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {uploading === "gallery" ? (
                  <>
                    <Spinner className="size-6 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("Uploading…", "Се прикачува…")}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <Plus className="size-5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                      {t("Add photo", "Додај фотографија")}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
          <FieldDescription>
            {t(
              "Images are soft-deleted so audit history remains intact.",
              "Сликите се бришат со меко бришење за историјата на ревизија да остане непроменета.",
            )}
          </FieldDescription>
        </SettingsCard>
      </div>
    </TabsContent>
  );
}
