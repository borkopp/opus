"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { DebouncedTextarea } from "@/components/ui/debounced-textarea";
import {
  IconDeviceFloppy,
  IconUpload,
  IconTrash,
  IconPhoto,
  IconBrandInstagram,
  IconPhone,
  IconWorld,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { validateImageFile } from "../validation";

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
    primary: string;
    secondary: string;
    accent: string;
  };
  media: Array<{ _id: Id<"org_media">; type: string; url: string; caption?: string }>;
}

export function IdentityProfileTab({ orgId, initialData, media }: IdentityProfileTabProps) {
  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const [branding, setBranding] = useState({ ...initialData });
  const [nameError, setNameError] = useState<string | undefined>();
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setBranding({ ...initialData });
  }, [
    initialData.name,
    initialData.logoUrl,
    initialData.tagline,
    initialData.bio,
    initialData.phone,
    initialData.instagramHandle,
    initialData.instagramPageId,
    initialData.websiteUrl,
    initialData.primary,
    initialData.secondary,
    initialData.accent,
  ]);

  const updateOrgBranding = useMutation(api.orgSettings.updateOrgBranding);
  const updateLogo = useMutation(api.orgSettings.updateLogo);
  const generateUploadUrl = useMutation(api.orgMedia.generateUploadUrl);
  const addMedia = useMutation(api.orgMedia.addMedia);
  const removeMedia = useMutation(api.orgMedia.removeMedia);

  const handleSave = async () => {
    if (!branding.name.trim()) {
      setNameError("Business name is required.");
      return;
    }
    setNameError(undefined);
    setIsSaving(true);
    try {
      await updateOrgBranding({
        orgId,
        name: branding.name.trim(),
        logoUrl: branding.logoUrl || undefined,
        tagline: branding.tagline || undefined,
        bio: branding.bio || undefined,
        phone: branding.phone || undefined,
        instagramHandle: branding.instagramHandle || undefined,
        instagramPageId: branding.instagramPageId || undefined,
        websiteUrl: branding.websiteUrl || undefined,
        brandColors: {
          primary: branding.primary,
          secondary: branding.secondary,
          accent: branding.accent,
        },
      });
      if (isMounted.current) toast.success("Branding saved");
    } catch (e: any) {
      if (isMounted.current) toast.error(e.message ?? "Failed to save branding.");
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  const handleMediaUpload = async (type: "cover" | "gallery" | "team") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = type === "gallery";
    input.onchange = async () => {
      if (!input.files?.length) return;

      // Validate all files before uploading any
      for (let i = 0; i < input.files.length; i++) {
        const err = validateImageFile(input.files[i]);
        if (err) { toast.error(err); return; }
      }

      setUploadingMedia(type);
      try {
        if (type === "cover") {
          const oldCover = media.find((m) => m.type === "cover");
          if (oldCover) await removeMedia({ orgId, mediaId: oldCover._id });
        }
        for (let i = 0; i < input.files.length; i++) {
          const file = input.files[i];
          const postUrl = await generateUploadUrl();
          const res = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!res.ok) throw new Error(`Upload failed (${res.status})`);
          const { storageId } = await res.json();
          const sortOrder =
            type === "cover" ? 0 : media.filter((m) => m.type === type).length + i;
          await addMedia({ orgId, storageId, type, sortOrder });
        }
        if (isMounted.current) toast.success(
          type === "gallery"
            ? "Photos added"
            : `${type.charAt(0).toUpperCase() + type.slice(1)} updated`,
        );
      } catch (e: any) {
        if (isMounted.current) toast.error(e.message || "Upload failed — check your connection and try again.");
      } finally {
        if (isMounted.current) setUploadingMedia(null);
      }
    };
    input.click();
  };

  const handleRemoveMedia = async (mediaId: Id<"org_media">) => {
    try {
      await removeMedia({ orgId, mediaId });
      toast.success("Photo removed");
    } catch (e: any) {
      toast.error(e.message || "Failed to remove");
    }
  };

  const handleLogoUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      if (!input.files?.length) return;
      const err = validateImageFile(input.files[0]);
      if (err) { toast.error(err); return; }
      setUploadingMedia("logo");
      try {
        const file = input.files[0];
        const postUrl = await generateUploadUrl();
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        const { storageId } = await res.json();
        const newLogoUrl = await updateLogo({ orgId, storageId });
        if (isMounted.current) {
          setBranding((b) => ({ ...b, logoUrl: newLogoUrl }));
          toast.success("Logo updated successfully");
        }
      } catch (e: any) {
        if (isMounted.current) toast.error(e.message || "Logo upload failed — check your connection.");
      } finally {
        if (isMounted.current) setUploadingMedia(null);
      }
    };
    input.click();
  };

  const cover = media.find((m) => m.type === "cover");
  const gallery = media.filter((m) => m.type === "gallery");

  return (
    <TabsContent
      value="branding"
      className="m-0 focus-visible:outline-none focus-visible:ring-0"
    >
      <div className="space-y-6">
        {/* ── Cover Photo ─────────────────────────────────────── */}
        <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
          <div className="mb-8">
            <h2 className="text-2xl font-medium font-display tracking-tight mb-1">Cover <span className="serif-accent-inline text-2xl">Photo</span></h2>
            <p className="text-sm text-muted-foreground">
              The hero banner on your opus.mk listing.
            </p>
          </div>
          <div className="space-y-10">
            {cover ? (
              <div className="relative group rounded-xl overflow-hidden">
                <img
                  src={cover.url}
                  alt="Cover"
                  className="w-full h-48 sm:h-56 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full shadow-lg"
                      onClick={() => handleMediaUpload("cover")}
                    >
                      <IconUpload size={14} className="mr-1.5" /> Replace
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full shadow-lg"
                      onClick={() => handleRemoveMedia(cover._id)}
                    >
                      <IconTrash size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleMediaUpload("cover")}
                disabled={uploadingMedia === "cover"}
                className="w-full h-48 sm:h-56 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-3 bg-muted/5 group"
              >
                {uploadingMedia === "cover" ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <div className="p-4 rounded-full bg-background shadow-sm border border-border/40 group-hover:scale-110 transition-transform">
                    <IconPhoto size={28} className="text-muted-foreground/60" />
                  </div>
                )}
                <div className="flex flex-col items-center">
                  <span className="text-sm text-foreground font-semibold">
                    {uploadingMedia === "cover" ? "Uploading..." : "Upload Cover Photo"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Recommended size: 1920x1080px
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* ── Identity & Profile ──────────────────────────────── */}
        <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
          <div className="mb-8">
            <h2 className="text-2xl font-medium font-display tracking-tight mb-1">Identity & <span className="serif-accent-inline text-2xl">Profile</span></h2>
            <p className="text-sm text-muted-foreground">
              Your business name, tagline, and bio shown on opus.mk.
            </p>
          </div>
          <div className="space-y-10">
            <div className="flex items-start gap-6">
              {/* Logo upload — semantic button */}
              <div className="shrink-0">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Logo</Label>
                <button
                  type="button"
                  aria-label="Upload logo"
                  onClick={handleLogoUpload}
                  className="relative group h-20 w-20 rounded-xl border border-dashed border-border/60 hover:border-primary/40 transition-colors flex items-center justify-center cursor-pointer overflow-hidden bg-muted/5 mt-1"
                >
                  {branding.logoUrl ? (
                    <>
                      <img
                        src={branding.logoUrl}
                        alt="Logo"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <IconUpload size={16} className="text-white" />
                      </div>
                    </>
                  ) : uploadingMedia === "logo" ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <IconUpload size={18} className="text-muted-foreground/40" />
                  )}
                </button>
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="business-name">Business Name</Label>
                  <DebouncedInput
                    id="business-name"
                    value={branding.name}
                    maxLength={100}
                    aria-describedby={nameError ? "business-name-error" : undefined}
                    aria-invalid={!!nameError}
                    className={cn("bg-white", nameError && "border-destructive")}
                    onChange={(val) => {
                      setBranding({ ...branding, name: val });
                      nameError && setNameError(undefined);
                    }}
                  />
                  {nameError && (
                    <p id="business-name-error" role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                      <IconAlertCircle size={13} className="shrink-0" />
                      {nameError}
                    </p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="tagline">
                    Tagline{" "}
                    <span className="text-muted-foreground font-normal ml-1">
                      — one-liner that hooks customers
                    </span>
                  </Label>
                  <DebouncedInput
                    id="tagline"
                    value={branding.tagline}
                    maxLength={160}
                    className="bg-white"
                    placeholder="Premium haircuts &amp; wet shaves since 2012"
                    onChange={(val) => setBranding({ ...branding, tagline: val })}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bio">
                Bio / About{" "}
                <span className="text-muted-foreground font-normal ml-1">
                  — tell customers what makes you special
                </span>
              </Label>
              <DebouncedTextarea
                id="bio"
                value={branding.bio}
                onChange={(val) => setBranding({ ...branding, bio: val })}
                rows={4}
                placeholder="We're a small team of passionate barbers dedicated to..."
                className={cn(
                  "w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm ring-offset-background",
                  "placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "resize-y min-h-[100px]",
                )}
              />
              <p className="text-xs text-muted-foreground">{branding.bio.length}/500 characters</p>
            </div>
          </div>
        </div>

        {/* ── Gallery Photos ──────────────────────────────────── */}
        <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-medium font-display tracking-tight mb-1">Gallery</h2>
              <p className="text-muted-foreground">Showcase your work, venue, and team.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full gap-1.5 shrink-0 mt-1"
              onClick={() => handleMediaUpload("gallery")}
              disabled={uploadingMedia === "gallery"}
            >
              {uploadingMedia === "gallery" ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <IconUpload size={14} />
              )}
              Add Photos
            </Button>
          </div>
          <div className="space-y-10">
            {gallery.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {gallery.map((m) => (
                  <div
                    key={m._id}
                    className="relative group rounded-xl overflow-hidden aspect-square border border-border/40"
                  >
                    <img
                      src={m.url}
                      alt={m.caption || "Gallery"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="destructive"
                        className="rounded-full h-8 w-8 shadow-lg"
                        onClick={() => handleRemoveMedia(m._id)}
                      >
                        <IconTrash size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
                  <IconPhoto size={22} className="text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground">No gallery photos yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add photos to show customers your space and work before they book.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 gap-1.5 rounded-full"
                  onClick={() => handleMediaUpload("gallery")}
                >
                  <IconUpload size={14} /> Upload your first photo
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Contact & Social ────────────────────────────────── */}
        <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
          <div className="mb-8">
            <h2 className="text-2xl font-medium font-display tracking-tight mb-1">Contact & <span className="serif-accent-inline text-2xl">Social</span></h2>
            <p className="text-sm text-muted-foreground">
              How customers can reach you outside the platform.
            </p>
          </div>
          <div className="space-y-10">
            <div className="grid gap-1.5 max-w-xl">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <IconPhone size={14} className="text-muted-foreground" /> Phone Number
              </Label>
              <DebouncedInput
                id="phone"
                value={branding.phone}
                className="bg-white"
                placeholder="+38972xxxxxxx"
                onChange={(val) => setBranding({ ...branding, phone: val })}
              />
            </div>
            <div className="grid gap-1.5 max-w-xl">
              <Label htmlFor="instagram-handle" className="flex items-center gap-1.5">
                <IconBrandInstagram size={14} className="text-muted-foreground" /> Instagram
                Handle
              </Label>
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 h-9 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground">
                  @
                </span>
                <DebouncedInput
                  id="instagram-handle"
                  value={branding.instagramHandle}
                  className="bg-white rounded-l-none"
                  placeholder="yourbusiness"
                  onChange={(val) => setBranding({ ...branding, instagramHandle: val })}
                />
              </div>
            </div>
            <div className="grid gap-1.5 max-w-xl">
              <Label htmlFor="instagram-page-id" className="flex items-center gap-1.5">
                <IconBrandInstagram size={14} className="text-muted-foreground" /> Instagram Page
                ID
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  (needed for AI auto-replies)
                </span>
              </Label>
              <DebouncedInput
                id="instagram-page-id"
                value={branding.instagramPageId}
                className="bg-white"
                placeholder="123456789012345"
                onChange={(val) => setBranding({ ...branding, instagramPageId: val })}
              />
              <p className="text-xs text-muted-foreground">
                Your numeric Meta Page ID — find it in Facebook/Instagram Business settings. Required for the AI to reply to customer DMs.
              </p>
            </div>
            <div className="grid gap-1.5 max-w-xl">
              <Label htmlFor="website-url" className="flex items-center gap-1.5">
                <IconWorld size={14} className="text-muted-foreground" /> Website URL
              </Label>
              <DebouncedInput
                id="website-url"
                value={branding.websiteUrl}
                className="bg-white"
                placeholder="https://yourbusiness.com"
                onChange={(val) => setBranding({ ...branding, websiteUrl: val })}
              />
            </div>
          </div>
        </div>

        {/* ── Brand Colors ────────────────────────────────────── */}
        <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
          <div className="mb-8">
            <h2 className="text-2xl font-medium font-display tracking-tight mb-1">Brand <span className="serif-accent-inline text-2xl">Colors</span></h2>
            <p className="text-sm text-muted-foreground">
              Applied to your booking page and opus.mk listing.
            </p>
          </div>
          <div className="space-y-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-2xl">
              {(
                [
                  { key: "primary" as const, label: "Primary" },
                  { key: "secondary" as const, label: "Secondary" },
                  { key: "accent" as const, label: "Accent" },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="grid gap-2">
                  <Label htmlFor={`color-${key}`} className="text-sm">
                    {label}
                  </Label>
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <input
                        id={`color-${key}`}
                        type="color"
                        value={branding[key]}
                        onChange={(e) =>
                          setBranding({ ...branding, [key]: e.target.value })
                        }
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div
                        className="h-9 w-9 rounded-lg border-2 border-border/60 shadow-sm cursor-pointer shrink-0"
                        style={{ backgroundColor: branding[key] }}
                      />
                    </div>
                    <DebouncedInput
                      value={branding[key]}
                      className="bg-white font-mono text-xs uppercase"
                      onChange={(val) => setBranding({ ...branding, [key]: val })}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Live preview strip */}
            <div className="mt-6 flex gap-0 rounded-xl overflow-hidden h-3 max-w-2xl">
              <div className="flex-1" style={{ backgroundColor: branding.primary }} />
              <div className="flex-1" style={{ backgroundColor: branding.secondary }} />
              <div className="flex-1" style={{ backgroundColor: branding.accent }} />
            </div>
          </div>
        </div>

        {/* ── Save All Branding ───────────────────────────────── */}
        <div className="flex">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 rounded-full h-10 px-5 active:scale-[0.98] transition-transform"
          >
            <IconDeviceFloppy size={18} /> Save Branding
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
