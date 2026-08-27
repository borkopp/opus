"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Clock3,
  Eye,
  ImagePlus,
  Search,
  Sparkles,
  Store,
  Upload,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Logo } from "@/components/Logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  parseMapboxFeature,
  reverseGeocodeMapbox,
  type BusinessLocation,
} from "@/lib/mapbox";
import { useMapboxSearch } from "@/hooks/use-mapbox-search";
import { validateImageFile } from "@/lib/file-validation";
import { ActivationPreview } from "./ActivationPreview";

const LocationMapPicker = dynamic(
  () => import("@/components/dashboard/LocationMapPicker"),
  {
    ssr: false,
    loading: () => <div className="h-80 rounded-2xl border bg-muted" />,
  },
);

type ActivationState = FunctionReturnType<typeof api.activation.getState>;
type Step =
  | "business"
  | "location"
  | "service"
  | "hours"
  | "storefront"
  | "review";

const STEP_ORDER: Step[] = [
  "business",
  "location",
  "service",
  "hours",
  "storefront",
  "review",
];

const STEP_LABELS: Record<Step, string> = {
  business: "Business",
  location: "Location",
  service: "First service",
  hours: "Hours",
  storefront: "Storefront",
  review: "Review",
};

const beautyCategories = [
  ["barbershop", "Barbershop"],
  ["hair_salon", "Hair salon"],
  ["nail_salon", "Nail salon"],
  ["spa", "Spa"],
  ["beauty_salon", "Beauty salon"],
  ["lash_studio", "Lash studio"],
  ["brow_bar", "Brow bar"],
  ["tattoo_studio", "Tattoo studio"],
  ["massage_therapy", "Massage therapy"],
  ["wellness_center", "Wellness center"],
  ["personal_trainer", "Personal trainer"],
] as const;

const categorySchema = z.enum([
  "barbershop",
  "hair_salon",
  "nail_salon",
  "spa",
  "beauty_salon",
  "lash_studio",
  "brow_bar",
  "tattoo_studio",
  "massage_therapy",
  "wellness_center",
  "personal_trainer",
]);

const businessSchema = z.object({
  name: z.string().trim().min(2, "Enter your business name."),
  category: categorySchema,
});

const locationSchema = z.object({
  address: z.string().trim().min(2, "Enter a street address."),
  city: z.string().trim().min(2, "Enter a city."),
  neighborhood: z.string(),
  postalCode: z.string(),
  country: z.string().trim().length(2, "Use a two-letter country code."),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const serviceSchema = z.object({
  name: z.string().trim().min(2, "Enter a service name."),
  description: z.string().max(500),
  durationMins: z.number().int().positive(),
  price: z
    .string()
    .trim()
    .regex(/^\d+([.,]\d{1,2})?$/, "Enter a valid price."),
});

const storefrontSchema = z.object({
  tagline: z.string().max(100),
  bio: z.string().max(800),
  phone: z.string().max(30),
});

type BusinessValues = z.infer<typeof businessSchema>;
type LocationValues = z.infer<typeof locationSchema>;
type ServiceValues = z.infer<typeof serviceSchema>;
type StorefrontValues = z.infer<typeof storefrontSchema>;

interface OpeningHour {
  dayOfWeek: number;
  open: string;
  close: string;
  isClosed: boolean;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DEFAULT_HOURS: OpeningHour[] = DAYS.map((_, dayOfWeek) => ({
  dayOfWeek,
  open: "09:00",
  close: "18:00",
  isClosed: dayOfWeek === 6,
}));

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function WizardHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
        {eyebrow}
      </p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function BusinessStep({
  state,
  onSaved,
}: {
  state: ActivationState | undefined;
  onSaved: () => void;
}) {
  const save = useMutation(api.activation.startBeautyBusiness);
  const form = useForm<BusinessValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: state?.org.name ?? "",
      category: state?.org.beautyCategory ?? "barbershop",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await save({ name: values.name, category: values.category });
      toast.success("Business details saved");
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={submit}>
      <WizardHeading
        eyebrow="Business identity"
        title="Give the engine a clear identity"
        description="This name and category drive your workspace, booking page, and marketplace listing."
      />
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.name)}>
          <FieldLabel htmlFor="business-name">Business name</FieldLabel>
          <Input
            id="business-name"
            placeholder="King Cuts"
            aria-invalid={Boolean(form.formState.errors.name)}
            {...form.register("name")}
          />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
        <Controller
          control={form.control}
          name="category"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Beauty category</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {beautyCategories.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
      <div className="flex justify-end">
        <Button disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          Save and continue
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </form>
  );
}

function LocationStep({
  state,
  onSaved,
}: {
  state: NonNullable<ActivationState>;
  onSaved: () => void;
}) {
  const save = useMutation(api.activation.saveLocation);
  const coordinates = state.org.coordinates;
  const form = useForm<LocationValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      address: state.org.address ?? "",
      city: state.org.city ?? "",
      neighborhood: state.org.neighborhood ?? "",
      postalCode: state.org.postalCode ?? "",
      country: state.org.country ?? "MK",
      lat: coordinates?.lat ?? 41.9965,
      lng: coordinates?.lng ?? 21.4254,
    },
  });
  const [searchQuery, setSearchQuery] = useState(state.org.address ?? "");
  const { results, isSearching, error, clearResults } =
    useMapboxSearch(searchQuery);
  const [lat, lng] = useWatch({
    control: form.control,
    name: ["lat", "lng"],
  });
  const selectedCoordinates = { lat, lng };

  const applyLocation = (location: BusinessLocation) => {
    form.setValue("address", location.address, { shouldValidate: true });
    form.setValue("city", location.city, { shouldValidate: true });
    form.setValue("neighborhood", location.neighborhood);
    form.setValue("postalCode", location.postalCode);
    form.setValue("country", location.country, { shouldValidate: true });
    form.setValue("lat", location.coordinates.lat);
    form.setValue("lng", location.coordinates.lng);
    setSearchQuery(location.displayName);
    clearResults();
  };

  const handleMapChange = async (next: { lat: number; lng: number }) => {
    form.setValue("lat", next.lat);
    form.setValue("lng", next.lng);
    try {
      const location = await reverseGeocodeMapbox(next);
      if (location) applyLocation(location);
    } catch (caught) {
      toast.error(errorMessage(caught));
    }
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      await save({
        address: values.address,
        city: values.city,
        neighborhood: values.neighborhood || undefined,
        postalCode: values.postalCode || undefined,
        country: values.country,
        coordinates: { lat: values.lat, lng: values.lng },
      });
      toast.success("Location confirmed");
      onSaved();
    } catch (caught) {
      toast.error(errorMessage(caught));
    }
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={submit}>
      <WizardHeading
        eyebrow="Location"
        title="Pin the place customers should arrive"
        description="Choose a search result, adjust the pin, then confirm the structured address saved to Convex."
      />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="address-search">Find your address</FieldLabel>
          <div className="relative">
            <InputGroup>
              <InputGroupAddon>
                {isSearching ? <Spinner /> : <Search />}
              </InputGroupAddon>
              <InputGroupInput
                id="address-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by street, venue, or neighborhood"
                autoComplete="off"
              />
            </InputGroup>
            {results.length > 0 && (
              <div className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-2xl border bg-popover shadow-l">
                {results.map((feature) => (
                  <button
                    key={feature.id}
                    type="button"
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-secondary"
                    onClick={() => applyLocation(parseMapboxFeature(feature))}
                  >
                    <span className="text-sm font-medium">{feature.text}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {feature.place_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {(error || form.formState.errors.lat) && (
            <FieldError>{error ?? form.formState.errors.lat?.message}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel>Exact map pin</FieldLabel>
          <LocationMapPicker
            coords={selectedCoordinates}
            onChange={handleMapChange}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            className="sm:col-span-2"
            data-invalid={Boolean(form.formState.errors.address)}
          >
            <FieldLabel htmlFor="address">Street address</FieldLabel>
            <Input
              id="address"
              aria-invalid={Boolean(form.formState.errors.address)}
              {...form.register("address")}
            />
            <FieldError errors={[form.formState.errors.address]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.city)}>
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input
              id="city"
              aria-invalid={Boolean(form.formState.errors.city)}
              {...form.register("city")}
            />
            <FieldError errors={[form.formState.errors.city]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="neighborhood">Neighborhood</FieldLabel>
            <Input id="neighborhood" {...form.register("neighborhood")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="postal-code">Postal code</FieldLabel>
            <Input id="postal-code" {...form.register("postalCode")} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.country)}>
            <FieldLabel htmlFor="country">Country code</FieldLabel>
            <Input
              id="country"
              maxLength={2}
              className="uppercase"
              aria-invalid={Boolean(form.formState.errors.country)}
              {...form.register("country")}
            />
            <FieldError errors={[form.formState.errors.country]} />
          </Field>
        </div>
      </FieldGroup>
      <div className="flex justify-end">
        <Button disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          Confirm location
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </form>
  );
}

function ServiceStep({
  state,
  onSaved,
}: {
  state: NonNullable<ActivationState>;
  onSaved: () => void;
}) {
  const save = useMutation(api.activation.saveFirstService);
  const service = state.firstService;
  const form = useForm<ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name ?? "",
      description:
        service?.consumerDescription ?? service?.description ?? "",
      durationMins: service?.durationMins ?? 30,
      price: service ? (service.priceMinorUnits / 100).toFixed(2) : "",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await save({
        serviceId: service?._id,
        name: values.name,
        description: values.description || undefined,
        durationMins: values.durationMins,
        priceMinorUnits: Math.round(
          Number(values.price.replace(",", ".")) * 100,
        ),
      });
      toast.success("First service saved");
      onSaved();
    } catch (caught) {
      toast.error(errorMessage(caught));
    }
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={submit}>
      <WizardHeading
        eyebrow="First service"
        title="Create something customers can actually book"
        description="We assign this service to your owner profile so your first available slots work immediately."
      />
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.name)}>
          <FieldLabel htmlFor="service-name">Service name</FieldLabel>
          <Input
            id="service-name"
            placeholder="Signature haircut"
            aria-invalid={Boolean(form.formState.errors.name)}
            {...form.register("name")}
          />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="service-description">
            Customer description
          </FieldLabel>
          <Textarea
            id="service-description"
            placeholder="What is included, and what should customers expect?"
            {...form.register("description")}
          />
          <FieldDescription>
            This copy appears directly on opus.mk.
          </FieldDescription>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(form.formState.errors.durationMins)}>
            <FieldLabel htmlFor="duration">Duration</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="duration"
                type="number"
                min={15}
                step={15}
                aria-invalid={Boolean(form.formState.errors.durationMins)}
                {...form.register("durationMins", { valueAsNumber: true })}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>minutes</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <FieldError errors={[form.formState.errors.durationMins]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.price)}>
            <FieldLabel htmlFor="price">Price</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="price"
                inputMode="decimal"
                placeholder="25.00"
                aria-invalid={Boolean(form.formState.errors.price)}
                {...form.register("price")}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>MKD</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <FieldError errors={[form.formState.errors.price]} />
          </Field>
        </div>
      </FieldGroup>
      <div className="flex justify-end">
        <Button disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          Save service
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </form>
  );
}

function HoursStep({
  state,
  onSaved,
}: {
  state: NonNullable<ActivationState>;
  onSaved: () => void;
}) {
  const save = useMutation(api.activation.saveHours);
  const [hours, setHours] = useState<OpeningHour[]>(
    state.org.openingHours ?? DEFAULT_HOURS,
  );
  const [isSaving, setIsSaving] = useState(false);

  const update = (
    dayOfWeek: number,
    patch: Partial<Omit<OpeningHour, "dayOfWeek">>,
  ) => {
    setHours((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day,
      ),
    );
  };

  const submit = async () => {
    setIsSaving(true);
    try {
      await save({ openingHours: hours });
      toast.success("Hours and availability saved");
      onSaved();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <WizardHeading
        eyebrow="Hours and availability"
        title="Turn display hours into bookable time"
        description="These hours appear on your listing and become the owner’s initial weekly availability."
      />
      <FieldSet>
        <FieldLegend>Weekly schedule</FieldLegend>
        <div className="flex flex-col gap-3">
          {hours.map((day) => (
            <div
              key={day.dayOfWeek}
              className="grid items-center gap-3 rounded-2xl border p-3 sm:grid-cols-[130px_1fr_1fr_auto]"
            >
              <p className="text-sm font-medium">{DAYS[day.dayOfWeek]}</p>
              <Input
                type="time"
                value={day.open}
                disabled={day.isClosed}
                aria-label={`${DAYS[day.dayOfWeek]} opening time`}
                onChange={(event) =>
                  update(day.dayOfWeek, { open: event.target.value })
                }
              />
              <Input
                type="time"
                value={day.close}
                disabled={day.isClosed}
                aria-label={`${DAYS[day.dayOfWeek]} closing time`}
                onChange={(event) =>
                  update(day.dayOfWeek, { close: event.target.value })
                }
              />
              <Field orientation="horizontal" className="w-auto">
                <Checkbox
                  id={`closed-${day.dayOfWeek}`}
                  checked={day.isClosed}
                  onCheckedChange={(checked) =>
                    update(day.dayOfWeek, { isClosed: checked === true })
                  }
                />
                <FieldLabel htmlFor={`closed-${day.dayOfWeek}`}>
                  Closed
                </FieldLabel>
              </Field>
            </div>
          ))}
        </div>
      </FieldSet>
      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={isSaving}>
          {isSaving && <Spinner />}
          Save availability
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

async function uploadFile(
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
  const result = (await response.json()) as { storageId: Id<"_storage"> };
  return result.storageId;
}

function StorefrontStep({
  state,
  onSaved,
}: {
  state: NonNullable<ActivationState>;
  onSaved: () => void;
}) {
  const save = useMutation(api.activation.saveStorefront);
  const generateUploadUrl = useMutation(api.activation.generateUploadUrl);
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);
  const form = useForm<StorefrontValues>({
    resolver: zodResolver(storefrontSchema),
    defaultValues: {
      tagline: state.org.tagline ?? "",
      bio: state.org.bio ?? "",
      phone: state.org.phone ?? "",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      const [logoStorageId, coverStorageId, galleryStorageIds] =
        await Promise.all([
          logo ? uploadFile(logo, generateUploadUrl) : undefined,
          cover ? uploadFile(cover, generateUploadUrl) : undefined,
          Promise.all(
            gallery.map((file) => uploadFile(file, generateUploadUrl)),
          ),
        ]);
      await save({
        ...values,
        tagline: values.tagline || undefined,
        bio: values.bio || undefined,
        phone: values.phone || undefined,
        logoStorageId,
        coverStorageId,
        galleryStorageIds,
      });
      toast.success("Storefront saved");
      onSaved();
    } catch (caught) {
      toast.error(errorMessage(caught));
    }
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={submit}>
      <WizardHeading
        eyebrow="Storefront"
        title="Make the first impression feel like you"
        description="A strong image gets you publish-ready. The copy helps customers choose you with confidence."
      />
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="logo">Logo</FieldLabel>
            <label
              htmlFor="logo"
              className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-secondary/30 p-4 text-center"
            >
              <Upload />
              <span className="text-sm font-medium">
                {logo?.name ?? (state.org.logoUrl ? "Replace logo" : "Choose logo")}
              </span>
            </label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="cover">Cover photo</FieldLabel>
            <label
              htmlFor="cover"
              className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-secondary/30 p-4 text-center"
            >
              <ImagePlus />
              <span className="text-sm font-medium">
                {cover?.name ??
                  (state.media.some((item) => item.type === "cover")
                    ? "Replace cover"
                    : "Choose cover")}
              </span>
            </label>
            <Input
              id="cover"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => setCover(event.target.files?.[0] ?? null)}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="tagline">Tagline</FieldLabel>
          <Input
            id="tagline"
            placeholder="Sharp cuts. Easy booking."
            {...form.register("tagline")}
          />
          <FieldError errors={[form.formState.errors.tagline]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="bio">About your business</FieldLabel>
          <Textarea
            id="bio"
            placeholder="Tell customers what you care about and what the experience feels like."
            {...form.register("bio")}
          />
          <FieldError errors={[form.formState.errors.bio]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">Customer phone</FieldLabel>
          <Input
            id="phone"
            type="tel"
            placeholder="+389 70 000 000"
            {...form.register("phone")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="gallery">Gallery</FieldLabel>
          <Input
            id="gallery"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) =>
              setGallery(Array.from(event.target.files ?? []))
            }
          />
          <FieldDescription>
            Optional. Add a few examples of the space or your work.
          </FieldDescription>
        </Field>
      </FieldGroup>
      <div className="flex justify-end">
        <Button disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          Save storefront
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </form>
  );
}

function ReviewStep({
  state,
  onPublished,
}: {
  state: NonNullable<ActivationState>;
  onPublished: () => void;
}) {
  const publish = useMutation(api.listing.publishOrg);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await publish({});
      toast.success("Published on opus.mk");
      onPublished();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <WizardHeading
        eyebrow="Review and publish"
        title={
          state.org.listingStatus === "published"
            ? "Your business is live"
            : "One clean check before you go live"
        }
        description="The engine checks the same requirements here, during publishing, and whenever your setup changes later."
      />
      <div className="grid gap-3">
        {state.requirements.map((requirement) => (
          <div
            key={requirement.code}
            className="flex items-start gap-3 rounded-2xl border p-4"
          >
            <div
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                requirement.complete
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {requirement.complete ? <Check /> : <Clock3 />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{requirement.label}</p>
              <p className="text-xs text-muted-foreground">
                {requirement.description}
              </p>
            </div>
            {!requirement.complete && (
              <Button asChild variant="ghost" size="sm">
                <Link href={requirement.actionHref}>Fix</Link>
              </Button>
            )}
          </div>
        ))}
      </div>
      <Alert>
        <Store />
        <AlertTitle>Publishing is explicit</AlertTitle>
        <AlertDescription>
          Your dashboard already works. Publishing only controls whether
          customers can discover and book you on opus.mk.
        </AlertDescription>
      </Alert>
      <div className="flex flex-wrap justify-end gap-3">
        <Button asChild variant="outline">
          <Link href="/beauty">Open dashboard</Link>
        </Button>
        {state.org.listingStatus !== "published" && (
          <Button
            variant="terracotta"
            onClick={handlePublish}
            disabled={!state.allRequiredComplete || isPublishing}
          >
            {isPublishing && <Spinner />}
            Publish to opus.mk
            <Sparkles data-icon="inline-end" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useUser();
  const profile = useQuery(api.users.getMyProfile);
  const state = useQuery(
    api.activation.getState,
    profile?.orgId ? {} : "skip",
  );
  const preview = useQuery(
    api.activation.getPreview,
    profile?.orgId ? {} : "skip",
  );
  const requestedStep = searchParams.get("step");
  const [manualStep, setManualStep] = useState<Step | null>(
    STEP_ORDER.includes(requestedStep as Step) ? (requestedStep as Step) : null,
  );

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/login");
  }, [isLoaded, isSignedIn, router]);

  if (
    !isLoaded ||
    !isSignedIn ||
    profile === undefined ||
    (profile?.orgId && state === undefined)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  const derivedStep: Step = profile?.orgId
    ? state?.nextStep ?? "review"
    : "business";
  const step = manualStep ?? derivedStep;
  const stepIndex = STEP_ORDER.indexOf(step);
  const visibleSteps = STEP_ORDER;
  const progressIndex = visibleSteps.indexOf(step);
  const progress = Math.max(
    0,
    ((progressIndex + 1) / visibleSteps.length) * 100,
  );
  const canGoBack = stepIndex > 0;

  const goBack = () => {
    if (canGoBack) setManualStep(STEP_ORDER[stepIndex - 1]);
  };

  const stateKey = state?.org.updatedAt ?? "new";

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo className="text-2xl" />
            <span className="text-sm text-muted-foreground">Business launch</span>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <Eye data-icon="inline-start" />
                  Preview
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>opus.mk preview</SheetTitle>
                  <SheetDescription>
                    This uses the same Convex projection as the live listing.
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-6">
                  <ActivationPreview preview={preview} />
                </div>
              </SheetContent>
            </Sheet>
            {state?.operationalSetupComplete && (
              <Button asChild variant="ghost">
                <Link href="/beauty">Dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 lg:py-10">
        <Card className="min-w-0 border">
          <CardHeader className="gap-5">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm">
                {STEP_LABELS[step]}
              </CardTitle>
              <CardDescription>
                {progressIndex + 1} of {visibleSteps.length}
              </CardDescription>
            </div>
            <Progress value={progress} />
          </CardHeader>
          <CardContent>
            <div key={`${step}-${stateKey}`}>
              {step === "business" && (
                <BusinessStep
                  state={state}
                  onSaved={() => setManualStep("location")}
                />
              )}
              {step === "location" && state && (
                <LocationStep
                  state={state}
                  onSaved={() => setManualStep("service")}
                />
              )}
              {step === "service" && state && (
                <ServiceStep
                  state={state}
                  onSaved={() => setManualStep("hours")}
                />
              )}
              {step === "hours" && state && (
                <HoursStep
                  state={state}
                  onSaved={() => setManualStep("storefront")}
                />
              )}
              {step === "storefront" && state && (
                <StorefrontStep
                  state={state}
                  onSaved={() => setManualStep("review")}
                />
              )}
              {step === "review" && state && (
                <ReviewStep
                  state={state}
                  onPublished={() => router.push("/beauty")}
                />
              )}
            </div>
          </CardContent>
          {canGoBack && (
            <CardFooter>
              <Button type="button" variant="ghost" onClick={goBack}>
                <ArrowLeft data-icon="inline-start" />
                Back
              </Button>
            </CardFooter>
          )}
        </Card>

        <aside className="sticky top-6 hidden self-start lg:block">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Live marketplace preview
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 />
              Convex
            </span>
          </div>
          <ActivationPreview preview={preview} />
        </aside>
      </div>
    </main>
  );
}
