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
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { getErrorMessage } from "@/lib/file-validation";
import {
  IMAGE_PRESETS,
  uploadCompressedImage,
} from "@/lib/image-compression";
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
      setError(getErrorMessage(uploadError, "Could not upload image"));
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Enter a service name.");
      return;
    }

    const duration = Number.parseInt(durationMins, 10);
    if (!duration || duration <= 0) {
      setError("Enter a valid duration.");
      return;
    }

    if (staffIds.length === 0) {
      setShowStaffOptions(true);
      setError("Choose at least one staff member.");
      return;
    }

    const priceMinorUnits = Math.round(Number.parseFloat(price) * 100);
    if (Number.isNaN(priceMinorUnits) || priceMinorUnits < 0) {
      setError("Enter a valid price.");
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
      setError(getErrorMessage(saveError, "Could not save service"));
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
            <DialogTitle className="sr-only">Loading service</DialogTitle>
            <DialogDescription className="sr-only">
              Loading service details.
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
            <DialogTitle>Service unavailable</DialogTitle>
            <DialogDescription>
              This service could not be loaded. Close this window and try again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const allStaffSelected = staffIds.length === staffMembers.length;
  const staffSummary =
    staffMembers.length === 0
      ? "Add a staff member before creating this service."
      : allStaffSelected
        ? staffMembers.length === 1
          ? staffMembers[0].displayName
          : `All ${staffMembers.length} staff members`
        : staffIds.length === 0
          ? "No staff selected"
          : `${staffIds.length} of ${staffMembers.length} staff members`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit service" : "Add service"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update what customers can book."
              : "Set the name, time, price, and who can provide it."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="service-form"
          onSubmit={handleSubmit}
          className="-mr-2 overflow-y-auto pr-2"
        >
          <FieldGroup className="gap-5 py-1">
            <Field>
              <FieldLabel htmlFor="service-name">Service name</FieldLabel>
              <Input
                id="service-name"
                required
                autoFocus={!isEdit}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Gel manicure"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="service-duration">
                  Duration (min)
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
                  Price ({orgSettings.currency || "USD"})
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
                <FieldLabel htmlFor="service-category">Category</FieldLabel>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="service-category" className="w-full">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectGroup>
                      <SelectItem value="uncategorized">No category</SelectItem>
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
                <FieldTitle>Staff</FieldTitle>
                <FieldDescription>{staffSummary}</FieldDescription>
              </FieldContent>
              {staffMembers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStaffOptions((current) => !current)}
                >
                  {showStaffOptions ? "Done" : "Change"}
                </Button>
              )}
            </Field>

            {staffMembers.length === 0 ? (
              <Alert>
                <AlertCircleIcon />
                <AlertTitle>No staff members</AlertTitle>
                <AlertDescription>
                  Add a staff member before creating a bookable service.
                </AlertDescription>
              </Alert>
            ) : (
              showStaffOptions && (
                <FieldSet>
                  <FieldLegend variant="label" className="sr-only">
                    Staff members
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
                    <FieldError>Choose at least one staff member.</FieldError>
                  )}
                </FieldSet>
              )
            )}

            {isEdit && (
              <Field orientation="horizontal" variant="surface">
                <FieldContent>
                  <FieldLabel htmlFor="service-active">
                    Available for booking
                  </FieldLabel>
                  <FieldDescription>
                    Customers can choose this service.
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
                <span className="mr-auto">Photo and description</span>
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
                      Description
                    </FieldLabel>
                    <Textarea
                      id="service-description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="A short note customers will see"
                      className="min-h-20 resize-none"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Photo</FieldLabel>
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <Avatar className="h-20 w-28 rounded-lg border">
                          <AvatarImage
                            src={photoPreviewUrl}
                            alt={name || "Service preview"}
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
                            aria-label="Remove service photo"
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
                          {photoUrl ? "Change photo" : "Upload photo"}
                        </Button>
                        <FieldDescription>
                          JPEG, PNG, or WebP. Automatically compressed.
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
                <AlertTitle>Check the service details</AlertTitle>
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
            Cancel
          </Button>
          <Button
            type="submit"
            form="service-form"
            className="transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none"
            disabled={isSaving || isUploading || staffMembers.length === 0}
          >
            {isSaving && <Spinner data-icon="inline-start" />}
            {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
