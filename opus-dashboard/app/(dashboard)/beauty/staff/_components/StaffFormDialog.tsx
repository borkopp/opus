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
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { getErrorMessage } from "@/lib/file-validation";
import { IMAGE_PRESETS, uploadCompressedImage } from "@/lib/image-compression";
import posthog from "posthog-js";

type StaffRole = "owner" | "manager" | "staff";

function isStaffRole(value: string): value is StaffRole {
  return value === "owner" || value === "manager" || value === "staff";
}

export function StaffFormDialog({
  orgId,
  staffId,
  open,
  onOpenChange,
  canManageAppointmentEmail,
}: {
  orgId: Id<"orgs">;
  staffId?: Id<"staff_members">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManageAppointmentEmail: boolean;
}) {
  const { t } = useDashboardI18n();
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
  const [appointmentEmail, setAppointmentEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarPreviewUrl = useStorageImageUrl(orgId, avatarUrl);

  useEffect(() => {
    if (!open) return;

    setError("");
    if (isEdit && existingStaff) {
      setDisplayName(existingStaff.displayName);
      setAppointmentEmail(existingStaff.appointmentEmail || "");
      setRole(existingStaff.role);
      setBio(existingStaff.bio || "");
      setSpecialties((existingStaff.specialties || []).join(", "));
      setAvatarUrl(existingStaff.avatarUrl || "");
      setIsActive(existingStaff.isActive ?? true);
      return;
    }

    if (!isEdit) {
      setDisplayName("");
      setAppointmentEmail("");
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

    setIsUploading(true);
    setError("");
    try {
      const storageId = await uploadCompressedImage({
        file,
        getUploadUrl: () => generateUploadUrl({ orgId }),
        options: IMAGE_PRESETS.avatar,
      });
      setAvatarUrl(storageId);
    } catch (uploadError: unknown) {
      setError(
        getErrorMessage(
          uploadError,
          t("Failed to upload image", "Неуспешно прикачување слика"),
        ),
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError(t("Enter a display name.", "Внесете име за приказ."));
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
          ...(canManageAppointmentEmail
            ? { appointmentEmail: appointmentEmail.trim() || null }
            : {}),
        });
        posthog.capture("staff_member_updated", {
          role,
          specialty_count: specialtyList.length,
          has_appointment_email: Boolean(appointmentEmail.trim()),
          is_active: isActive,
        });
        toast.success(
          t("Staff details saved.", "Деталите за вработениот се зачувани."),
        );
        onOpenChange(false);
      } else {
        const newStaffId = await createStaffMember({
          orgId,
          displayName: name,
          role,
          bio: bio.trim() || undefined,
          specialties: specialtyList,
          avatarUrl: avatarUrl || undefined,
          ...(canManageAppointmentEmail && appointmentEmail.trim()
            ? { appointmentEmail: appointmentEmail.trim() }
            : {}),
        });
        posthog.capture("staff_member_created", {
          role,
          specialty_count: specialtyList.length,
          has_appointment_email: Boolean(appointmentEmail.trim()),
        });
        toast.success(
          t(
            "Staff member added. Set their working hours next.",
            "Вработениот е додаден. Следно, поставете го работното време.",
          ),
        );
        onOpenChange(false);
        router.push(`/beauty/staff/${newStaffId}`);
      }
    } catch (saveError: unknown) {
      setError(
        getErrorMessage(
          saveError,
          t(
            "Failed to save staff member",
            "Неуспешно зачувување на вработениот",
          ),
        ),
      );
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
            {isEdit
              ? t("Edit staff details", "Уреди детали за вработен")
              : t("Add a staff member", "Додај вработен")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t(
                  "Update the information customers and your team see.",
                  "Ажурирајте ги информациите што ги гледаат клиентите и вашиот тим.",
                )
              : t(
                  "Add the basic details first. You’ll set working hours next.",
                  "Прво додајте ги основните детали. Следно ќе поставите работно време.",
                )}
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
                  <FieldLabel>
                    {t("Profile photo", "Профилна слика")}
                  </FieldLabel>
                  <div className="flex items-center gap-4">
                    <Avatar className="size-14 border bg-muted">
                      <AvatarImage
                        src={avatarPreviewUrl}
                        alt={
                          displayName ||
                          t("Staff profile", "Профил на вработен")
                        }
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
                      aria-label={t(
                        "Choose profile photo",
                        "Изберете профилна слика",
                      )}
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
                      {isUploading
                        ? t("Uploading…", "Се прикачува…")
                        : t("Choose photo", "Избери слика")}
                    </Button>
                  </div>
                </Field>

                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="staff-name">
                      {t("Display name", "Име за приказ")}
                    </FieldLabel>
                    <Input
                      id="staff-name"
                      required
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder={t("e.g. Ana Petrova", "пр. Ана Петрова")}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="staff-role">
                      {t("Role", "Улога")}
                    </FieldLabel>
                    <Select
                      value={role}
                      onValueChange={(value) => {
                        if (isStaffRole(value)) setRole(value);
                      }}
                    >
                      <SelectTrigger id="staff-role" className="w-full">
                        <SelectValue
                          placeholder={t("Choose a role", "Изберете улога")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="staff">
                            {t("Staff member", "Вработен")}
                          </SelectItem>
                          <SelectItem value="manager">
                            {t("Manager", "Менаџер")}
                          </SelectItem>
                          <SelectItem value="owner">
                            {t("Owner", "Сопственик")}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                {canManageAppointmentEmail && (
                  <Field>
                    <FieldLabel htmlFor="staff-appointment-email">
                      {t("Appointment email", "Е-пошта за термини")}{" "}
                      <span className="text-muted-foreground">
                        ({t("optional", "опционално")})
                      </span>
                    </FieldLabel>
                    <Input
                      id="staff-appointment-email"
                      type="email"
                      autoComplete="email"
                      value={appointmentEmail}
                      onChange={(event) =>
                        setAppointmentEmail(event.target.value)
                      }
                      placeholder="ana@studio.mk"
                    />
                    <FieldDescription>
                      {t(
                        "Receives new appointment and reminder emails only for bookings assigned to this person. This does not grant dashboard access.",
                        "Прима пораки за нови термини и потсетници само за закажувања доделени на ова лице. Ова не дава пристап до контролната табла.",
                      )}
                    </FieldDescription>
                  </Field>
                )}

                <Field>
                  <FieldLabel htmlFor="staff-specialties">
                    {t("Specialties", "Специјалности")}{" "}
                    <span className="text-muted-foreground">
                      ({t("optional", "опционално")})
                    </span>
                  </FieldLabel>
                  <Input
                    id="staff-specialties"
                    value={specialties}
                    onChange={(event) => setSpecialties(event.target.value)}
                    placeholder={t(
                      "Nails, brows, makeup",
                      "Нокти, веѓи, шминка",
                    )}
                  />
                  <FieldDescription>
                    {t(
                      "Separate multiple specialties with commas.",
                      "Одделете повеќе специјалности со запирки.",
                    )}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="staff-bio">
                    {t("Short bio", "Кратка биографија")}{" "}
                    <span className="text-muted-foreground">
                      ({t("optional", "опционално")})
                    </span>
                  </FieldLabel>
                  <Textarea
                    id="staff-bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder={t(
                      "A short introduction for the booking page.",
                      "Краток вовед за страницата за закажување.",
                    )}
                    className="min-h-20"
                  />
                </Field>

                {isEdit && (
                  <Field orientation="horizontal" variant="surface">
                    <FieldContent>
                      <FieldTitle>
                        {t("Available for bookings", "Достапен за закажувања")}
                      </FieldTitle>
                      <FieldDescription>
                        {t(
                          "Turn this off to hide this person from new bookings.",
                          "Исклучете го ова за да го сокриете ова лице од нови закажувања.",
                        )}
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="staff-active"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                      aria-label={t(
                        "Available for bookings",
                        "Достапен за закажувања",
                      )}
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
            {t("Cancel", "Откажи")}
          </Button>
          <Button
            type="submit"
            form="staff-form"
            disabled={isLoadingStaff || isSaving || isUploading}
          >
            {isSaving && <Spinner data-icon="inline-start" />}
            {isEdit
              ? t("Save details", "Зачувај детали")
              : t("Add & set hours", "Додај и постави часови")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
