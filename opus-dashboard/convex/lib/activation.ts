import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { operationalSettingsError } from "./orgSettingsValidation";

type ReadCtx = Pick<QueryCtx, "db">;

export type ActivationStep =
  | "business"
  | "category"
  | "owner"
  | "location"
  | "service"
  | "hours"
  | "review";

export type ActivationRequirementCode =
  | "business_identity"
  | "location"
  | "provider"
  | "service"
  | "availability"
  | "booking_settings"
  | "website_logo"
  | "website_banner"
  | "website_tagline"
  | "website_phone";

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
  ownerNameComplete: boolean;
  firstService: Doc<"services"> | null;
  availabilityRules: Doc<"availability_rules">[];
  settings: Doc<"org_settings"> | null;
  media: Doc<"org_media">[];
  requirements: ActivationRequirement[];
  websiteRequirements: ActivationRequirement[];
  websiteEnhancements: ActivationRequirement[];
  allRequiredComplete: boolean;
  allWebsiteRequirementsComplete: boolean;
  operationalSetupComplete: boolean;
  onboardingComplete: boolean;
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

function hasRecurringSlot(
  rule: Doc<"availability_rules">,
  start: number,
  end: number,
  durationMins: number,
  settings: Doc<"org_settings">,
) {
  const anchor = timeToMinutes(rule.startTime);
  const fits = (from: number, to: number) => {
    // Match the public slot engine: starts are anchored to the staff's opening
    // time and the service's buffer must fit before a break or closing time.
    const alignedStart =
      anchor +
      Math.ceil((from - anchor) / settings.slotDurationMins) *
        settings.slotDurationMins;
    return alignedStart + durationMins + settings.bufferTimeMins <= to;
  };
  const breaks = (rule.breaks ?? [])
    .map((pause) => ({
      start: timeToMinutes(pause.startTime),
      end: timeToMinutes(pause.endTime),
    }))
    .sort((a, b) => a.start - b.start);
  let freeStart = start;
  for (const pause of breaks) {
    if (pause.end <= freeStart) continue;
    if (pause.start >= end) break;
    if (fits(freeStart, Math.min(pause.start, end))) return true;
    freeStart = Math.max(freeStart, pause.end);
  }
  return fits(freeStart, end);
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
  const activeStaffIds = new Set(staff.map((member) => member._id));
  const assignedServices = services.filter((service) =>
    service.staffIds.some((staffId) => activeStaffIds.has(staffId)),
  );
  const firstService =
    assignedServices.find(
      (service) => owner && service.staffIds.includes(owner._id),
    ) ??
    assignedServices[0] ??
    null;
  const ownerAvailability = owner
    ? availabilityRules.filter((rule) => rule.staffId === owner._id)
    : [];

  const nameComplete =
    org.industry === "beauty_wellness" &&
    hasText(org.name) &&
    hasText(org.slug);
  const identityComplete = nameComplete && Boolean(org.beautyCategory);
  const locationComplete =
    hasText(org.address) &&
    hasText(org.city) &&
    hasText(org.country) &&
    Boolean(org.coordinates);
  const ownerNameComplete = Boolean(owner && org.ownerNameConfirmed !== false);
  const providerComplete = ownerNameComplete;
  const serviceComplete = assignedServices.length > 0;
  const validSettings = Boolean(
    settings && !operationalSettingsError(settings),
  );
  // Start intervals determine when appointments may begin, not how long their
  // services last. Existing 35-minute services work on a 15-minute start grid.
  const validDurationServices = assignedServices.filter(
    (service) =>
      validSettings &&
      settings &&
      Number.isInteger(service.durationMins) &&
      service.durationMins > 0,
  );
  // The owner starts as the first provider during setup, but may later manage
  // the studio without taking appointments. Any active assigned provider can
  // keep the website bookable, even when the owner's schedule is empty.
  const availabilityComplete = validDurationServices.some((service) =>
    org.openingHours?.some((displayHours) => {
      if (displayHours.isClosed) return false;
      const availabilityDay = (displayHours.dayOfWeek + 1) % 7;
      return availabilityRules.some((rule) => {
        if (
          rule.dayOfWeek !== availabilityDay ||
          !activeStaffIds.has(rule.staffId) ||
          !service.staffIds.includes(rule.staffId)
        )
          return false;
        const overlapStart = Math.max(
          timeToMinutes(displayHours.open),
          timeToMinutes(rule.startTime),
        );
        const overlapEnd = Math.min(
          timeToMinutes(displayHours.close),
          timeToMinutes(rule.endTime),
        );
        return (
          settings !== null &&
          hasRecurringSlot(
            rule,
            overlapStart,
            overlapEnd,
            service.durationMins,
            settings,
          )
        );
      });
    }),
  );
  const bookingSettingsComplete = Boolean(
    validSettings && validDurationServices.length > 0,
  );
  const logoComplete = hasText(org.logoUrl);
  const bannerComplete = media.some(
    (item) => item.type === "cover" && hasText(item.url),
  );
  const taglineComplete = hasText(org.tagline);
  const phoneComplete = hasText(org.phone);
  const requirements = [
    requirement(
      "business_identity",
      "Business identity",
      "Add your business name and beauty category.",
      identityComplete,
      nameComplete ? "/onboarding?step=category" : "/onboarding?step=business",
    ),
    requirement(
      "provider",
      "Owner name",
      "Add the name customers will see when booking with you.",
      providerComplete,
      "/onboarding?step=owner",
    ),
    requirement(
      "location",
      "Confirmed location",
      "Confirm a complete address and map pin.",
      locationComplete,
      "/onboarding?step=location",
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
  ];
  // Only operational booking requirements block launch. Branding is optional.
  const websiteRequirements = requirements;
  const websiteEnhancements = [
    requirement(
      "website_logo",
      "Website logo",
      "Upload the logo customers will recognize.",
      logoComplete,
      "/settings?tab=branding",
    ),
    requirement(
      "website_banner",
      "Website cover photo",
      "Upload a cover photo for the top of your website.",
      bannerComplete,
      "/settings?tab=branding",
    ),
    requirement(
      "website_tagline",
      "Studio tagline",
      "Add a short tagline that introduces your studio.",
      taglineComplete,
      "/settings?tab=branding",
    ),
    requirement(
      "website_phone",
      "Contact phone",
      "Add a phone number customers can use to contact you.",
      phoneComplete,
      "/settings?tab=branding",
    ),
  ];

  let nextStep: ActivationStep = "review";
  if (!identityComplete) nextStep = nameComplete ? "category" : "business";
  else if (!ownerNameComplete) nextStep = "owner";
  else if (!locationComplete) nextStep = "location";
  else if (!serviceComplete) nextStep = "service";
  else if (!availabilityComplete || !bookingSettingsComplete)
    nextStep = "hours";

  const allRequiredComplete = requirements.every((item) => item.complete);

  const allWebsiteRequirementsComplete = websiteRequirements.every(
    (item) => item.complete,
  );

  return {
    org,
    owner,
    ownerNameComplete,
    firstService,
    availabilityRules: ownerAvailability,
    settings,
    media: media.sort((a, b) => a.sortOrder - b.sortOrder),
    requirements,
    websiteRequirements,
    websiteEnhancements,
    allRequiredComplete,
    allWebsiteRequirementsComplete,
    onboardingComplete:
      org.websiteStatus === "published" && allWebsiteRequirementsComplete,
    operationalSetupComplete: allRequiredComplete,
    nextStep,
  };
}
