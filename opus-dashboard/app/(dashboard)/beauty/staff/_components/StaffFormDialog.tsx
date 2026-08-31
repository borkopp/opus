"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ImagePlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  getErrorMessage,
  readStorageId,
  validateImageFile,
} from "@/lib/file-validation";

type StaffRole = "owner" | "manager" | "staff";

function isStaffRole(value: string): value is StaffRole {
  return value === "owner" || value === "manager" || value === "staff";
}

export function StaffFormDialog({
  orgId,
  staffId,
  open,
  onOpenChange,
}: {
  orgId: Id<"orgs">;
  staffId?: Id<"staff_members">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const isEdit = staffId !== undefined;
  const existingStaff = useQuery(
    api.staff.getStaffMember,
    staffId ? { orgId, staffId } : "skip",
  );
  const createStaffMember = useMutation(api.staff.createStaffMember);
  const updateStaffMember = useMutation(api.staff.updateStaffMember);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    setError("");
    if (isEdit && existingStaff) {
      setDisplayName(existingStaff.displayName);
      setRole(existingStaff.role);
      setBio(existingStaff.bio || "");
      setSpecialties((existingStaff.specialties || []).join(", "));
      setAvatarUrl(existingStaff.avatarUrl || "");
      setIsActive(existingStaff.isActive ?? true);
      return;
    }

    if (!isEdit) {
      setDisplayName("");
      setRole("staff");
      setBio("");
      setSpecialties("");
      setAvatarUrl("");
      setIsActive(true);
    }
  }, [existingStaff, isEdit, open]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setError("");
    try {
      const postUrl = await generateUploadUrl({ orgId });
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Upload failed");

      setAvatarUrl(readStorageId(await result.json()));
    } catch (uploadError: unknown) {
      setError(getErrorMessage(uploadError, "Failed to upload image"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError("Enter a display name.");
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      const specialtyList = specialties
        .split(",")
        .map((specialty) => specialty.trim())
        .filter(Boolean);

      if (isEdit && staffId) {
        await updateStaffMember({
          orgId,
          staffId,
          displayName: name,
          role,
          bio: bio.trim(),
          specialties: specialtyList,
          avatarUrl,
          isActive,
        });
        toast.success("Staff details saved.");
        onOpenChange(false);
      } else {
        const newStaffId = await createStaffMember({
          orgId,
          displayName: name,
          role,
          bio: bio.trim() || undefined,
          specialties: specialtyList,
          avatarUrl: avatarUrl || undefined,
        });
        toast.success("Staff member added. Set their working hours next.");
        onOpenChange(false);
        router.push(`/beauty/staff/${newStaffId}`);
      }
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError, "Failed to save staff member"));
    } finally {
      setIsSaving(false);
    }
  };

  const isLoadingStaff = isEdit && existingStaff === undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit staff details" : "Add a staff member"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the information customers and your team see."
              : "Add the basic details first. You’ll set working hours next."}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 min-h-0 overflow-y-auto px-1">
          {isLoadingStaff ? (
            <div className="flex flex-col gap-5 py-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <form id="staff-form" onSubmit={handleSubmit}>
              <FieldGroup className="gap-5 py-2">
                <Field>
                  <FieldLabel>Profile photo</FieldLabel>
                  <div className="flex items-center gap-4">
                    <Avatar className="size-14 border bg-muted">
                      <AvatarImage
                        src={getImageUrl(avatarUrl)}
                        alt={displayName || "Staff profile"}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-muted-foreground">
                        <ImagePlusIcon className="size-5" />
                      </AvatarFallback>
                    </Avatar>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      aria-label="Choose profile photo"
                      onChange={handleUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <ImagePlusIcon data-icon="inline-start" />
                      )}
                      {isUploading ? "Uploading…" : "Choose photo"}
                    </Button>
                  </div>
                </Field>

                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="staff-name">Display name</FieldLabel>
                    <Input
                      id="staff-name"
                      required
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="e.g. Ana Petrova"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="staff-role">Role</FieldLabel>
                    <Select
                      value={role}
                      onValueChange={(value) => {
                        if (isStaffRole(value)) setRole(value);
                      }}
                    >
                      <SelectTrigger id="staff-role" className="w-full">
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="staff">Staff member</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                <Field>
                  <FieldLabel htmlFor="staff-specialties">
                    Specialties{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <Input
                    id="staff-specialties"
                    value={specialties}
                    onChange={(event) => setSpecialties(event.target.value)}
                    placeholder="Nails, brows, makeup"
                  />
                  <FieldDescription>
                    Separate multiple specialties with commas.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="staff-bio">
                    Short bio{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <Textarea
                    id="staff-bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="A short introduction for the booking page."
                    className="min-h-20"
                  />
                </Field>

                {isEdit && (
                  <Field orientation="horizontal" variant="surface">
                    <FieldContent>
                      <FieldTitle>Available for bookings</FieldTitle>
                      <FieldDescription>
                        Turn this off to hide this person from new bookings.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="staff-active"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                      aria-label="Available for bookings"
                    />
                  </Field>
                )}

                {error && <FieldError>{error}</FieldError>}
              </FieldGroup>
            </form>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="staff-form"
            disabled={isLoadingStaff || isSaving || isUploading}
          >
            {isSaving && <Spinner data-icon="inline-start" />}
            {isEdit ? "Save details" : "Add & set hours"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getImageUrl(urlOrId: string) {
  if (!urlOrId) return undefined;
  if (urlOrId.startsWith("http")) return urlOrId;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(/\/$/, "");
  return convexUrl ? `${convexUrl}/api/storage/${urlOrId}` : undefined;
}
