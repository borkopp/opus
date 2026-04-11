import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// OMNI-SERVICE OS — Convex Schema
// ─────────────────────────────────────────────────────────────────────────────
//
// Design principles:
//   1. Every table is partitioned by orgId — enforced at query level, never UI only.
//   2. Soft deletes only (isDeleted: true) — preserves relational integrity and
//      creates a clean GDPR erasure audit trail.
//   3. All monetary values in minor units (denar / pence / cents) as integers — no floats.
//   4. Timestamps are Unix ms (number) — Convex native format.
//   5. audit_log is append-only. Never mutate existing rows.
//
// Tables
// ──────
//   Multi-tenancy : orgs, org_settings, org_media
//   Identity      : users, staff_members, opus_users
//   Catalogue     : service_categories, services
//   Scheduling    : availability_rules, availability_overrides, bookings
//   Payments      : payment_intents, payout_splits, payouts
//   CRM           : customers, customer_notes
//   Marketplace   : reviews
//   AI            : ai_conversations, ai_messages
//   Ops           : notifications, audit_log
//   Hospitality   : floor_plans, tables, reservation_settings, reservations
// ─────────────────────────────────────────────────────────────────────────────

export default defineSchema({

  // ─────────────────────────────────────────────────────
  // ORGS
  // One row per business. Root of all multi-tenancy.
  // Also drives the public opus.mk listing via listingStatus.
  // ─────────────────────────────────────────────────────
  orgs: defineTable({
    // ── Core identity ──
    name: v.string(),                        // "King Cuts Barbershop"
    slug: v.string(),                        // "king-cuts" — used for subdomain
    customDomain: v.optional(v.string()),    // "book.kingcuts.com"
    logoUrl: v.optional(v.string()),

    // ── Vertical ──
    industry: v.union(
      v.literal("beauty_wellness"),
      v.literal("hospitality"),
    ),

    // ── Branding ──
    brandColors: v.optional(v.object({
      primary: v.string(),                   // hex e.g. "#1A1A2E"
      secondary: v.string(),
      accent: v.string(),
    })),

    // ── Location ──
    address: v.optional(v.string()),         // "Ul. Makedonija 12"
    city: v.optional(v.string()),            // "Skopje"
    neighborhood: v.optional(v.string()),   // "Centar", "Karpoš"
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),         // "MK"
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),

    // ── Listing copy (consumer-facing, shown on opus.mk) ──
    tagline: v.optional(v.string()),         // "Skopje's premier barber since 2012"
    bio: v.optional(v.string()),             // Markdown, ~500 chars

    // ── Discovery & search signals ──
    tags: v.optional(v.array(v.string())),   // ["barber", "fade", "beard", "men's grooming"]
    priceRange: v.optional(v.union(
      v.literal("budget"),                   // < 500 MKD avg
      v.literal("mid"),                      // 500–1500 MKD avg
      v.literal("premium"),                  // > 1500 MKD avg
    )),

    // ── Contact & social ──
    phone: v.optional(v.string()),           // "+38972xxxxxxx" E.164
    instagramHandle: v.optional(v.string()), // "kingcuts_sk"
    instagramPageId: v.optional(v.string()), // numeric Meta PSID e.g. "123456789012345"
    websiteUrl: v.optional(v.string()),

    // ── Opening hours (display hours for opus.mk — separate from per-staff availability) ──
    // NOTE: dayOfWeek here uses ISO convention (0 = Mon … 6 = Sun),
    // whereas availability_rules and surgeRules use JS Date convention (0 = Sun … 6 = Sat).
    openingHours: v.optional(v.array(v.object({
      dayOfWeek: v.number(),                 // 0 = Mon … 6 = Sun (ISO)
      open: v.string(),                      // "09:00"
      close: v.string(),                     // "21:00"
      isClosed: v.boolean(),
    }))),

    // ── Beauty & Wellness category ──
    // Only populated when industry = "beauty_wellness"
    beautyCategory: v.optional(v.union(
      v.literal("barbershop"),
      v.literal("hair_salon"),
      v.literal("nail_salon"),
      v.literal("spa"),
      v.literal("beauty_salon"),
      v.literal("lash_studio"),
      v.literal("brow_bar"),
      v.literal("tattoo_studio"),
      v.literal("massage_therapy"),
      v.literal("wellness_center"),
      v.literal("personal_trainer"),
    )),

    // ── Hospitality-specific ──
    // Only populated when industry = "hospitality"
    cuisine: v.optional(v.array(v.string())), // ["Macedonian", "Grill", "Vegan-friendly"]
    venueType: v.optional(v.union(
      v.literal("restaurant"),
      v.literal("cafe"),
      v.literal("bar"),
      v.literal("club"),
      v.literal("hotel"),
    )),

    // ── opus.mk marketplace visibility ──
    // NOTE: optional during migration — make required after running migrateListingStatus
    listingStatus: v.optional(v.union(
      v.literal("unpublished"),              // default — owner has not attempted to publish
      v.literal("ready"),                    // all blocking conditions met, owner can publish
      v.literal("published"),               // live on opus.mk
      v.literal("suspended"),               // was published but a blocking condition broke
    )),
    publishedAt: v.optional(v.number()),     // timestamp of first publish
    featuredUntil: v.optional(v.number()),   // paid featured placement

    // ── Review aggregate (updated by scheduled action after review writes) ──
    reviewCount: v.number(),                 // default 0
    averageRating: v.number(),              // 0–5; stored as float (updated by cron)

    // ── Stripe ──
    stripeAccountId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),

    // ── Subscription ──
    plan: v.union(
      v.literal("starter"),
      v.literal("growth"),
      v.literal("enterprise"),
    ),
    planStatus: v.union(
      v.literal("trialing"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
    ),
    trialEndsAt: v.optional(v.number()),

    // ── Onboarding progress ──
    onboardingStep: v.number(),              // 0–5, drives completion score UI
    isOnboardingComplete: v.boolean(),

    // ── Soft delete ──
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_custom_domain", ["customDomain"])
    .index("by_stripe_account", ["stripeAccountId"])
    .index("by_listing_status", ["listingStatus"])
    .index("by_instagram_page_id", ["instagramPageId"])
    .index("by_city_listing", ["city", "listingStatus"])
    .searchIndex("search_by_name", {
      searchField: "name",
      filterFields: ["listingStatus", "isDeleted", "city", "industry", "beautyCategory"],
    }),


  // ─────────────────────────────────────────────────────
  // ORG MEDIA
  // Ordered media gallery for opus.mk listings.
  // Kept separate so the orgs row stays lean.
  // ─────────────────────────────────────────────────────
  org_media: defineTable({
    orgId: v.id("orgs"),
    url: v.string(),
    type: v.union(
      v.literal("cover"),      // hero banner — only one should be cover per org
      v.literal("gallery"),    // general venue/service photos
      v.literal("menu"),       // menu / price list images (hospitality)
      v.literal("team"),       // photo of the team / individual staff
    ),
    caption: v.optional(v.string()),
    sortOrder: v.number(),
    uploadedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_type", ["orgId", "type"]),


  // ─────────────────────────────────────────────────────
  // ORG SETTINGS
  // Operational config kept separate to avoid wide org rows.
  // ─────────────────────────────────────────────────────
  org_settings: defineTable({
    orgId: v.id("orgs"),

    // Locale — defaults to MKD / Skopje for new orgs
    timezone: v.string(),                    // "Europe/Belgrade" (covers MK)
    currency: v.string(),                    // "MKD"
    locale: v.string(),                      // "mk-MK"

    // Booking rules
    slotDurationMins: v.number(),            // default 15 — smallest bookable unit
    bookingWindowDays: v.number(),           // how far ahead clients can book (e.g. 60)
    cancellationWindowHours: v.number(),     // min notice to cancel without charge
    bufferTimeMins: v.number(),              // gap between appointments

    // Deposits
    depositRequired: v.boolean(),
    depositType: v.union(
      v.literal("fixed"),
      v.literal("percentage"),
    ),
    depositValue: v.number(),                // minor units if fixed; 0–100 if percentage

    // Surge pricing
    surgePricingEnabled: v.boolean(),
    surgeRules: v.optional(v.array(v.object({
      dayOfWeek: v.number(),                 // 0 = Sun … 6 = Sat
      startTime: v.string(),                 // "09:00"
      endTime: v.string(),                   // "11:00"
      multiplierPct: v.number(),             // e.g. 15 = +15%
    }))),

    // Notifications
    reminderHoursBefore: v.array(v.number()), // e.g. [24, 2]
    smsEnabled: v.boolean(),
    emailEnabled: v.boolean(),
    whatsappEnabled: v.boolean(),

    // Dashboard in-app notification preferences
    dashboardNotificationsEnabled: v.optional(v.boolean()),  // master toggle for bell icon
    dashboardSoundEnabled: v.optional(v.boolean()),          // chime sound on new notification
    dashboardToastEnabled: v.optional(v.boolean()),          // inline toast popup on new notification

    // AI front desk
    aiEnabled: v.boolean(),
    aiPersonaName: v.string(),               // "Aria" — shown to customers
    aiConfidenceThreshold: v.number(),       // 0–1; below this → human handoff
    aiHandoffPhoneNumber: v.optional(v.string()),

    // AI channel toggles
    aiWebchatEnabled: v.optional(v.boolean()),
    aiInstagramEnabled: v.optional(v.boolean()),

    // AI conversation style
    aiSystemPrompt: v.optional(v.string()),       // custom instructions for the AI
    aiGreetingMessage: v.optional(v.string()),    // first message when conversation starts
    aiTone: v.optional(v.union(
      v.literal("friendly"),
      v.literal("professional"),
      v.literal("casual"),
      v.literal("formal"),
    )),

    // AI working hours (uses JS Date convention: 0 = Sun … 6 = Sat, same as availability_rules)
    aiWorkingHoursEnabled: v.optional(v.boolean()),
    aiWorkingHours: v.optional(v.array(v.object({
      dayOfWeek: v.number(),    // 0 = Sun … 6 = Sat
      startTime: v.string(),    // "09:00"
      endTime: v.string(),      // "18:00"
    }))),
    aiAwayMessage: v.optional(v.string()),        // shown outside working hours

    // AI language
    aiLanguage: v.optional(v.union(
      v.literal("auto"),   // detect from customer message (default)
      v.literal("en"),     // English only
      v.literal("mk"),     // Macedonian only
    )),

    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"]),


  // ─────────────────────────────────────────────────────
  // USERS
  // Platform staff/owner authentication identity.
  // One user can belong to multiple orgs via staff_members.
  // ─────────────────────────────────────────────────────
  users: defineTable({
    clerkId: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    avatarUrl: v.optional(v.string()),

    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkId"]),


  // ─────────────────────────────────────────────────────
  // OPUS USERS
  // Platform-wide end-consumer identity (opus.mk visitors).
  // These are NOT business owners or staff.
  // Uses the same Clerk instance — differentiated by public metadata.
  // Scoped globally (no orgId) — they span multiple businesses.
  // ─────────────────────────────────────────────────────
  opus_users: defineTable({
    clerkId: v.optional(v.string()),         // Clerk subject ID after sign-in
    email: v.string(),
    phone: v.optional(v.string()),           // E.164
    name: v.string(),
    avatarUrl: v.optional(v.string()),

    preferredCity: v.optional(v.string()),   // "Skopje" — for personalised feed

    // Loyalty (phase 2)
    opusPoints: v.number(),                  // default 0
    tier: v.union(
      v.literal("bronze"),
      v.literal("silver"),
      v.literal("gold"),
    ),

    // Preferences
    preferredChannel: v.optional(v.union(
      v.literal("whatsapp"),
      v.literal("sms"),
      v.literal("email"),
    )),

    // GDPR
    marketingOptIn: v.boolean(),
    gdprConsentAt: v.optional(v.number()),
    gdprErasureRequestedAt: v.optional(v.number()),

    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkId"]),


  // ─────────────────────────────────────────────────────
  // STAFF MEMBERS
  // Joins a user to an org with a role. Permission boundary.
  // ─────────────────────────────────────────────────────
  staff_members: defineTable({
    orgId: v.id("orgs"),
    userId: v.optional(v.id("users")),       // null = placeholder / unnamed seat

    // Profile
    displayName: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    specialties: v.array(v.string()),

    // Role
    role: v.union(
      v.literal("owner"),
      v.literal("manager"),
      v.literal("staff"),
    ),

    // Payout config
    stripeConnectedAccountId: v.optional(v.string()),
    payoutSharePct: v.optional(v.number()),

    // No-show risk score
    noShowRiskScore: v.optional(v.number()), // 0–1

    isActive: v.boolean(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["orgId", "userId"])
    .index("by_org_role", ["orgId", "role"]),


  // ─────────────────────────────────────────────────────
  // STAFF INVITES
  // ─────────────────────────────────────────────────────
  staff_invites: defineTable({
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
    email: v.string(),
    token: v.string(),

    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("cancelled"),
    ),

    expiresAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_token", ["token"])
    .index("by_staff", ["staffId"])
    .index("by_email", ["email"]),


  // ─────────────────────────────────────────────────────
  // SERVICE CATEGORIES
  // e.g. "Haircuts", "Beard", "Colour"
  // ─────────────────────────────────────────────────────
  service_categories: defineTable({
    orgId: v.id("orgs"),
    name: v.string(),
    sortOrder: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"]),


  // ─────────────────────────────────────────────────────
  // SERVICES
  // The bookable items. Price in minor units (MKD).
  // ─────────────────────────────────────────────────────
  services: defineTable({
    orgId: v.id("orgs"),
    categoryId: v.optional(v.id("service_categories")),

    // Internal (owner-written)
    name: v.string(),                        // "Men's Haircut"
    description: v.optional(v.string()),     // internal notes / ops copy

    // Consumer-facing (shown on opus.mk)
    consumerDescription: v.optional(v.string()), // "Our signature fade, tailored to your face shape…"
    highlights: v.optional(v.array(v.string())), // ["Includes beard line-up", "Skin fade finish"]
    photoUrl: v.optional(v.string()),        // hero image for this service on opus.mk

    durationMins: v.number(),
    priceMinorUnits: v.number(),             // e.g. 1500 = 1500 MKD
    currency: v.string(),                    // "MKD"

    // Which staff can perform this service
    staffIds: v.array(v.id("staff_members")),

    // Surge pricing override
    surgePricingOverride: v.optional(v.boolean()),

    // opus.mk visibility
    isOpusVisible: v.boolean(),             // default true; allows hiding specific services
    popularityScore: v.number(),            // updated by cron from booking count; drives ranking

    isActive: v.boolean(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_category", ["orgId", "categoryId"])
    .index("by_org_active", ["orgId", "isActive"])
    .index("by_org_opus", ["orgId", "isOpusVisible"]),


  // ─────────────────────────────────────────────────────
  // AVAILABILITY RULES
  // ─────────────────────────────────────────────────────
  availability_rules: defineTable({
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
    dayOfWeek: v.number(),                   // 0 = Sun … 6 = Sat
    startTime: v.string(),                   // "09:00"
    endTime: v.string(),                     // "18:00"
    breaks: v.optional(v.array(v.object({
      startTime: v.string(),
      endTime: v.string(),
    }))),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_staff", ["staffId"])
    .index("by_staff_day", ["staffId", "dayOfWeek"]),


  // ─────────────────────────────────────────────────────
  // AVAILABILITY OVERRIDES
  // ─────────────────────────────────────────────────────
  availability_overrides: defineTable({
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
    date: v.string(),                        // "2026-08-25" ISO date
    type: v.union(
      v.literal("day_off"),
      v.literal("custom_hours"),
    ),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_staff_date", ["staffId", "date"]),


  // ─────────────────────────────────────────────────────
  // BOOKINGS
  // Core transactional table for beauty_wellness vertical.
  // ─────────────────────────────────────────────────────
  bookings: defineTable({
    orgId: v.id("orgs"),
    customerId: v.id("customers"),
    staffId: v.id("staff_members"),
    serviceId: v.id("services"),

    // Link to opus.mk end-consumer (optional — set when booked via opus.mk)
    opusUserId: v.optional(v.id("opus_users")),

    // Slot
    startAt: v.number(),
    endAt: v.number(),

    // Pricing snapshot
    priceMinorUnits: v.number(),
    currency: v.string(),
    surgePriceApplied: v.boolean(),
    surgeMultiplierPct: v.optional(v.number()),

    // Status lifecycle
    status: v.union(
      v.literal("pending_payment"),
      v.literal("confirmed"),
      v.literal("checked_in"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show"),
    ),

    // Payment
    paymentIntentId: v.optional(v.id("payment_intents")),
    depositPaidAt: v.optional(v.number()),
    depositMinorUnits: v.optional(v.number()),

    // Booking source — includes opus channels
    source: v.union(
      v.literal("web"),          // business's own booking page
      v.literal("mobile"),       // business's own mobile app
      v.literal("opus_web"),     // opus.mk website
      v.literal("opus_app"),     // OPUS mobile app (future)
      v.literal("ai_whatsapp"),
      v.literal("ai_instagram"),
      v.literal("ai_webchat"),
      v.literal("ai_voice"),
      v.literal("manual"),
    ),
    aiConversationId: v.optional(v.id("ai_conversations")),

    // Cancellation
    cancelledAt: v.optional(v.number()),
    cancelledBy: v.optional(v.string()),
    cancellationReason: v.optional(v.string()),

    // Notes
    customerNote: v.optional(v.string()),
    staffNote: v.optional(v.string()),

    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_staff_start", ["staffId", "startAt"])           // slot conflict check
    .index("by_customer", ["customerId"])
    .index("by_org_start", ["orgId", "startAt"])               // daily schedule view
    .index("by_payment_intent", ["paymentIntentId"])
    .index("by_opus_user", ["opusUserId"]),


  // ─────────────────────────────────────────────────────
  // PAYMENT INTENTS
  // ─────────────────────────────────────────────────────
  payment_intents: defineTable({
    orgId: v.id("orgs"),
    bookingId: v.optional(v.id("bookings")),
    customerId: v.id("customers"),

    stripePaymentIntentId: v.string(),
    stripeClientSecret: v.string(),

    amountMinorUnits: v.number(),
    currency: v.string(),

    status: v.union(
      v.literal("requires_payment_method"),
      v.literal("requires_confirmation"),
      v.literal("requires_action"),
      v.literal("processing"),
      v.literal("succeeded"),
      v.literal("canceled"),
      v.literal("failed"),
    ),

    succeededAt: v.optional(v.number()),
    receiptUrl: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_stripe_id", ["stripePaymentIntentId"])
    .index("by_booking", ["bookingId"]),


  // ─────────────────────────────────────────────────────
  // PAYOUT SPLITS
  // ─────────────────────────────────────────────────────
  payout_splits: defineTable({
    orgId: v.id("orgs"),
    serviceId: v.optional(v.id("services")),

    recipients: v.array(v.object({
      type: v.union(
        v.literal("staff"),
        v.literal("owner"),
        v.literal("platform"),
      ),
      staffId: v.optional(v.id("staff_members")),
      sharePct: v.number(),
      stripeAccountId: v.optional(v.string()),
    })),

    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_service", ["orgId", "serviceId"]),


  // ─────────────────────────────────────────────────────
  // PAYOUTS
  // ─────────────────────────────────────────────────────
  payouts: defineTable({
    orgId: v.id("orgs"),
    bookingId: v.id("bookings"),
    paymentIntentId: v.id("payment_intents"),

    recipientType: v.union(
      v.literal("staff"),
      v.literal("owner"),
      v.literal("platform"),
    ),
    staffId: v.optional(v.id("staff_members")),
    stripeAccountId: v.string(),

    amountMinorUnits: v.number(),
    currency: v.string(),

    stripeTransferId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_transit"),
      v.literal("paid"),
      v.literal("failed"),
    ),

    scheduledFor: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_booking", ["bookingId"])
    .index("by_staff", ["staffId"])
    .index("by_stripe_transfer", ["stripeTransferId"]),


  // ─────────────────────────────────────────────────────
  // CUSTOMERS
  // End-clients of the business — NOT platform users.
  // Scoped per org. Link to opus_users via opusUserId when
  // the booking originated from opus.mk.
  // ─────────────────────────────────────────────────────
  customers: defineTable({
    orgId: v.id("orgs"),

    // Link to global opus.mk consumer identity (optional)
    opusUserId: v.optional(v.id("opus_users")),

    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),           // E.164
    avatarUrl: v.optional(v.string()),

    // CRM signals
    totalVisits: v.number(),
    totalSpendMinorUnits: v.number(),
    lastVisitAt: v.optional(v.number()),
    preferredStaffId: v.optional(v.id("staff_members")),

    // No-show risk
    noShowCount: v.number(),
    noShowRiskScore: v.number(),             // 0–1
    requiresFullDeposit: v.boolean(),

    // Channel preferences
    preferredChannel: v.optional(v.union(
      v.literal("whatsapp"),
      v.literal("sms"),
      v.literal("email"),
    )),
    whatsappOptIn: v.boolean(),
    marketingOptIn: v.boolean(),

    // GDPR
    gdprConsentAt: v.optional(v.number()),
    gdprErasureRequestedAt: v.optional(v.number()),

    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_email", ["orgId", "email"])
    .index("by_org_phone", ["orgId", "phone"])
    .index("by_org_risk", ["orgId", "noShowRiskScore"])
    .index("by_opus_user", ["opusUserId"])
    .searchIndex("search_by_name", {
      searchField: "name",
      filterFields: ["orgId", "isDeleted"],
    }),


  // ─────────────────────────────────────────────────────
  // CUSTOMER NOTES
  // ─────────────────────────────────────────────────────
  customer_notes: defineTable({
    orgId: v.id("orgs"),
    customerId: v.id("customers"),
    authorStaffId: v.id("staff_members"),
    note: v.string(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer", ["customerId"])
    .index("by_org", ["orgId"]),


  // ─────────────────────────────────────────────────────
  // REVIEWS
  // Consumer reviews of an org, gated on completed booking.
  // Posted by opus_users. Owner can reply.
  // ─────────────────────────────────────────────────────
  reviews: defineTable({
    orgId: v.id("orgs"),
    opusUserId: v.id("opus_users"),          // global consumer who left the review
    customerId: v.id("customers"),           // their org-scoped CRM link (for verification)

    // Must reference a completed booking — enforces verified-purchase gate
    bookingId: v.optional(v.id("bookings")),
    reservationId: v.optional(v.id("reservations")),

    rating: v.number(),                      // 1–5 integer
    body: v.optional(v.string()),            // review text

    // Owner response
    reply: v.optional(v.string()),
    repliedAt: v.optional(v.number()),
    repliedByStaffId: v.optional(v.id("staff_members")),

    // Moderation
    isPublished: v.boolean(),               // default false; published after moderation or immediately
    publishedAt: v.optional(v.number()),

    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_published", ["orgId", "isPublished"])
    .index("by_opus_user", ["opusUserId"])
    .index("by_booking", ["bookingId"])
    .index("by_reservation", ["reservationId"]),


  // ─────────────────────────────────────────────────────
  // AI CONVERSATIONS
  // ─────────────────────────────────────────────────────
  ai_conversations: defineTable({
    orgId: v.id("orgs"),
    customerId: v.optional(v.id("customers")),

    channel: v.union(
      v.literal("whatsapp"),
      v.literal("instagram"),
      v.literal("voice"),
      v.literal("webchat"),
    ),
    channelThreadId: v.string(),

    status: v.union(
      v.literal("active"),
      v.literal("handed_off"),
      v.literal("resolved"),
    ),

    handedOffAt: v.optional(v.number()),
    handoffReason: v.optional(v.string()),
    handoffReviewedBy: v.optional(v.id("staff_members")),

    bookingIds: v.array(v.id("bookings")),

    totalInputTokens: v.number(),
    totalOutputTokens: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_channel_thread", ["channel", "channelThreadId"])
    .index("by_customer", ["customerId"]),


  // ─────────────────────────────────────────────────────
  // AI MESSAGES
  // ─────────────────────────────────────────────────────
  ai_messages: defineTable({
    orgId: v.id("orgs"),
    conversationId: v.id("ai_conversations"),

    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
    ),
    content: v.string(),

    model: v.optional(v.string()),
    confidenceScore: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),

    actionType: v.optional(v.union(
      v.literal("booking_created"),
      v.literal("booking_cancelled"),
      v.literal("booking_rescheduled"),
      v.literal("payment_link_sent"),
      v.literal("handoff_triggered"),
    )),
    actionReferenceId: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_org", ["orgId"]),


  // ─────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────────────
  notifications: defineTable({
    orgId: v.id("orgs"),
    customerId: v.optional(v.id("customers")),
    bookingId: v.optional(v.id("bookings")),

    channel: v.union(
      v.literal("sms"),
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("push"),
    ),
    type: v.union(
      v.literal("booking_confirmation"),
      v.literal("booking_reminder"),
      v.literal("booking_cancelled"),
      v.literal("deposit_request"),
      v.literal("receipt"),
      v.literal("review_request"),
      v.literal("no_show_warning"),
    ),

    recipientAddress: v.string(),
    templateData: v.any(),

    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
    ),
    scheduledFor: v.number(),
    sentAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    externalMessageId: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_status_scheduled", ["status", "scheduledFor"])
    .index("by_booking", ["bookingId"]),


  // ─────────────────────────────────────────────────────
  // DASHBOARD NOTIFICATIONS
  // In-app notifications shown in the navbar bell.
  // Separate from the `notifications` table (external SMS/Email delivery queue).
  // ─────────────────────────────────────────────────────
  dashboard_notifications: defineTable({
    orgId: v.id("orgs"),
    type: v.union(
      v.literal("new_booking"),
      v.literal("booking_cancelled"),
      v.literal("no_show"),
    ),
    title: v.string(),
    body: v.string(),
    bookingId: v.optional(v.id("bookings")),
    customerId: v.optional(v.id("customers")),
    isRead: v.boolean(),
    isDismissed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_org_created", ["orgId", "createdAt"])
    .index("by_org_unread", ["orgId", "isRead"]),

  // ─────────────────────────────────────────────────────
  // AUDIT LOG
  // Append-only. Never update or delete rows.
  // ─────────────────────────────────────────────────────
  audit_log: defineTable({
    orgId: v.id("orgs"),

    actorType: v.union(
      v.literal("user"),
      v.literal("staff"),
      v.literal("ai"),
      v.literal("system"),
      v.literal("webhook"),
      v.literal("opus_user"),              // end-consumer actions (book, cancel, review)
    ),
    actorId: v.optional(v.string()),

    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),

    before: v.optional(v.any()),
    after: v.optional(v.any()),

    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_action", ["orgId", "action"])
    .index("by_resource", ["resourceType", "resourceId"]),


  // ═══════════════════════════════════════════════════════
  // HOSPITALITY VERTICAL
  // ═══════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────
  // FLOOR PLANS
  // ─────────────────────────────────────────────────────
  floor_plans: defineTable({
    orgId: v.id("orgs"),
    name: v.string(),

    canvasWidth: v.number(),
    canvasHeight: v.number(),

    backgroundImageUrl: v.optional(v.string()),
    backgroundImageOpacity: v.optional(v.number()),

    isActive: v.boolean(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_active", ["orgId", "isActive"]),


  // ─────────────────────────────────────────────────────
  // TABLES
  // ─────────────────────────────────────────────────────
  tables: defineTable({
    orgId: v.id("orgs"),
    floorPlanId: v.id("floor_plans"),

    label: v.string(),
    capacity: v.number(),
    minCapacity: v.optional(v.number()),

    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    rotation: v.number(),
    shape: v.union(
      v.literal("rectangle"),
      v.literal("circle"),
      v.literal("booth"),
    ),

    status: v.union(
      v.literal("available"),
      v.literal("reserved"),
      v.literal("occupied"),
      v.literal("cleaning"),
      v.literal("inactive"),
    ),

    combinationGroupId: v.optional(v.string()),

    sortOrder: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_floor_plan", ["floorPlanId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_floor_plan_status", ["floorPlanId", "status"]),


  // ─────────────────────────────────────────────────────
  // RESERVATION SETTINGS
  // ─────────────────────────────────────────────────────
  reservation_settings: defineTable({
    orgId: v.id("orgs"),

    bookingWindowDays: v.number(),
    minAdvanceBookingHours: v.number(),
    maxAdvanceBookingDays: v.optional(v.number()),

    minPartySize: v.number(),
    maxPartySize: v.number(),

    defaultDurationMins: v.number(),
    minDurationMins: v.number(),
    maxDurationMins: v.number(),

    slotIntervalMins: v.number(),

    servicePeriods: v.optional(v.array(v.object({
      name: v.string(),
      startTime: v.string(),
      endTime: v.string(),
      daysOfWeek: v.array(v.number()),
    }))),

    walkInsAccepted: v.boolean(),
    walkInBufferMins: v.number(),

    depositRequired: v.boolean(),
    depositAmountMinorUnits: v.optional(v.number()),

    confirmationMessage: v.optional(v.string()),
    reminderHoursBefore: v.array(v.number()),

    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"]),


  // ─────────────────────────────────────────────────────
  // RESERVATIONS
  // Core transaction for hospitality. Equivalent to bookings in beauty.
  // ─────────────────────────────────────────────────────
  reservations: defineTable({
    orgId: v.id("orgs"),
    floorPlanId: v.id("floor_plans"),
    tableId: v.id("tables"),
    customerId: v.id("customers"),

    // Link to opus.mk end-consumer (optional)
    opusUserId: v.optional(v.id("opus_users")),

    startAt: v.number(),
    durationMins: v.number(),
    endAt: v.number(),

    partySize: v.number(),
    specialRequests: v.optional(v.string()),
    occasion: v.optional(v.union(
      v.literal("birthday"),
      v.literal("anniversary"),
      v.literal("business"),
      v.literal("date"),
      v.literal("other"),
    )),

    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("seated"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show"),
    ),

    // Source — includes opus channels
    source: v.union(
      v.literal("web"),          // venue's own booking page
      v.literal("manual"),
      v.literal("walk_in"),
      v.literal("phone"),
      v.literal("opus_web"),     // opus.mk website
      v.literal("opus_app"),     // OPUS mobile app (future)
      v.literal("ai"),
    ),

    paymentIntentId: v.optional(v.id("payment_intents")),
    depositPaidAt: v.optional(v.number()),
    depositMinorUnits: v.optional(v.number()),

    cancelledAt: v.optional(v.number()),
    cancelledBy: v.optional(v.string()),
    cancellationReason: v.optional(v.string()),

    staffNote: v.optional(v.string()),

    autoAssigned: v.boolean(),
    assignmentScore: v.optional(v.number()),

    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_table_start", ["tableId", "startAt"])           // conflict check
    .index("by_org_start", ["orgId", "startAt"])               // daily schedule view
    .index("by_customer", ["customerId"])
    .index("by_floor_plan", ["floorPlanId"])
    .index("by_payment_intent", ["paymentIntentId"])
    .index("by_opus_user", ["opusUserId"]),

});