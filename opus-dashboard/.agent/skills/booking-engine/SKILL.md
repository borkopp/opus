---
name: booking-engine
description: Guides creation and modification of booking logic in the Omni-Service OS. Use when writing code that creates, reschedules, cancels, or queries bookings — or anything that touches availability, slot conflicts, surge pricing, or deposits.
---

# Booking Engine

Bookings are the core transaction of this platform. They tie a `customer` + `staff_member` + `service` + time slot together. Getting booking logic wrong causes double-bookings, revenue loss, or broken customer trust.

## Slot conflict prevention

**This is the most critical rule in the booking engine.** All booking creates must check for conflicts inside the same mutation, using the `by_staff_start` index. Convex mutations are serialised — use this guarantee.

```typescript
export const createBooking = mutation({
  args: {
    orgId: v.id("orgs"),
    staffId: v.id("staff_members"),
    serviceId: v.id("services"),
    customerId: v.id("customers"),
    startAt: v.number(),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    const endAt = args.startAt + service!.durationMins * 60 * 1000;

    // ── Conflict check ──────────────────────────────────────
    const conflict = await ctx.db
      .query("bookings")
      .withIndex("by_staff_start", (q) =>
        q.eq("staffId", args.staffId).eq("startAt", args.startAt)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.neq(q.field("status"), "cancelled"),
        )
      )
      .first();

    if (conflict) throw new ConvexError("This slot is already booked.");
    // ────────────────────────────────────────────────────────

    const bookingId = await ctx.db.insert("bookings", {
      orgId: args.orgId,
      staffId: args.staffId,
      serviceId: args.serviceId,
      customerId: args.customerId,
      startAt: args.startAt,
      endAt,
      priceMinorUnits: service!.priceMinorUnits,
      currency: service!.currency,
      surgePriceApplied: false,
      status: "pending_payment",
      source: "web",
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Always audit
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "user",
      action: "booking.created",
      resourceType: "bookings",
      resourceId: bookingId,
      before: null,
      after: { staffId: args.staffId, startAt: args.startAt },
      createdAt: Date.now(),
    });

    return bookingId;
  },
});
```

## Booking status lifecycle

Bookings move through statuses in order. Never skip states or move backwards without an explicit reason.

```
pending_payment → confirmed → checked_in → completed
                ↘ cancelled
                ↘ no_show (from confirmed or checked_in)
```

Always record `cancelledAt`, `cancelledBy`, and `cancellationReason` when moving to `cancelled`.

## Surge pricing

Before inserting a booking, check if surge pricing applies for the slot time. Read `org_settings.surgeRules` and apply the multiplier to the service's base price.

```typescript
function calculatePrice(
  basePriceMinorUnits: number,
  startAt: number,
  surgeRules: SurgeRule[],
): { priceMinorUnits: number; surgePriceApplied: boolean; surgeMultiplierPct?: number } {
  const date = new Date(startAt);
  const dayOfWeek = date.getDay();
  const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  const matchingRule = surgeRules.find(
    (r) => r.dayOfWeek === dayOfWeek && timeStr >= r.startTime && timeStr < r.endTime
  );

  if (!matchingRule) return { priceMinorUnits: basePriceMinorUnits, surgePriceApplied: false };

  const multiplied = Math.round(basePriceMinorUnits * (1 + matchingRule.multiplierPct / 100));
  return {
    priceMinorUnits: multiplied,
    surgePriceApplied: true,
    surgeMultiplierPct: matchingRule.multiplierPct,
  };
}
```

## Deposits

Before confirming a booking, check if a deposit is required:
1. Check `org_settings.depositRequired`
2. Check `customer.requiresFullDeposit` (set by no-show risk engine — overrides org setting)
3. If deposit required → set status to `pending_payment` and trigger a `deposit_request` notification
4. Only move to `confirmed` once `payment_intent` status is `succeeded`

## Availability resolution

When computing available slots for a given staff member and date:
1. Fetch `availability_rules` for that staff + day of week
2. Fetch `availability_overrides` for that staff + specific date — these take precedence
3. If override type is `day_off`, return no slots
4. Subtract existing confirmed/pending bookings (with buffer time from `org_settings.bufferTimeMins`)
5. Return remaining slots in `org_settings.slotDurationMins` increments

## Price snapshot rule

Always store the price at the time of booking in `bookings.priceMinorUnits`. Do not reference `services.priceMinorUnits` after the booking is created. Service prices can change — the booking price must not.
