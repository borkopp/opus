import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { components } from "../_generated/api";
import type { CleanupLine } from "../../../shared/owner-controls";

// Deliberately explicit. New tenant tables must receive a cleanup/retention policy.
export const CLEANUP_TABLES = {
  org_settings: "Studio settings",
  website_designs: "Website drafts and translations",
  org_media: "Gallery and cover image records",
  services: "Services",
  service_categories: "Service categories",
  service_imports: "Service photo imports",
  staff_members: "Staff profiles and access",
  staff_invites: "Staff invitations",
  availability_rules: "Working hours",
  availability_overrides: "Time off and availability overrides",
  bookings: "Appointments without a client-account link",
  customers: "Studio customer records without a client-account link",
  customer_notes: "Private customer notes",
  reviews: "Studio reviews",
  saved_replies: "Saved replies",
  analyst_conversations: "AI Assistant conversations",
  analyst_turns: "AI Assistant prompts and reports",
  analyst_usage: "AI Assistant usage counters",
  analyst_schedule_versions: "AI Assistant schedule history",
  ai_conversations: "AI Receptionist conversations",
  ai_messages: "AI Receptionist messages",
  ai_instagram_connections: "Instagram connection credentials",
  ai_daily_usage: "AI Receptionist usage",
  notifications: "Notifications and pending deliveries",
  staff_notification_preferences: "Staff notification preferences",
  staff_push_devices: "Staff push subscriptions",
  booking_email_verifications: "Booking verification codes",
  dashboard_notifications: "Dashboard notifications",
  dashboard_notification_states: "Notification read states",
  dashboard_inbox_states: "Inbox states",
  gap_suggestions: "Opening suggestions",
  gap_outreach_candidates: "Recovery offers and links",
  billing_accounts: "Closed billing connections",
  billing_webhook_events: "Billing webhook receipts",
  marketplace_embeddings: "Studio search embeddings",
  audit_log: "Audit history",
  floor_plans: "Retained legacy floor plans",
  tables: "Retained legacy tables",
  reservation_settings: "Retained legacy reservation settings",
  reservations: "Retained legacy reservations",
} as const;
type CleanupTable = keyof typeof CLEANUP_TABLES;
type Records = { [T in CleanupTable]: Doc<T>[] };
const LEGACY_TABLES = [
  "floor_plans",
  "tables",
  "reservation_settings",
  "reservations",
] as const;
const MAX_RECORDS = 2_000;
const MAX_BYTES = 4_000_000;

async function recordsFor(ctx: QueryCtx, orgId: Id<"orgs">) {
  const entries = [];
  let count = 0,
    bytes = 0;
  for (const table of Object.keys(CLEANUP_TABLES) as CleanupTable[]) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .take(MAX_RECORDS - count + 1);
    count += rows.length;
    bytes += new TextEncoder().encode(JSON.stringify(rows)).byteLength;
    if (count > MAX_RECORDS || bytes > MAX_BYTES)
      throw new ConvexError(
        "This studio exceeds the safe cleanup size (2,000 records / 4 MB). No data was deleted; use a reviewed operator cleanup.",
      );
    entries.push([table, rows]);
  }
  return Object.fromEntries(entries) as Records;
}

/** Reference-prefix lookups conservatively protect other tenants and global identities, even deleted ones.
 * This narrowly scoped owner-only exception never returns their data to the browser. */
async function sharedImage(
  ctx: QueryCtx,
  orgId: Id<"orgs">,
  reference: string,
) {
  const others = await Promise.all([
    ctx.db
      .query("orgs")
      .withIndex("by_image_reference", (q) =>
        q.gte("logoUrl", reference).lt("logoUrl", reference + "\uffff"),
      )
      .take(101),
    ctx.db
      .query("org_media")
      .withIndex("by_image_reference", (q) =>
        q.gte("url", reference).lt("url", reference + "\uffff"),
      )
      .take(101),
    ctx.db
      .query("services")
      .withIndex("by_image_reference", (q) =>
        q.gte("photoUrl", reference).lt("photoUrl", reference + "\uffff"),
      )
      .take(101),
    ctx.db
      .query("staff_members")
      .withIndex("by_image_reference", (q) =>
        q.gte("avatarUrl", reference).lt("avatarUrl", reference + "\uffff"),
      )
      .take(101),
    ctx.db
      .query("customers")
      .withIndex("by_image_reference", (q) =>
        q.gte("avatarUrl", reference).lt("avatarUrl", reference + "\uffff"),
      )
      .take(101),
  ]);
  if (
    others.some(
      (rows) =>
        rows.length > 100 ||
        rows.some((row) => ("orgId" in row ? row.orgId : row._id) !== orgId),
    )
  )
    return true;
  const identities = await Promise.all([
    ctx.db
      .query("users")
      .withIndex("by_image_reference", (q) =>
        q.gte("avatarUrl", reference).lt("avatarUrl", reference + "\uffff"),
      )
      .first(),
    ctx.db
      .query("opus_users")
      .withIndex("by_image_reference", (q) =>
        q.gte("avatarUrl", reference).lt("avatarUrl", reference + "\uffff"),
      )
      .first(),
  ]);
  return identities.some(Boolean);
}

async function images(ctx: QueryCtx, org: Doc<"orgs">, records: Records) {
  const references = new Set<string>();
  if (org.logoUrl) references.add(org.logoUrl);
  for (const row of records.org_media) references.add(row.url);
  for (const row of records.services)
    if (row.photoUrl) references.add(row.photoUrl);
  for (const row of [...records.staff_members, ...records.customers])
    if (row.avatarUrl) references.add(row.avatarUrl);
  // Old replaced uploads can still be attributed through known image fields in audit snapshots.
  for (const row of records.audit_log)
    for (const snapshot of [row.before, row.after]) {
      if (!snapshot || typeof snapshot !== "object") continue;
      for (const key of ["logoUrl", "avatarUrl", "photoUrl", "url"]) {
        const value: unknown = snapshot[key];
        if (typeof value === "string") references.add(value);
      }
    }
  if (references.size > 100)
    throw new ConvexError(
      "Too many image references for an automatic cleanup. No data was deleted; use a reviewed operator cleanup.",
    );
  if (!references.size) return { remove: [], shared: 0, unmatched: 0 };
  // Identity roots span tenants. The auth component's named `name` index permits
  // one bounded page; select only images, never credentials or contact data.
  // This also protects avatars not yet mirrored into an application profile.
  const accounts = await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: "user",
    where: [{ field: "name", operator: "gte", value: "" }],
    select: ["image"],
    paginationOpts: { numItems: 1_001, cursor: null },
  });
  if (!accounts.isDone || accounts.page.length > 1_000)
    throw new ConvexError(
      "Too many sign-in profiles for automatic image ownership checks. No data was deleted; use a reviewed operator cleanup.",
    );
  const accountImages: string[] = accounts.page.flatMap(
    (account: { image?: string | null }) =>
      account.image ? [account.image] : [],
  );
  // Match actual storage URLs, never assume the token in a URL is a storage ID.
  const files = await ctx.db.system.query("_storage").take(2_001);
  if (files.length > 2_000)
    throw new ConvexError(
      "Storage exceeds the safe automatic inspection size. No data was deleted; use a reviewed operator cleanup.",
    );
  const remove: Id<"_storage">[] = [];
  let shared = 0;
  const matched = new Set<string>();
  for (const file of files) {
    const url = await ctx.storage.getUrl(file._id);
    if (!references.has(file._id) && (!url || !references.has(url))) continue;
    matched.add(file._id);
    if (url) matched.add(url);
    if (
      accountImages.some(
        (image) => image.startsWith(file._id) || (url && image.startsWith(url)),
      ) ||
      (await sharedImage(ctx, org._id, file._id)) ||
      (url && (await sharedImage(ctx, org._id, url)))
    )
      shared++;
    else remove.push(file._id);
  }
  return {
    remove,
    shared,
    unmatched: [...references].filter((value) => !matched.has(value)).length,
  };
}

export async function cleanupPlan(ctx: QueryCtx, org: Doc<"orgs">) {
  const records = await recordsFor(ctx, org._id);
  const linkedCustomers = new Set(
    records.customers.filter((c) => c.opusUserId).map((c) => c._id),
  );
  const bookings = records.bookings.filter(
    (b) => b.opusUserId || linkedCustomers.has(b.customerId),
  );
  const customerIds = new Set([
    ...linkedCustomers,
    ...bookings.map((b) => b.customerId),
  ]);
  const staffIds = new Set(bookings.map((b) => b.staffId));
  const serviceIds = new Set(
    bookings.flatMap((b) => [b.serviceId, ...(b.serviceIds ?? [])]),
  );
  const keep = new Set<string>([
    ...bookings.map((b) => b._id),
    ...customerIds,
    ...staffIds,
    ...serviceIds,
    ...records.audit_log.map((r) => r._id),
    ...LEGACY_TABLES.flatMap((t) => records[t].map((r) => r._id)),
  ]);
  const files = await images(ctx, org, records);
  const users = await ctx.db
    .query("users")
    .withIndex("by_active_org", (q) => q.eq("activeOrgId", org._id))
    .take(101);
  if (users.length > 100)
    throw new ConvexError(
      "Too many linked staff accounts for automatic cleanup.",
    );
  const blockers: string[] = [];
  if (
    records.billing_accounts.some(
      (b) =>
        b.hasOpenSubscription ||
        (b.checkoutLockUntil ?? 0) > Date.now() ||
        (b.checkoutExpiresAt ?? 0) > Date.now(),
    )
  )
    blockers.push(
      "Close the Polar subscription and let any open checkout expire before deleting this studio. Deleting OPUS data does not cancel provider billing.",
    );
  if (
    records.analyst_turns.some(
      (t) => t.status === "pending" || t.status === "running",
    ) ||
    records.analyst_usage.some((u) => u.reservedMicroUsd > 0)
  )
    blockers.push(
      "An AI Assistant response is in progress. Wait for it to finish and refresh this preview.",
    );
  if (
    records.notifications.some((n) => n.processingStartedAt !== undefined) ||
    records.ai_messages.some(
      (m) =>
        m.processingStatus === "processing" || m.deliveryStatus === "sending",
    )
  )
    blockers.push(
      "A message is being processed. Wait for delivery to finish and refresh this preview.",
    );
  if (
    records.service_imports.some((r) => r.status === "extracting") ||
    records.website_designs.some((r) => r.translationStatus === "queued")
  )
    blockers.push(
      "An import or website translation is in progress. Wait for it to finish and refresh this preview.",
    );
  if (LEGACY_TABLES.some((t) => records[t].length))
    blockers.push(
      "This studio contains retained legacy data and needs a separate operator review.",
    );
  const remove: CleanupLine[] = Object.entries(CLEANUP_TABLES)
    .map(([key, label]) => ({
      key,
      label,
      count: records[key as CleanupTable].filter((r) => !keep.has(r._id))
        .length,
    }))
    .filter((row) => row.count > 0);
  remove.unshift({
    key: "website",
    label: "Live studio website and business profile",
    count: 1,
  });
  remove.push({
    key: "files",
    label: "Exclusively linked stored images (including old linked uploads)",
    count: files.remove.length,
  });
  const retain: CleanupLine[] = [
    {
      key: "bookings",
      label: "Appointments linked to client accounts",
      count: bookings.length,
    },
    {
      key: "customers",
      label: "Client links and appointment customer records",
      count: records.customers.filter((c) => customerIds.has(c._id)).length,
    },
    {
      key: "staff",
      label: "Minimal staff names for appointment history (access removed)",
      count: records.staff_members.filter((s) => staffIds.has(s._id)).length,
    },
    {
      key: "services",
      label: "Minimal service details for appointment history",
      count: records.services.filter((s) => serviceIds.has(s._id)).length,
    },
    {
      key: "audit",
      label: "Existing audit records",
      count: records.audit_log.length,
    },
    {
      key: "sharedFiles",
      label: "Stored images shared with other studios or accounts",
      count: files.shared,
    },
  ];
  const notes = [
    "All client accounts and sign-in identities are kept. Staff lose access to this studio; their other studios are unchanged.",
    "Linked appointments stay in client history. Confirmed and checked-in appointments are cancelled without sending messages. Their automatic completion jobs are cancelled.",
    "A minimal deleted-studio record, its reserved slug, audit history and cleanup receipt are kept for historical links.",
    "External images and unattached uploads with no attributable reference cannot be erased by this cleanup. Provider-held billing and message records are unchanged.",
  ];
  if (files.unmatched)
    notes.push(
      `${files.unmatched} image references are external or no longer resolve to a stored file; their studio references will be removed.`,
    );
  // Every reviewed record participates, so new/changed bookings and media invalidate confirmation.
  const source = JSON.stringify({
    org,
    records,
    files,
    users: users.map((u) => [u._id, u.activeOrgId]),
    blockers,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(source),
  );
  const fingerprint = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return {
    records,
    keep,
    files,
    users,
    remove,
    retain,
    blockers,
    notes,
    fingerprint,
  };
}
