"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ImagePlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { getErrorMessage } from "@/lib/file-validation";
import { getStaffErrorMessage } from "@/lib/staff-errors";
import { IMAGE_PRESETS, uploadCompressedImage } from "@/lib/image-compression";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";

type StaffRole = "owner" | "manager" | "staff";

function isStaffRole(value: string): value is StaffRole {
  return value === "owner" || value === "manager" || value === "staff";
}

export function StaffDetailsForm({
  orgId,
  staffId,
  onSaved,
  onCancel,
}: {
  orgId: Id<"orgs">;
  staffId?: Id<"staff_members">;
  onSaved?: (staffId: Id<"staff_members">) => void;
  onCancel?: () => void;
}) {
  const { language, t } = useDashboardI18n();
  const isEdit = staffId !== undefined;
  const existingStaff = useQuery(
    api.staff.getStaffMember,
    staffId ? { orgId, staffId } : "skip",
  );
  const planStatus = useQuery(
    api.staff.getStaffPlanStatus,
    staffId ? { staffId } : {},
  );
  const createStaffMember = useMutation(api.staff.createStaffMember);
  const updateStaffMember = useMutation(api.staff.updateStaffMember);
  const profile = useQuery(api.users.getMyProfile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [displayName, setDisplayName] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const initialized = useRef<string | null>(null);
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
  const planLimitReached = Boolean(
    planStatus &&
    (!isEdit || isActive) &&
    !(role === "owner"
      ? planStatus.canUseOwnerRole
      : planStatus.canUseStaffRole),
  );
  const planLimitMessage = planStatus?.isFree
    ? t(
        "The Free plan allows 1 active owner and up to 3 active staff members (4 people total). Deactivate a team member or upgrade to OPUS Pro to add more.",
        "Бесплатниот план дозволува 1 активен сопственик и до 3 активни вработени (вкупно 4 лица). Деактивирајте член на тимот или преминете на OPUS Pro за да додадете повеќе.",
        "Plani falas lejon 1 pronar aktiv dhe deri në 3 anëtarë stafi aktivë (gjithsej 4 persona). Çaktivizoni një anëtar të ekipit ose përmirësoni në OPUS Pro për të shtuar më shumë.",
      )
    : t(
        "The Pro plan allows up to 12 active team members. Deactivate a team member to add more.",
        "Pro дозволува најмногу 12 активни членови на тимот. Деактивирајте член на тимот за да додадете повеќе.",
        "Plani Pro lejon deri në 12 anëtarë aktivë të ekipit. Çaktivizoni një anëtar të ekipit për të shtuar më shumë.",
      );

  useEffect(() => {
    if (initialized.current === (staffId ?? "new")) return;
    if (isEdit && !existingStaff) return;
    initialized.current = staffId ?? "new";
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
      setSignInEmail("");
      setRole("staff");
      setBio("");
      setSpecialties("");
      setAvatarUrl("");
      setIsActive(true);
    }
  }, [existingStaff, isEdit, staffId]);

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
          t(
            "Failed to upload image",
            "Неуспешно прикачување слика",
            "Dështoi ngarkimi i imazhit",
          ),
        ),
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!planStatus) return;
    if (planLimitReached) {
      setError(planLimitMessage);
      return;
    }
    const name = displayName.trim();
    if (!name) {
      setError(
        t(
          "Enter a display name.",
          "Внесете име за приказ.",
          "Vendosni një emër për shfaqje.",
        ),
      );
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
          ...(profile?.role === "staff" ? {} : { role }),
          bio: bio.trim(),
          specialties: specialtyList,
          avatarUrl,
          isActive,
        });
        posthog.capture("staff_member_updated", {
          role,
          specialty_count: specialtyList.length,
          is_active: isActive,
        });
        toast.success(
          t(
            "Staff details saved.",
            "Деталите за вработениот се зачувани.",
            "Detajet e anëtarit të stafit u ruajtën.",
          ),
        );
        onSaved?.(staffId);
      } else {
        const newStaffId = await createStaffMember({
          orgId,
          displayName: name,
          role,
          bio: bio.trim() || undefined,
          specialties: specialtyList,
          avatarUrl: avatarUrl || undefined,
          signInEmail: signInEmail.trim() || undefined,
        });
        posthog.capture("staff_member_created", {
          role,
          specialty_count: specialtyList.length,
        });
        toast.success(
          t(
            signInEmail.trim()
              ? "Staff member added and invitation queued."
              : "Staff member added. Set their working hours next.",
            signInEmail.trim()
              ? "Вработениот е додаден и поканата е ставена во ред за испраќање."
              : "Вработениот е додаден. Следно, поставете го работното време.",
            signInEmail.trim()
              ? "Anëtari i stafit u shtua dhe ftesa u vendos në radhë."
              : "Anëtari i stafit u shtua. Vendosni orarin e punës më pas.",
          ),
        );
        onSaved?.(newStaffId);
      }
    } catch (saveError: unknown) {
      setError(
        getStaffErrorMessage(
          saveError,
          t(
            "Failed to save staff member",
            "Неуспешно зачувување на вработениот",
            "Dështoi ruajtja e anëtarit të stafit",
          ),
          language,
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isEdit && !existingStaff) return null;
  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex min-w-0 flex-col gap-5",
        onCancel && "min-h-0 overflow-hidden",
      )}
    >
      <FieldGroup
        className={cn(
          "gap-5",
          onCancel && "-mx-1 min-h-0 overflow-y-auto px-1",
        )}
      >
        <Field>
          <FieldLabel data-replay-public>
            {t("Profile photo", "Профилна слика", "Foto e profilit")}
          </FieldLabel>
          <div className="flex items-center gap-4">
            <Avatar className="size-14 border bg-muted">
              <AvatarImage
                src={avatarPreviewUrl}
                alt={
                  displayName ||
                  t("Staff profile", "Профил на вработен", "Profili i stafit")
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
                "Zgjidhni foton e profilit",
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
                ? t("Uploading…", "Се прикачува…", "Po ngarkohet…")
                : t("Choose photo", "Избери слика", "Zgjidh foto")}
            </Button>
          </div>
        </Field>

        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel data-replay-public htmlFor="staff-name">
              {t("Display name", "Име за приказ", "Emri i shfaqur")}
            </FieldLabel>
            <Input
              id="staff-name"
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t(
                "e.g. Ana Petrova",
                "пр. Ана Петрова",
                "p.sh. Ana Petrova",
              )}
            />
          </Field>

          <Field>
            <FieldLabel data-replay-public htmlFor="staff-role">
              {t("Role", "Улога", "Roli")}
            </FieldLabel>
            <Select
              value={role}
              disabled={profile?.role === "staff"}
              onValueChange={(value) => {
                if (isStaffRole(value)) setRole(value);
              }}
            >
              <SelectTrigger id="staff-role" className="w-full">
                <SelectValue
                  placeholder={t(
                    "Choose a role",
                    "Изберете улога",
                    "Zgjidhni një rol",
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    data-replay-public
                    value="staff"
                    disabled={
                      (!isEdit || isActive) && !planStatus?.canUseStaffRole
                    }
                  >
                    {t("Staff member", "Вработен", "Anëtar stafi")}
                  </SelectItem>
                  <SelectItem
                    data-replay-public
                    value="manager"
                    disabled={
                      (!isEdit || isActive) && !planStatus?.canUseStaffRole
                    }
                  >
                    {t("Manager", "Менаџер", "Menaxher")}
                  </SelectItem>
                  <SelectItem
                    data-replay-public
                    value="owner"
                    disabled={
                      (!isEdit || isActive) &&
                      (!planStatus?.canUseOwnerRole ||
                        profile?.role !== "owner")
                    }
                  >
                    {t("Owner", "Сопственик", "Pronar")}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {planStatus && (
              <FieldDescription data-replay-public>
                {planStatus.isFree
                  ? t(
                      "Free: 1 owner and 3 staff. Managers use a staff slot.",
                      "Бесплатно: 1 сопственик и 3 вработени. Менаџерите зафаќаат место за вработен.",
                      "Falas: 1 pronar dhe 3 staf. Menaxherët përdorin një vend stafi.",
                    )
                  : t(
                      "Pro: up to 12 active team members, including owners and managers.",
                      "Pro: до 12 активни членови на тимот, вклучувајќи сопственици и менаџери.",
                      "Pro: deri në 12 anëtarë aktivë të ekipit, përfshirë pronarët dhe menaxherët.",
                    )}
              </FieldDescription>
            )}
          </Field>
        </FieldGroup>

        {!isEdit && (
          <Field data-disabled={planStatus?.isFree}>
            <FieldLabel htmlFor="staff-sign-in-email">
              {t("Sign-in email", "Е-пошта за најава", "Emaili i hyrjes")}{" "}
              <span className="text-muted-foreground">
                ({t("optional", "опционално", "opsionale")})
              </span>
            </FieldLabel>
            <Input
              id="staff-sign-in-email"
              type="email"
              autoComplete="email"
              value={signInEmail}
              onChange={(event) => setSignInEmail(event.target.value)}
              placeholder="ana@studio.mk"
              disabled={!planStatus || planStatus.isFree}
            />
            <FieldDescription>
              {planStatus?.isFree
                ? t(
                    "Pro includes personal staff accounts. You can add this person without a login.",
                    "Pro вклучува лични сметки за вработените. Може да го додадете ова лице без најава.",
                    "Pro përfshin llogari personale për stafin. Mund ta shtoni këtë person pa hyrje.",
                  )
                : t(
                    "An invitation is sent when you add this person. Leave blank to add them without dashboard access.",
                    "При додавање ќе се испрати покана. Оставете празно за да го додадете без пристап до контролната табла.",
                    "Ftesa dërgohet kur e shtoni këtë person. Lëreni bosh për ta shtuar pa qasje në panel.",
                  )}
            </FieldDescription>
          </Field>
        )}

        <Field>
          <FieldLabel data-replay-public htmlFor="staff-specialties">
            {t("Specialties", "Специјалности", "Specializimet")}{" "}
            <span data-replay-public className="text-muted-foreground">
              ({t("optional", "опционално", "opsionale")})
            </span>
          </FieldLabel>
          <Input
            id="staff-specialties"
            value={specialties}
            onChange={(event) => setSpecialties(event.target.value)}
            placeholder={t(
              "Nails, brows, makeup",
              "Нокти, веѓи, шминка",
              "Thonj, vetulla, grim",
            )}
          />
          <FieldDescription data-replay-public>
            {t(
              "Separate multiple specialties with commas.",
              "Одделете повеќе специјалности со запирки.",
              "Ndani specializimet e shumta me presje.",
            )}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel data-replay-public htmlFor="staff-bio">
            {t("Short bio", "Кратка биографија", "Biografia e shkurtër")}{" "}
            <span data-replay-public className="text-muted-foreground">
              ({t("optional", "опционално", "opsionale")})
            </span>
          </FieldLabel>
          <Textarea
            id="staff-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder={t(
              "A short introduction for the booking page.",
              "Краток вовед за страницата за закажување.",
              "Një prezantim i shkurtër për faqen e rezervimit.",
            )}
            className="min-h-20"
          />
        </Field>

        {isEdit && (
          <Field orientation="horizontal" variant="surface">
            <FieldContent>
              <FieldTitle>
                {t(
                  "Available for bookings",
                  "Достапен за закажувања",
                  "I disponueshëm për rezervime",
                )}
              </FieldTitle>
              <FieldDescription data-replay-public>
                {t(
                  "Turn this off to hide this person from new bookings.",
                  "Исклучете го ова за да го сокриете ова лице од нови закажувања.",
                  "Çaktivizojeni këtë për ta fshehur këtë person nga rezervimet e reja.",
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
                "I disponueshëm për rezervime",
              )}
            />
          </Field>
        )}

        {(planLimitReached || error) && (
          <FieldError>{planLimitReached ? planLimitMessage : error}</FieldError>
        )}
      </FieldGroup>
      <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            {t("Cancel", "Откажи", "Anulo")}
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            isSaving ||
            isUploading ||
            !displayName.trim() ||
            !planStatus ||
            planLimitReached
          }
        >
          {isSaving && <Spinner data-icon="inline-start" />}
          {isEdit
            ? t("Save details", "Зачувај детали", "Ruaj detajet")
            : t("Add staff member", "Додај вработен", "Shto anëtar stafi")}
        </Button>
      </div>
    </form>
  );
}
