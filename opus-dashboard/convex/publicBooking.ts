import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { computeSlotsForDate } from "./slots";
import { isActiveIndustry } from "./lib/productScope";
import { ensureCurrentOpusUser } from "./lib/opusUserAuth";

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC BOOKING — opus.mk
// ─────────────────────────────────────────────────────────────────────────────
//
// This mutation is called by unauthenticated visitors on opus.mk.
// It creates a customer record (or finds an existing one by phone)
// and then creates a booking — essentially combining customer upsert + booking
// creation in a single atomic transaction.
//
// Guests remain supported. Signed-in identity is derived server-side.
// ─────────────────────────────────────────────────────────────────────────────

export const createPublicBooking = mutation({
    args: {
        orgId: v.id("orgs"),
        serviceId: v.id("services"),
        staffId: v.id("staff_members"),
        startAt: v.number(),        // Unix ms
        customerName: v.string(),
        customerPhone: v.string(),  // Required
        customerEmail: v.optional(v.string()),
        customerNote: v.optional(v.string()),
        paymentMethod: v.union(
            v.literal("cash"),
            v.literal("online"),     // Coming soon; rejected for now
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const opusUserId = identity
            ? (await ensureCurrentOpusUser(ctx))._id
            : undefined;

        // ── Validate org is published ──
        const org = await ctx.db.get(args.orgId);
        if (
            !org ||
            org.isDeleted ||
            org.listingStatus !== "published" ||
            !isActiveIndustry(org.industry)
        ) {
            throw new ConvexError("This business is not currently accepting bookings.");
        }

        // ── Payment method guard ──
        if (args.paymentMethod === "online") {
            throw new ConvexError("Online payment is coming soon. Please select 'Pay in cash'.");
        }

        // ── Validate service ──
        const service = await ctx.db.get(args.serviceId);
        if (!service || service.orgId !== args.orgId || service.isDeleted || !service.isActive || !service.isOpusVisible) {
            throw new ConvexError("Service not available.");
        }

        // ── Validate staff ──
        const staff = await ctx.db.get(args.staffId);
        if (!staff || staff.orgId !== args.orgId || staff.isDeleted || !staff.isActive) {
            throw new ConvexError("Staff member not available.");
        }

        if (!service.staffIds.includes(args.staffId)) {
            throw new ConvexError("This staff member cannot perform this service.");
        }

        const bookingDate = new Date(args.startAt).toISOString().slice(0, 10);
        const availableSlots = await computeSlotsForDate(
            ctx,
            args.orgId,
            args.staffId,
            args.serviceId,
            bookingDate,
        );
        if (!availableSlots.some((slot) => slot.startAt === args.startAt)) {
            throw new ConvexError("This time slot is outside working hours or no longer available.");
        }

        // ── Org settings ──
        const orgSettings = await ctx.db
            .query("org_settings")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .first();
        if (!orgSettings) throw new ConvexError("Organization settings not found.");

        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: orgSettings.timezone || "Europe/Belgrade",
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hourCycle: "h23"
        }).formatToParts(new Date());

        let year, month, day, hour, minute, second;
        for (const p of parts) {
            if (p.type === 'year') year = p.value;
            if (p.type === 'month') month = p.value;
            if (p.type === 'day') day = p.value;
            if (p.type === 'hour') hour = p.value;
            if (p.type === 'minute') minute = p.value;
            if (p.type === 'second') second = p.value;
        }
        const pseudoUtcNow = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).getTime();

        // ── Validate time ──
        if (args.startAt <= pseudoUtcNow) {
            throw new ConvexError("Booking time must be in the future.");
        }

        // ── Conflict check ──
        const endAt = args.startAt + service.durationMins * 60 * 1000;
        const midnightMs = new Date(
            new Date(args.startAt).toISOString().split("T")[0] + "T00:00:00Z"
        ).getTime();
        const nextMidnightMs = midnightMs + 24 * 60 * 60 * 1000;

        const existingBookings = await ctx.db
            .query("bookings")
            .withIndex("by_staff_start", (q) =>
                q.eq("staffId", args.staffId).gte("startAt", midnightMs).lt("startAt", nextMidnightMs)
            )
            .filter((q) =>
                q.and(
                    q.eq(q.field("isDeleted"), false),
                    q.neq(q.field("status"), "cancelled"),
                )
            )
            .collect();

        const bufferMs = (orgSettings.bufferTimeMins || 0) * 60 * 1000;
        const conflict = existingBookings.find((b) => {
            const existingEnd = b.endAt + bufferMs;
            return b.startAt < endAt && existingEnd > args.startAt;
        });

        if (conflict) {
            throw new ConvexError("This time slot is no longer available. Please choose another.");
        }

        // ── Customer upsert by phone ──
        const normalizedPhone = args.customerPhone.replace(/\s/g, "");
        const customer = await ctx.db
            .query("customers")
            .withIndex("by_org_phone", (q) => q.eq("orgId", args.orgId).eq("phone", normalizedPhone))
            .first();

        if (
            opusUserId &&
            customer?.opusUserId &&
            customer.opusUserId !== opusUserId
        ) {
            throw new ConvexError("This phone number is linked to another account.");
        }

        let customerId;
        if (customer && !customer.isDeleted) {
            customerId = customer._id;
            // Update name/email if provided
            await ctx.db.patch(customerId, {
                name: args.customerName,
                ...(args.customerEmail ? { email: args.customerEmail } : {}),
                updatedAt: Date.now(),
            });
        } else {
            customerId = await ctx.db.insert("customers", {
                orgId: args.orgId,
                name: args.customerName,
                phone: normalizedPhone,
                email: args.customerEmail,
                opusUserId,
                totalVisits: 0,
                totalSpendMinorUnits: 0,
                noShowCount: 0,
                noShowRiskScore: 0,
                requiresFullDeposit: false,
                whatsappOptIn: false,
                marketingOptIn: false,
                isDeleted: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        // If opusUserId is provided, also link it to existing customer
        if (opusUserId && customer && !customer.opusUserId) {
            await ctx.db.patch(customerId, { opusUserId, updatedAt: Date.now() });
        }

        // ── Surge pricing snapshot ──
        let priceMinorUnits = service.priceMinorUnits;
        let surgePriceApplied = false;
        let surgeMultiplierPct: number | undefined = undefined;

        if (orgSettings.surgePricingEnabled && orgSettings.surgeRules?.length) {
            const d = new Date(args.startAt);
            const dayOfWeek = d.getUTCDay();
            const timeStr = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

            const matchingRule = orgSettings.surgeRules.find(
                (r) => r.dayOfWeek === dayOfWeek && timeStr >= r.startTime && timeStr < r.endTime
            );

            if (matchingRule) {
                surgePriceApplied = true;
                surgeMultiplierPct = matchingRule.multiplierPct;
                priceMinorUnits = Math.round(priceMinorUnits * (1 + matchingRule.multiplierPct / 100));
            }
        }

        // ── Insert booking ──
        const bookingId = await ctx.db.insert("bookings", {
            orgId: args.orgId,
            staffId: args.staffId,
            serviceId: args.serviceId,
            customerId,
            opusUserId,
            startAt: args.startAt,
            endAt,
            priceMinorUnits,
            currency: service.currency,
            surgePriceApplied,
            surgeMultiplierPct,
            customerNote: args.customerNote,
            status: "confirmed",  // Cash payment = instant confirmation
            source: opusUserId ? "opus_web" : "web",
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // ── Audit log ──
        await ctx.db.insert("audit_log", {
            orgId: args.orgId,
            actorType: "user",
            actorId: opusUserId ?? "opus.mk",
            action: "booking.created",
            resourceType: "bookings",
            resourceId: bookingId,
            after: {
                staffId: args.staffId,
                customerId,
                startAt: args.startAt,
                priceMinorUnits,
                status: "confirmed",
                source: opusUserId ? "opus_web" : "web",
                paymentMethod: args.paymentMethod,
            },
            createdAt: Date.now(),
        });

        // ── Dashboard notification — shows in navbar bell for the business owner ──
        const startDate = new Date(args.startAt);
        const timeLabel = `${String(startDate.getUTCHours()).padStart(2, "0")}:${String(startDate.getUTCMinutes()).padStart(2, "0")}`;
        await ctx.runMutation(internal.dashboardNotifications.create, {
            orgId: args.orgId,
            type: "new_booking",
            title: "New Booking",
            body: `${args.customerName} booked ${service.name} with ${staff.displayName} at ${timeLabel}`,
            bookingId,
            customerId,
        });

        return {
            bookingId,
            serviceName: service.name,
            staffName: staff.displayName,
            startAt: args.startAt,
            endAt,
            priceMinorUnits,
            currency: service.currency,
        };
    },
});


// ─── Public availability — wired to real slot engine ───
export const getPublicSlots = query({
    args: {
        orgId: v.id("orgs"),
        serviceId: v.id("services"),
        staffId: v.union(v.id("staff_members"), v.literal("any")),
        date: v.string(),   // "YYYY-MM-DD"
    },
    handler: async (ctx, args) => {
        // Verify org is published
        const org = await ctx.db.get(args.orgId);
        if (
            !org ||
            org.isDeleted ||
            org.listingStatus !== "published" ||
            !isActiveIndustry(org.industry)
        ) return [];

        // Verify service is publicly visible
        const service = await ctx.db.get(args.serviceId);
        if (!service || service.isDeleted || !service.isActive || !service.isOpusVisible) return [];

        return await computeSlotsForDate(ctx, args.orgId, args.staffId, args.serviceId, args.date);
    },
});

// ─── Public available dates for a month ───
export const getPublicAvailableDates = query({
    args: {
        orgId: v.id("orgs"),
        serviceId: v.id("services"),
        staffId: v.union(v.id("staff_members"), v.literal("any")),
        month: v.string(),  // "YYYY-MM"
    },
    handler: async (ctx, args) => {
        const org = await ctx.db.get(args.orgId);
        if (
            !org ||
            org.isDeleted ||
            org.listingStatus !== "published" ||
            !isActiveIndustry(org.industry)
        ) return [];

        const service = await ctx.db.get(args.serviceId);
        if (!service || service.isDeleted || !service.isActive || !service.isOpusVisible) return [];

        const [year, m] = args.month.split("-").map(Number);
        const daysInMonth = new Date(Date.UTC(year, m, 0)).getDate();

        const promises = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            promises.push(
                computeSlotsForDate(ctx, args.orgId, args.staffId, args.serviceId, dateStr)
                    .then(slots => ({ date: dateStr, hasSlots: slots.length > 0 }))
                    .catch(() => ({ date: dateStr, hasSlots: false }))
            );
        }

        const results = await Promise.all(promises);
        return results.filter(r => r.hasSlots).map(r => r.date);
    },
});
