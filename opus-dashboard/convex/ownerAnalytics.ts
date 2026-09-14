import { makeFunctionReference } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { BusinessUsage, OwnerOverview } from "../../shared/owner-overview";
import { action, internalQuery, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requirePlatformOwner } from "./lib/ownerAuth";

// Explicit platform-owner reporting exception: enumerate the organization roots
// and storage metadata only here. Every tenant-table read still uses by_org.
// Internal queries cannot be called by a browser; each also rechecks the session.
const cursorValidator = v.union(v.string(), v.null());
type Cursor = string | null;
type Page<T> = { page: T[]; continueCursor: string; isDone: boolean };
type OrgSummary = Pick<
  Doc<"orgs">,
  "_id" | "name" | "slug" | "createdAt" | "plan"
> & {
  city: string | null;
  websiteStatus: BusinessUsage["websiteStatus"];
  logoUrl: string | null;
};
const entityTables = [
  "services",
  "staff_members",
  "customers",
  "bookings",
  "org_media",
] as const;
type EntityTable = (typeof entityTables)[number];
type EntityPage = {
  count: number;
  bookings30d: number;
  cancelled30d: number;
  references: string[];
  continueCursor: string;
  isDone: boolean;
};
type FileSummary = {
  id: string;
  url: string | null;
  bytes: number;
  image: boolean;
};

// Name-based typed references let the independent owner app deploy without
// importing the dashboard or modifying Convex's generated files.
const orgPageRef = makeFunctionReference<
  "query",
  { cursor: Cursor },
  Page<OrgSummary>
>("ownerAnalytics:readOrganizations");
const entityPageRef = makeFunctionReference<
  "query",
  {
    orgId: Id<"orgs">;
    table: EntityTable;
    cursor: Cursor;
    since: number;
    until: number;
  },
  EntityPage
>("ownerAnalytics:readEntities");
const storagePageRef = makeFunctionReference<
  "query",
  { cursor: Cursor },
  Page<FileSummary>
>("ownerAnalytics:readStorage");

export const access = query({
  args: {},
  handler: async (ctx) => {
    const user = await requirePlatformOwner(ctx);
    return { email: user.email };
  },
});

export const readOrganizations = internalQuery({
  args: { cursor: cursorValidator },
  handler: async (ctx, args): Promise<Page<OrgSummary>> => {
    await requirePlatformOwner(ctx);
    const result = await ctx.db
      .query("orgs")
      .withIndex("by_industry_created", (q) =>
        q.eq("industry", "beauty_wellness"),
      )
      .order("desc")
      .paginate({
        cursor: args.cursor,
        numItems: 50,
        maximumBytesRead: 1_000_000,
      });
    return {
      ...result,
      page: result.page
        .filter(
          (org) =>
            !org.isDeleted &&
            (org.source !== "scraped" || org.claimStatus === "claimed"),
        )
        .map((org) => ({
          _id: org._id,
          name: org.name,
          slug: org.slug,
          createdAt: org.createdAt,
          plan: org.plan,
          city: org.city ?? null,
          logoUrl: org.logoUrl ?? null,
          websiteStatus: org.websiteStatus ?? "unpublished",
        })),
    };
  },
});

export const readEntities = internalQuery({
  args: {
    orgId: v.id("orgs"),
    table: v.union(
      v.literal("services"),
      v.literal("staff_members"),
      v.literal("customers"),
      v.literal("bookings"),
      v.literal("org_media"),
    ),
    cursor: cursorValidator,
    since: v.number(),
    until: v.number(),
  },
  handler: async (ctx, args): Promise<EntityPage> => {
    await requirePlatformOwner(ctx);
    const result = await ctx.db
      .query(args.table)
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .paginate({
        cursor: args.cursor,
        numItems: 200,
        maximumBytesRead: 1_000_000,
      });
    let count = 0,
      bookings30d = 0,
      cancelled30d = 0;
    const references = new Set<string>();
    for (const row of result.page) {
      if (row.isDeleted) continue;
      // Services/staff mean usable current resources; customers/bookings are
      // all retained non-deleted records. Include current customer avatars too.
      if (!("isActive" in row) || row.isActive) count++;
      if (
        "status" in row &&
        "startAt" in row &&
        row.createdAt >= args.since &&
        row.createdAt <= args.until
      ) {
        bookings30d++;
        if (row.status === "cancelled") cancelled30d++;
      }
      if ("photoUrl" in row && row.photoUrl) references.add(row.photoUrl);
      if ("avatarUrl" in row && row.avatarUrl) references.add(row.avatarUrl);
      if ("url" in row) references.add(row.url);
    }
    return {
      count,
      bookings30d,
      cancelled30d,
      references: [...references],
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const readStorage = internalQuery({
  args: { cursor: cursorValidator },
  handler: async (ctx, args): Promise<Page<FileSummary>> => {
    await requirePlatformOwner(ctx);
    // _storage is Convex's global system table and has no tenant index.
    const result = await ctx.db.system
      .query("_storage")
      .paginate({
        cursor: args.cursor,
        numItems: 250,
        maximumBytesRead: 1_000_000,
      });
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (file) => ({
          id: file._id,
          url: await ctx.storage.getUrl(file._id),
          bytes: file.size,
          image: file.contentType?.startsWith("image/") ?? false,
        })),
      ),
    };
  },
});

function canonicalReference(reference: string): string {
  try {
    const url = new URL(reference);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return reference;
  }
}

export const overview = action({
  args: {},
  handler: async (ctx): Promise<OwnerOverview> => {
    await requirePlatformOwner(ctx);
    const startedAt = Date.now();
    const since = startedAt - 30 * 86_400_000;
    const businesses: BusinessUsage[] = [];
    const linkedFiles = new Map<string, number>();
    const externalImages = new Set<string>();
    const missingImages = new Set<string>();
    const filesByReference = new Map<string, FileSummary>();
    const storageOrigins = new Set<string>();
    let reads = 0;
    const checkBudget = () => {
      // Fail visibly instead of returning a truncated total. This bounds the
      // cost of an accidental huge deployment scan; there is no live polling.
      if (++reads > 10_000 || Date.now() - startedAt > 480_000) {
        throw new ConvexError(
          "This overview is too large for an on-demand scan. Add scheduled usage snapshots before retrying.",
        );
      }
    };
    let storedFiles = 0,
      storedBytes = 0,
      storedImages = 0,
      storedImageBytes = 0;
    let storageCursor: Cursor = null;
    do {
      checkBudget();
      const result: Page<FileSummary> = await ctx.runQuery(storagePageRef, {
        cursor: storageCursor,
      });
      for (const file of result.page) {
        filesByReference.set(file.id, file);
        if (file.url) {
          filesByReference.set(canonicalReference(file.url), file);
          storageOrigins.add(new URL(file.url).origin);
        }
        storedFiles++;
        storedBytes += file.bytes;
        if (file.image) {
          storedImages++;
          storedImageBytes += file.bytes;
        }
      }
      storageCursor = result.isDone ? null : result.continueCursor;
    } while (storageCursor !== null);

    let orgCursor: Cursor = null;
    do {
      checkBudget();
      const orgs: Page<OrgSummary> = await ctx.runQuery(orgPageRef, {
        cursor: orgCursor,
      });
      for (const org of orgs.page) {
        const row: BusinessUsage = {
          id: org._id,
          name: org.name,
          slug: org.slug,
          city: org.city,
          createdAt: org.createdAt,
          plan: org.plan,
          websiteStatus: org.websiteStatus,
          services: 0,
          staff: 0,
          customers: 0,
          bookings: 0,
          bookings30d: 0,
          cancelled30d: 0,
          images: 0,
          imageBytes: 0,
          externalImages: 0,
          missingImages: 0,
        };
        const references = new Set<string>(org.logoUrl ? [org.logoUrl] : []);
        for (const table of entityTables) {
          let cursor: Cursor = null;
          do {
            checkBudget();
            const result: EntityPage = await ctx.runQuery(entityPageRef, {
              orgId: org._id,
              table,
              cursor,
              since,
              until: startedAt,
            });
            if (table === "services") row.services += result.count;
            if (table === "staff_members") row.staff += result.count;
            if (table === "customers") row.customers += result.count;
            if (table === "bookings") {
              row.bookings += result.count;
              row.bookings30d += result.bookings30d;
              row.cancelled30d += result.cancelled30d;
            }
            result.references.forEach((reference) => references.add(reference));
            cursor = result.isDone ? null : result.continueCursor;
          } while (cursor !== null);
        }
        const businessFiles = new Set<string>();
        const businessExternal = new Set<string>();
        const businessMissing = new Set<string>();
        for (const reference of references) {
          const key = canonicalReference(reference);
          const file = filesByReference.get(key);
          if (!file) {
            let missing = false;
            try {
              const url = new URL(key);
              missing =
                storageOrigins.has(url.origin) &&
                url.pathname.startsWith("/api/storage/");
            } catch {
              /* Unknown legacy reference; its size cannot be measured. */
            }
            if (missing) {
              businessMissing.add(key);
              missingImages.add(key);
            } else {
              businessExternal.add(key);
              externalImages.add(key);
            }
          } else if (!businessFiles.has(file.id)) {
            businessFiles.add(file.id);
            row.imageBytes += file.bytes;
            linkedFiles.set(file.id, file.bytes);
          }
        }
        row.images = businessFiles.size;
        row.externalImages = businessExternal.size;
        row.missingImages = businessMissing.size;
        businesses.push(row);
      }
      orgCursor = orgs.isDone ? null : orgs.continueCursor;
    } while (orgCursor !== null);

    const sum = (
      key:
        | "services"
        | "staff"
        | "customers"
        | "bookings"
        | "bookings30d"
        | "cancelled30d",
    ) => businesses.reduce((total, row) => total + row[key], 0);
    const signups = Array.from({ length: 6 }, (_, index) => {
      const now = new Date(startedAt);
      const month = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1),
      )
        .toISOString()
        .slice(0, 7);
      return {
        month,
        count: businesses.filter(
          (row) => new Date(row.createdAt).toISOString().slice(0, 7) === month,
        ).length,
      };
    });
    // A revoked session during a long collection must not receive its result.
    await requirePlatformOwner(ctx);
    return {
      startedAt,
      completedAt: Date.now(),
      businesses,
      signups,
      totals: {
        businesses: businesses.length,
        newBusinesses30d: businesses.filter(
          (row) => row.createdAt >= since && row.createdAt <= startedAt,
        ).length,
        published: businesses.filter((row) => row.websiteStatus === "published")
          .length,
        suspended: businesses.filter((row) => row.websiteStatus === "suspended")
          .length,
        paid: businesses.filter((row) => row.plan === "paid").length,
        services: sum("services"),
        staff: sum("staff"),
        customers: sum("customers"),
        bookings: sum("bookings"),
        bookings30d: sum("bookings30d"),
        cancelled30d: sum("cancelled30d"),
        activeBusinesses30d: businesses.filter((row) => row.bookings30d > 0)
          .length,
        linkedImages: linkedFiles.size,
        linkedImageBytes: [...linkedFiles.values()].reduce(
          (total, bytes) => total + bytes,
          0,
        ),
        externalImages: externalImages.size,
        missingImages: missingImages.size,
        storedFiles,
        storedBytes,
        storedImages,
        storedImageBytes,
      },
    };
  },
});
