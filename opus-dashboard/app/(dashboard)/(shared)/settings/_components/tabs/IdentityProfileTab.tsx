"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  IconMapPin,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { validateImageFile } from "../validation";
import {
  IconStarFilled,
  IconSparkles,
  IconChevronRight,
  IconClock,
  IconChevronLeft
} from "@tabler/icons-react";

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
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-6">
          {/* ── Cover Photo ─────────────────────────────────────── */}
          <div className="max-w-3xl border-b pb-12 mb-12 last:border-b-0">
            <div className="mb-8">
              <h2 className="text-2xl font-medium font-display tracking-tight mb-1">Cover <span className="serif-accent-inline text-2xl">Photo</span></h2>
              <p className="text-sm text-muted-foreground">
                The hero banner on your opus.mk listing.
              </p>
            </div>
            <div className="grid gap-6 p-6 border border-border/60 rounded-xl bg-background shadow-s dark:shadow-l">
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
            <div className="grid gap-8 p-6 border border-border/60 rounded-xl bg-background shadow-s dark:shadow-l">
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
            <div className="grid gap-6 p-6 border border-border/60 rounded-xl bg-background shadow-s dark:shadow-l">
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
            <div className="grid gap-6 p-6 border border-border/60 rounded-xl bg-background shadow-s dark:shadow-l">
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

          {/* ── Save All Branding ───────────────────────────────── */}
          <div className="flex pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 rounded-full h-10 px-5 active:scale-[0.98] transition-transform"
            >
              <IconDeviceFloppy size={18} /> Save Branding
            </Button>
          </div>
        </div>

        {/* ── Live Preview Column ─────────────────────────────── */}
        <div className="sticky top-6 hidden xl:block space-y-4">
          <div className="p-1 rounded-2xl bg-secondary/50 border border-border/40">
            <ListingPreview branding={branding} media={media} />
          </div>
          <p className="text-[11px] text-center text-muted-foreground px-4">
            This is a live preview of how your business appears on the <strong>opus.mk</strong> marketplace.
          </p>
        </div>
      </div>
    </TabsContent>
  );
}

// ─────────────────────────────────────────────────────
// Listing Preview Sub-components
// ─────────────────────────────────────────────────────

function ListingPreview({ branding, media }: { branding: any; media: any[] }) {
  const cover = media.find(m => m.type === 'cover')?.url;
  const gallery = media.filter(m => m.type === 'gallery');

  const mockData = {
    ...branding,
    coverImageUrl: cover,
    averageRating: 4.9,
    reviewCount: 124,
    city: "Skopje",
    neighborhood: "Centar",
    isFeatured: true,
    priceRange: 'mid',
  };

  return (
    <div className="space-y-6 p-4">
      <Tabs defaultValue="normal" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9 rounded-xl bg-background border border-border/40 p-1">
          <TabsTrigger value="normal" className="text-[10px] uppercase font-bold tracking-wider rounded-lg">Normal</TabsTrigger>
          <TabsTrigger value="featured" className="text-[10px] uppercase font-bold tracking-wider rounded-lg">Featured</TabsTrigger>
          <TabsTrigger value="profile" className="text-[10px] uppercase font-bold tracking-wider rounded-lg">Profile</TabsTrigger>
        </TabsList>

        <div className="mt-6 flex justify-center">
          <TabsContent value="normal" className="m-0">
            <div className="w-[280px]">
              <PreviewGridCard org={mockData} />
            </div>
          </TabsContent>
          <TabsContent value="featured" className="m-0">
            <div className="w-[220px]">
              <PreviewCoverCard org={mockData} />
            </div>
          </TabsContent>
          <TabsContent value="profile" className="m-0 w-full">
            <div className="w-full max-h-[600px] overflow-y-auto overflow-x-hidden rounded-2xl border border-border/40 bg-background custom-scrollbar shadow-inner">
              <PreviewProfile org={mockData} gallery={gallery} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function PreviewGridCard({ org }: { org: any }) {
  return (
    <div className="flex flex-col bg-card rounded-2xl border border-border/40 overflow-hidden shadow-sm">
      <div className="w-full aspect-[3/2] relative bg-secondary">
        {org.coverImageUrl ? (
          <img src={org.coverImageUrl} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/80 to-secondary flex items-center justify-center p-8">
            {org.logoUrl ? (
              <img src={org.logoUrl} className="w-12 h-12 rounded-xl object-cover" alt="" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-xl font-bold text-muted-foreground shadow-sm">
                {org.name.charAt(0)}
              </div>
            )}
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-[#45B380] animate-pulse" />
          <span className="text-[9px] font-medium text-white tracking-wide uppercase">Open</span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold truncate">{org.name || "Business Name"}</h3>
          <IconSparkles size={12} className="text-[#FAC915] shrink-0" />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
          <span className="truncate">Beauty</span>
          <span className="opacity-30">•</span>
          <span className="truncate">{org.city}</span>
        </div>
        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-3">
            {org.reviewCount > 0 && (
              <span className="text-muted-foreground">({org.reviewCount} reviews)</span>
            )}
          </div>
          <div className="font-medium shrink-0 ml-2 text-foreground/80">
            {org.priceRange === 'budget' ? '€' : org.priceRange === 'premium' ? '€€€' : '€€'}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewCoverCard({ org }: { org: any }) {
  return (
    <div className="w-[220px] aspect-[4/5] relative rounded-2xl overflow-hidden shadow-md">
      {org.coverImageUrl ? (
        <img src={org.coverImageUrl} className="w-full h-full object-cover" alt="" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/80 to-secondary flex items-center justify-center p-8">
          <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-xl font-bold text-muted-foreground shadow-sm">
            {org.name?.charAt(0)}
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
        <IconStarFilled size={10} className="text-[#FAC915]" />
        <span className="text-[10px] font-medium text-white">4.9</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <h3 className="font-bold text-base leading-tight mb-0.5 truncate">{org.name || "Business Name"}</h3>
        <p className="text-[10px] text-white/70 line-clamp-1 mb-2">Beauty</p>
        <div className="flex items-center gap-1 text-[10px] text-white/60">
          <IconMapPin size={10} />
          <span className="truncate">{org.city}</span>
        </div>
      </div>
    </div>
  );
}

function PreviewProfile({ org, gallery }: { org: any; gallery: any[] }) {
  return (
    <div className="bg-background text-foreground pb-8">
      <div className="h-32 relative bg-secondary overflow-hidden">
        {org.coverImageUrl && <img src={org.coverImageUrl} className="w-full h-full object-cover" alt="" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>
      <div className="px-4 -mt-8 relative">
        <div className="w-16 h-16 rounded-2xl bg-secondary border-2 border-background shadow-sm flex items-center justify-center overflow-hidden">
          {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-xl font-bold">{org.name?.charAt(0)}</span>}
        </div>
        <div className="mt-3">
          <h1 className="text-lg font-bold tracking-tight">{org.name || "Business Name"}</h1>
          {org.tagline && <p className="text-xs text-muted-foreground mt-0.5 font-medium">{org.tagline}</p>}
        </div>

        <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
          {['Call', 'Instagram', 'Website'].map(l => (
            <div key={l} className="px-3 py-1 rounded-full bg-secondary text-[11px] font-bold shrink-0">{l}</div>
          ))}
        </div>

        <div className="mt-6">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">About</h2>
          <p className="text-xs leading-relaxed opacity-80 line-clamp-3">{org.bio || "No bio added yet..."}</p>
        </div>

        {gallery.length > 0 && (
          <div className="mt-6">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Gallery</h2>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {gallery.map((m, i) => (
                <div key={i} className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-secondary">
                  <img src={m.url} className="w-full h-full object-cover" alt="" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-sm font-bold tracking-tight mb-4">Services</h2>
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="p-3 rounded-xl bg-card border border-border/40 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Service Name {i}</p>
                  <p className="text-[10px] text-muted-foreground">30 min</p>
                </div>
                <p className="text-xs font-black">20 €</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
