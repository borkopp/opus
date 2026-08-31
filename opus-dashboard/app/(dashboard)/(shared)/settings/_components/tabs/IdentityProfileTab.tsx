"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation } from "convex/react";
import { ImagePlus, Save, Trash2, Upload } from "lucide-react";
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
import { validateImageFile } from "@/lib/file-validation";
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

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Changes could not be saved.";
}

async function upload(
  file: File,
  generateUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">> {
  const validation = validateImageFile(file);
  if (validation) throw new Error(validation);
  const url = await generateUploadUrl();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) throw new Error("Image upload failed.");
  return ((await response.json()) as { storageId: Id<"_storage"> }).storageId;
}

export function IdentityProfileTab({
  orgId,
  initialData,
  media,
}: IdentityProfileTabProps) {
  const [branding, setBranding] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const updateBranding = useMutation(api.orgSettings.updateOrgBranding);
  const updateLogo = useMutation(api.orgSettings.updateLogo);
  const generateUploadUrl = useMutation(api.activation.generateUploadUrl);
  const addMedia = useMutation(api.orgMedia.addMedia);
  const removeMedia = useMutation(api.orgMedia.removeMedia);

  const cover = media.find((item) => item.type === "cover");
  const gallery = media.filter((item) => item.type === "gallery");

  const handleSave = async () => {
    if (!branding.name.trim()) {
      toast.error("Business name is required.");
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
      toast.success("Business profile saved");
    } catch (error) {
      toast.error(message(error));
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
        const storageId = await upload(file, generateUploadUrl);
        const logoUrl = await updateLogo({ orgId, storageId });
        setBranding((current) => ({ ...current, logoUrl }));
        toast.success("Logo updated");
      } catch (error) {
        toast.error(message(error));
      } finally {
        setUploading(null);
      }
    });

  const handleMedia = (type: "cover" | "gallery") =>
    chooseFile(type === "gallery", async (files) => {
      setUploading(type);
      try {
        for (const [index, file] of files.entries()) {
          const storageId = await upload(file, generateUploadUrl);
          await addMedia({
            orgId,
            storageId,
            type,
            sortOrder: type === "cover" ? 0 : gallery.length + index + 1,
          });
        }
        toast.success(type === "cover" ? "Cover updated" : "Gallery updated");
      } catch (error) {
        toast.error(message(error));
      } finally {
        setUploading(null);
      }
    });

  const handleRemove = async (mediaId: Id<"org_media">) => {
    try {
      await removeMedia({ orgId, mediaId });
      toast.success("Photo removed");
    } catch (error) {
      toast.error(message(error));
    }
  };

  const update = (field: keyof typeof branding, value: string) =>
    setBranding((current) => ({ ...current, [field]: value }));

  return (
    <TabsContent value="branding" className="m-0">
      <div className="flex flex-col gap-6">
        <SettingsCard
          title="Storefront images"
          description="Your logo and cover are shared by onboarding, Settings, and opus.mk."
          contentClassName="grid gap-6 md:grid-cols-[180px_1fr]"
        >
          <div className="flex flex-col gap-3">
            <FieldLabel>Logo</FieldLabel>
            <button
              type="button"
              onClick={handleLogo}
              aria-label="Upload business logo"
              className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border bg-secondary outline-none transition-colors hover:bg-secondary/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {branding.logoUrl ? (
                <Image
                  src={branding.logoUrl}
                  alt="Business logo"
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="180px"
                />
              ) : (
                <Upload />
              )}
              {uploading === "logo" && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Spinner />
                </span>
              )}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <FieldLabel>Cover photo</FieldLabel>
            <div className="relative min-h-52 overflow-hidden rounded-3xl border bg-secondary">
              {cover ? (
                <Image
                  src={cover.url}
                  alt="Business cover"
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="700px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImagePlus className="text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/60 p-4 pt-10">
                {cover && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    onClick={() => handleRemove(cover._id)}
                    aria-label="Remove cover"
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
                    ? "Uploading…"
                    : cover
                      ? "Replace"
                      : "Upload cover"}
                </Button>
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Identity and contact"
          description="Customer-facing information used across the booking experience."
          footer={
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              {isSaving ? "Saving…" : "Save profile"}
            </Button>
          }
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="settings-name">Business name</FieldLabel>
              <Input
                id="settings-name"
                value={branding.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-tagline">Tagline</FieldLabel>
              <Input
                id="settings-tagline"
                value={branding.tagline}
                onChange={(event) => update("tagline", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-bio">About</FieldLabel>
              <Textarea
                id="settings-bio"
                value={branding.bio}
                onChange={(event) => update("bio", event.target.value)}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="settings-phone">Phone</FieldLabel>
                <Input
                  id="settings-phone"
                  value={branding.phone}
                  onChange={(event) => update("phone", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-instagram">Instagram</FieldLabel>
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
                  Instagram page ID
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
                <FieldLabel htmlFor="settings-website">Website</FieldLabel>
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
          title="Gallery"
          description="Optional photos of your space, team, or work."
          contentClassName="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map((item) => (
              <div
                key={item._id}
                className="group relative aspect-square overflow-hidden rounded-2xl border"
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
                  aria-label="Remove gallery photo"
                >
                  <Trash2 data-icon="inline-start" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleMedia("gallery")}
            disabled={uploading === "gallery"}
            className="self-start"
          >
            {uploading === "gallery" ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <ImagePlus data-icon="inline-start" />
            )}
            {uploading === "gallery" ? "Uploading…" : "Add gallery photos"}
          </Button>
          <FieldDescription>
            Images are soft-deleted so audit history remains intact.
          </FieldDescription>
        </SettingsCard>
      </div>
    </TabsContent>
  );
}
