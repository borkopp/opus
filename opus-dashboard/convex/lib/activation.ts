import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

type ReadCtx = Pick<QueryCtx, "db">;

export type ActivationStep =
  | "business"
  | "location"
  | "service"
  | "hours"
  | "storefront"
  | "review";

export type ActivationRequirementCode =
  | "business_identity"
  | "location"
  | "provider"
  | "service"
  | "availability"
  | "booking_settings"
  | "storefront"
  | "payments";

export interface ActivationRequirement {
  code: ActivationRequirementCode;
  label: string;
  description: string;
  complete: boolean;
  actionHref: string;
}

export interface BeautyActivationState {
  org: Doc<"orgs">;
  owner: Doc<"staff_members"> | null;
  firstService: Doc<"services"> | null;
  availabilityRules: Doc<"availability_rules">[];
  settings: Doc<"org_settings"> | null;
  media: Doc<"org_media">[];
  requirements: ActivationRequirement[];
  allRequiredComplete: boolean;
  operationalSetupComplete: boolean;
  nextStep: ActivationStep;
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function requirement(
  code: ActivationRequirementCode,
  label: string,
  description: string,
  complete: boolean,
  actionHref: string,
): ActivationRequirement {
  return { code, label, description, complete, actionHref };
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function getBeautyActivationState(
  ctx: ReadCtx,
  orgId: Id<"orgs">,
): Promise<BeautyActivationState | null> {
  const org = await ctx.db.get(orgId);
  if (!org || org.isDeleted) return null;

  const [staff, services, availabilityRules, settings, media] =
    await Promise.all([
      ctx.db
        .query("staff_members")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", orgId).eq("isActive", true).eq("isDeleted", false),
        )
        .collect(),
      ctx.db
        .query("services")
        .withIndex("by_org_visible_active", (q) =>
          q
            .eq("orgId", orgId)
            .eq("isOpusVisible", true)
            .eq("isActive", true)
            .eq("isDeleted", false),
        )
        .collect(),
      ctx.db
        .query("availability_rules")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", orgId).eq("isActive", true).eq("isDeleted", false),
        )
        .collect(),
      ctx.db
        .query("org_settings")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .first(),
      ctx.db
        .query("org_media")
        .withIndex("by_org_active", (q) =>
          q.eq("orgId", orgId).eq("isDeleted", false),
        )
        .collect(),
    ]);

  const owner =
    staff.find((member) => member.role === "owner" && member.userId) ??
    staff.find((member) => member.role === "owner") ??
    null;
  const firstService =
    services.find(
      (service) => owner && service.staffIds.includes(owner._id),
    ) ?? null;
  const ownerAvailability = owner
    ? availabilityRules.filter((rule) => rule.staffId === owner._id)
    : [];

  const identityComplete =
    org.industry === "beauty_wellness" &&
    hasText(org.name) &&
    Boolean(org.beautyCategory) &&
    hasText(org.slug);
  const locationComplete =
    hasText(org.address) &&
    hasText(org.city) &&
    hasText(org.country) &&
    Boolean(org.coordinates);
  const providerComplete = Boolean(owner);
  const serviceComplete = Boolean(firstService);
  const availabilityComplete = Boolean(
    firstService &&
      org.openingHours?.some((displayHours) => {
        if (displayHours.isClosed) return false;
        const availabilityDay = (displayHours.dayOfWeek + 1) % 7;
        return ownerAvailability.some((rule) => {
          if (rule.dayOfWeek !== availabilityDay) return false;
          const overlapStart = Math.max(
            timeToMinutes(displayHours.open),
            timeToMinutes(rule.startTime),
          );
          const overlapEnd = Math.min(
            timeToMinutes(displayHours.close),
            timeToMinutes(rule.endTime),
          );
          return overlapEnd - overlapStart >= firstService.durationMins;
        });
      }),
  );
  const bookingSettingsComplete = Boolean(
    settings &&
      Number.isInteger(settings.slotDurationMins) &&
      settings.slotDurationMins > 0 &&
      Number.isInteger(settings.bookingWindowDays) &&
      settings.bookingWindowDays > 0 &&
      firstService &&
      firstService.durationMins % settings.slotDurationMins === 0,
  );
  const storefrontComplete =
    hasText(org.logoUrl) || media.some((item) => item.type === "cover");
  const paymentsComplete =
    !settings?.depositRequired || hasText(org.braintreeMerchantAccountId);

  const requirements = [
    requirement(
      "business_identity",
      "Business identity",
      "Add your business name and beauty category.",
      identityComplete,
      "/onboarding?step=business",
    ),
    requirement(
      "location",
      "Confirmed location",
      "Confirm a complete address and map pin.",
      locationComplete,
      "/onboarding?step=location",
    ),
    requirement(
      "provider",
      "Active provider",
      "Your owner profile is the first service provider.",
      providerComplete,
      "/beauty/staff",
    ),
    requirement(
      "service",
      "Bookable service",
      "Add an active service assigned to your provider.",
      serviceComplete,
      "/onboarding?step=service",
    ),
    requirement(
      "availability",
      "Bookable hours",
      "Set opening hours and provider availability.",
      availabilityComplete,
      "/onboarding?step=hours",
    ),
    requirement(
      "booking_settings",
      "Booking settings",
      "Use valid slot and booking-window settings.",
      bookingSettingsComplete,
      "/settings?tab=booking",
    ),
    requirement(
      "storefront",
      "Storefront image",
      "Upload a logo or cover photo.",
      storefrontComplete,
      "/onboarding?step=storefront",
    ),
    requirement(
      "payments",
      "Deposit payments",
      "Connect Braintree when online deposits are enabled.",
      paymentsComplete,
      "/settings?tab=deposits",
    ),
  ];

  let nextStep: ActivationStep = "review";
  if (!identityComplete) nextStep = "business";
  else if (!locationComplete) nextStep = "location";
  else if (!serviceComplete) nextStep = "service";
  else if (!availabilityComplete || !bookingSettingsComplete) nextStep = "hours";
  else if (!storefrontComplete) nextStep = "storefront";

  return {
    org,
    owner,
    firstService,
    availabilityRules: ownerAvailability,
    settings,
    media: media.sort((a, b) => a.sortOrder - b.sortOrder),
    requirements,
    allRequiredComplete: requirements.every((item) => item.complete),
    operationalSetupComplete:
      identityComplete &&
      locationComplete &&
      providerComplete &&
      serviceComplete &&
      availabilityComplete &&
      bookingSettingsComplete,
    nextStep,
  };
}
