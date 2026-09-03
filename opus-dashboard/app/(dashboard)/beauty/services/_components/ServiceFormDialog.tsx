"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ImageIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  FieldLegend,
  FieldSet,
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
import { IMAGE_PRESETS, uploadCompressedImage } from "@/lib/image-compression";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";

export function ServiceFormDialog({
  orgId,
  serviceId,
  initialCategoryId,
  open,
  onOpenChange,
}: {
  orgId: Id<"orgs">;
  serviceId?: Id<"services">;
  initialCategoryId?: Id<"service_categories">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useDashboardI18n();
  const isEdit = Boolean(serviceId);

  const existingService = useQuery(
    api.services.getService,
    serviceId ? { orgId, serviceId } : "skip",
  );
  const orgSettings = useQuery(api.services.getOrgSettings, { orgId });
  const categories = useQuery(api.serviceCategories.listCategories, { orgId });
  const staffMembers = useQuery(api.staff.listStaffMembers, { orgId });
  const allServices = useQuery(api.services.listServices, { orgId });

  const createService = useMutation(api.services.createService);
  const updateService = useMutation(api.services.updateService);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<string>("uncategorized");
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const photoPreviewUrl = useStorageImageUrl(orgId, photoUrl);
  const [isActive, setIsActive] = useState(true);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [showStaffOptions, setShowStaffOptions] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedForOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedForOpenRef.current = false;
      return;
    }

    if (
      initializedForOpenRef.current ||
      orgSettings === undefined ||
      categories === undefined ||
      staffMembers === undefined ||
      (isEdit && existingService === undefined)
    ) {
      return;
    }

    if (isEdit && existingService) {
      setName(existingService.name);
      setDescription(existingService.description || "");
      setDurationMins(existingService.durationMins.toString());
      setPrice((existingService.priceMinorUnits / 100).toFixed(2));
      setCategoryId(existingService.categoryId || "uncategorized");
      setStaffIds(existingService.staffIds);
      setPhotoUrl(existingService.photoUrl || "");
      setIsActive(existingService.isActive ?? true);
      setShowOptionalDetails(false);
      setShowStaffOptions(existingService.staffIds.length === 0);
    } else if (!isEdit) {
      setName("");
      setDescription("");
      setDurationMins(orgSettings?.slotDurationMins?.toString() || "15");
      setPrice("");
      setCategoryId(initialCategoryId || "uncategorized");
      setStaffIds(staffMembers.map((staffMember) => staffMember._id));
      setPhotoUrl("");
      setIsActive(true);
      setShowOptionalDetails(false);
      setShowStaffOptions(false);
    }

    setError("");
    initializedForOpenRef.current = true;
  }, [
    categories,
    existingService,
    initialCategoryId,
    isEdit,
    open,
    orgSettings,
    staffMembers,
  ]);

  const toggleStaffId = (id: string, checked: boolean) => {
    setStaffIds((currentStaffIds) =>
      checked
        ? [...currentStaffIds, id]
        : currentStaffIds.filter((staffId) => staffId !== id),
    );
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    try {
      const storageId = await uploadCompressedImage({
        file,
        getUploadUrl: () => generateUploadUrl({ orgId }),
        options: IMAGE_PRESETS.service,
      });
      setPhotoUrl(storageId);
    } catch (uploadError: unknown) {
      setError(
        getErrorMessage(
          uploadError,
          t("Could not upload image", "Не може да се прикачи сликата"),
        ),
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(t("Enter a service name.", "Внесете име на услугата."));
      return;
    }

    const duration = Number.parseInt(durationMins, 10);
    if (!duration || duration <= 0) {
      setError(t("Enter a valid duration.", "Внесете валидно времетраење."));
      return;
    }

    if (staffIds.length === 0) {
      setShowStaffOptions(true);
      setError(
        t("Choose at least one staff member.", "Изберете барем еден вработен."),
      );
      return;
    }

    const priceMinorUnits = Math.round(Number.parseFloat(price) * 100);
    if (Number.isNaN(priceMinorUnits) || priceMinorUnits < 0) {
      setError(t("Enter a valid price.", "Внесете валидна цена."));
      return;
    }

    setIsSaving(true);

    try {
      const selectedCategoryId =
        categoryId === "uncategorized"
          ? undefined
          : (categoryId as Id<"service_categories">);
      const isStorageId = photoUrl && !photoUrl.startsWith("http");

      if (isEdit && serviceId) {
        await updateService({
          orgId,
          serviceId,
          name: name.trim(),
          description: description.trim() || undefined,
          durationMins: duration,
          priceMinorUnits,
          currency: orgSettings?.currency || "USD",
          categoryId: selectedCategoryId || null,
          staffIds: staffIds as Id<"staff_members">[],
          storageId: isStorageId ? (photoUrl as Id<"_storage">) : undefined,
          photoUrl: !isStorageId ? photoUrl : undefined,
          isActive,
        });
        posthog.capture("service_updated", {
          duration_mins: duration,
          price_minor_units: priceMinorUnits,
          currency: orgSettings?.currency || "USD",
          staff_count: staffIds.length,
          has_category: Boolean(selectedCategoryId),
          is_active: isActive,
        });
      } else {
        const groupServices =
          allServices?.filter(
            (service) => service.categoryId === selectedCategoryId,
          ) || [];
        const maxOrder =
          groupServices.length > 0
            ? Math.max(...groupServices.map((service) => service.sortOrder))
            : 0;

        await createService({
          orgId,
          name: name.trim(),
          description: description.trim() || undefined,
          durationMins: duration,
          priceMinorUnits,
          currency: orgSettings?.currency || "USD",
          categoryId: selectedCategoryId,
          staffIds: staffIds as Id<"staff_members">[],
          storageId: isStorageId ? (photoUrl as Id<"_storage">) : undefined,
          photoUrl: !isStorageId ? photoUrl : undefined,
          sortOrder: maxOrder + 1,
        });
        posthog.capture("service_created", {
          duration_mins: duration,
          price_minor_units: priceMinorUnits,
          currency: orgSettings?.currency || "USD",
          staff_count: staffIds.length,
          has_category: Boolean(selectedCategoryId),
        });
      }

      onOpenChange(false);
    } catch (saveError: unknown) {
      setError(
        getErrorMessage(
          saveError,
          t("Could not save service", "Не може да се зачува услугата"),
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading =
    orgSettings === undefined ||
    categories === undefined ||
    staffMembers === undefined ||
    (isEdit && existingService === undefined);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {t("Loading service", "Вчитување услуга")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t(
                "Loading service details.",
                "Се вчитуваат деталите за услугата.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (orgSettings === null || (isEdit && existingService === null)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("Service unavailable", "Услугата не е достапна")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "This service could not be loaded. Close this window and try again.",
                "Оваа услуга не може да се вчита. Затворете го овој прозорец и обидете се повторно.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              {t("Close", "Затвори")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const allStaffSelected = staffIds.length === staffMembers.length;
  const staffSummary =
    staffMembers.length === 0
      ? t(
          "Add a staff member before creating this service.",
          "Додајте вработен пред да ја креирате оваа услуга.",
        )
      : allStaffSelected
        ? staffMembers.length === 1
          ? staffMembers[0].displayName
          : t(
              `All ${staffMembers.length} staff members`,
              `Сите ${staffMembers.length} вработени`,
            )
        : staffIds.length === 0
          ? t("No staff selected", "Нема избрано вработени")
          : t(
              `${staffIds.length} of ${staffMembers.length} staff members`,
              `${staffIds.length} од ${staffMembers.length} вработени`,
            );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("Edit service", "Уреди услуга")
              : t("Add service", "Додај услуга")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t(
                  "Update what customers can book.",
                  "Ажурирајте што можат клиентите да закажат.",
                )
              : t(
                  "Set the name, time, price, and who can provide it.",
                  "Поставете име, времетраење, цена и кој ја извршува услугата.",
                )}
          </DialogDescription>
        </DialogHeader>

        <form
          id="service-form"
          onSubmit={handleSubmit}
          className="-mr-2 overflow-y-auto pr-2"
        >
          <FieldGroup className="gap-5 py-1">
            <Field>
              <FieldLabel htmlFor="service-name">
                {t("Service name", "Име на услуга")}
              </FieldLabel>
              <Input
                id="service-name"
                required
                autoFocus={!isEdit}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("e.g. Gel manicure", "пр. Гел маникир")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="service-duration">
                  {t("Duration (min)", "Времетраење (мин)")}
                </FieldLabel>
                <Input
                  id="service-duration"
                  type="number"
                  inputMode="numeric"
                  required
                  min={orgSettings.slotDurationMins}
                  step={orgSettings.slotDurationMins}
                  value={durationMins}
                  onChange={(event) => setDurationMins(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="service-price">
                  {t("Price", "Цена")} ({orgSettings.currency || "USD"})
                </FieldLabel>
                <Input
                  id="service-price"
                  type="number"
                  inputMode="decimal"
                  required
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="0.00"
                />
              </Field>
            </div>

            {categories.length > 0 && (
              <Field>
                <FieldLabel htmlFor="service-category">
                  {t("Category", "Категорија")}
                </FieldLabel>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="service-category" className="w-full">
                    <SelectValue
                      placeholder={t(
                        "Choose a category",
                        "Изберете категорија",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectGroup>
                      <SelectItem value="uncategorized">
                        {t("No category", "Без категорија")}
                      </SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field
              orientation="horizontal"
              variant="surface"
              data-invalid={staffIds.length === 0}
            >
              <FieldContent>
                <FieldTitle>{t("Staff", "Вработени")}</FieldTitle>
                <FieldDescription>{staffSummary}</FieldDescription>
              </FieldContent>
              {staffMembers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStaffOptions((current) => !current)}
                >
                  {showStaffOptions
                    ? t("Done", "Готово")
                    : t("Change", "Промени")}
                </Button>
              )}
            </Field>

            {staffMembers.length === 0 ? (
              <Alert>
                <AlertCircleIcon />
                <AlertTitle>
                  {t("No staff members", "Нема вработени")}
                </AlertTitle>
                <AlertDescription>
                  {t(
                    "Add a staff member before creating a bookable service.",
                    "Додајте вработен пред да креирате услуга за закажување.",
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              showStaffOptions && (
                <FieldSet>
                  <FieldLegend variant="label" className="sr-only">
                    {t("Staff members", "Вработени")}
                  </FieldLegend>
                  <FieldGroup className="gap-2">
                    {staffMembers.map((staffMember) => (
                      <Field
                        key={staffMember._id}
                        orientation="horizontal"
                        variant="surface"
                      >
                        <Checkbox
                          id={`staff-${staffMember._id}`}
                          checked={staffIds.includes(staffMember._id)}
                          onCheckedChange={(checked) =>
                            toggleStaffId(staffMember._id, checked === true)
                          }
                        />
                        <FieldLabel
                          htmlFor={`staff-${staffMember._id}`}
                          className="font-normal"
                        >
                          {staffMember.displayName}
                        </FieldLabel>
                      </Field>
                    ))}
                  </FieldGroup>
                  {staffIds.length === 0 && (
                    <FieldError>
                      {t(
                        "Choose at least one staff member.",
                        "Изберете барем еден вработен.",
                      )}
                    </FieldError>
                  )}
                </FieldSet>
              )
            )}

            {isEdit && (
              <Field orientation="horizontal" variant="surface">
                <FieldContent>
                  <FieldLabel htmlFor="service-active">
                    {t("Available for booking", "Достапна за закажување")}
                  </FieldLabel>
                  <FieldDescription>
                    {t(
                      "Customers can choose this service.",
                      "Клиентите можат да ја изберат оваа услуга.",
                    )}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="service-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </Field>
            )}

            <div className="rounded-lg border">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between border-0"
                aria-expanded={showOptionalDetails}
                onClick={() =>
                  setShowOptionalDetails((currentValue) => !currentValue)
                }
              >
                <ImageIcon data-icon="inline-start" />
                <span className="mr-auto">
                  {t("Photo and description", "Слика и опис")}
                </span>
                <ChevronDownIcon
                  data-icon="inline-end"
                  className={cn(
                    "transition-transform duration-150",
                    showOptionalDetails && "rotate-180",
                  )}
                />
              </Button>

              {showOptionalDetails && (
                <FieldGroup className="gap-5 border-t p-4">
                  <Field>
                    <FieldLabel htmlFor="service-description">
                      {t("Description", "Опис")}
                    </FieldLabel>
                    <Textarea
                      id="service-description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder={t(
                        "A short note customers will see",
                        "Краток опис што ќе го видат клиентите",
                      )}
                      className="min-h-20 resize-none"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>{t("Photo", "Слика")}</FieldLabel>
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <Avatar className="h-20 w-28 rounded-lg border">
                          <AvatarImage
                            src={photoPreviewUrl}
                            alt={
                              name ||
                              t("Service preview", "Преглед на услугата")
                            }
                            className="object-cover"
                          />
                          <AvatarFallback className="rounded-lg">
                            <ImageIcon />
                          </AvatarFallback>
                        </Avatar>
                        {photoUrl && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-xs"
                            aria-label={t(
                              "Remove service photo",
                              "Отстрани слика на услугата",
                            )}
                            className="absolute -right-2 -top-2"
                            onClick={() => setPhotoUrl("")}
                          >
                            <XIcon />
                          </Button>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-col items-start gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
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
                            <UploadIcon data-icon="inline-start" />
                          )}
                          {photoUrl
                            ? t("Change photo", "Промени слика")
                            : t("Upload photo", "Прикачи слика")}
                        </Button>
                        <FieldDescription>
                          {t(
                            "JPEG, PNG, or WebP. Automatically compressed.",
                            "JPEG, PNG или WebP. Автоматски се компресира.",
                          )}
                        </FieldDescription>
                      </div>
                    </div>
                  </Field>
                </FieldGroup>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>
                  {t(
                    "Check the service details",
                    "Проверете ги деталите за услугата",
                  )}
                </AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </form>

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
            form="service-form"
            className="transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none"
            disabled={isSaving || isUploading || staffMembers.length === 0}
          >
            {isSaving && <Spinner data-icon="inline-start" />}
            {isSaving
              ? t("Saving…", "Се зачувува…")
              : isEdit
                ? t("Save changes", "Зачувај промени")
                : t("Add service", "Додај услуга")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
