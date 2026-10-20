import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { wallClockTimestampToInstant } from "./bookingTime";
import { isActiveIndustry } from "./productScope";

type CompletionExecution = {
  executingJobId?: Id<"_scheduled_functions">;
};

/** Enabled for every beauty studio unless the global emergency switch is off. */
export function automaticCompletionEnabled() {
  return process.env.BOOKING_AUTO_COMPLETION_ENABLED !== "false";
}

export function canAutomaticallyComplete(booking: Doc<"bookings">) {
  return (
    !booking.isDeleted &&
    (booking.status === "confirmed" || booking.status === "checked_in")
  );
}

/** Cancelling an obsolete task is an optimization; execution also rechecks state. */
export async function cancelBookingCompletion(
  ctx: MutationCtx,
  booking: Doc<"bookings">,
  execution: CompletionExecution = {},
) {
  // Let the callback executing this transition finish normally. Clear its
  // linkage below without trying to cancel the current execution.
  if (
    booking.autoCompletionJobId &&
    booking.autoCompletionJobId !== execution.executingJobId
  ) {
    const job = await ctx.db.system.get(booking.autoCompletionJobId);
    if (job?.state.kind === "pending") {
      await ctx.scheduler.cancel(booking.autoCompletionJobId);
    }
  }
  if (
    booking.autoCompletionJobId !== undefined ||
    booking.autoCompletionScheduledFor !== undefined
  ) {
    await ctx.db.patch(booking._id, {
      autoCompletionJobId: undefined,
      autoCompletionScheduledFor: undefined,
    });
  }
}

/** Schedule inside the booking transaction, without polling or customer messages. */
export async function scheduleBookingCompletion(
  ctx: MutationCtx,
  booking: Doc<"bookings">,
  timezone: string,
  options: CompletionExecution & { eligibleAfter?: number } = {},
): Promise<boolean> {
  if (!automaticCompletionEnabled() || !canAutomaticallyComplete(booking)) {
    return false;
  }
  const org = await ctx.db.get(booking.orgId);
  if (!org || org.isDeleted || !isActiveIndustry(org.industry)) return false;

  const scheduledFor = wallClockTimestampToInstant(booking.endAt, timezone);
  // Untracked past appointments are not a migration target. An existing task,
  // or a future appointment found by an in-progress setup, may now be overdue.
  if (
    !booking.autoCompletionJobId &&
    scheduledFor <= (options.eligibleAfter ?? Date.now())
  ) {
    return false;
  }

  if (
    booking.autoCompletionJobId &&
    booking.autoCompletionScheduledFor === scheduledFor
  ) {
    const existing = await ctx.db.system.get(booking.autoCompletionJobId);
    if (
      existing?.state.kind === "pending" &&
      booking.autoCompletionJobId !== options.executingJobId &&
      existing.args[0]?.expectedEndAt === booking.endAt
    ) {
      return false;
    }
  }

  await cancelBookingCompletion(ctx, booking, options);
  const jobId = await ctx.scheduler.runAt(
    Math.max(Date.now(), scheduledFor),
    internal.bookings.completeScheduledBooking,
    {
      orgId: booking.orgId,
      bookingId: booking._id,
      expectedEndAt: booking.endAt,
      scheduledFor,
    },
  );
  await ctx.db.patch(booking._id, {
    autoCompletionJobId: jobId,
    autoCompletionScheduledFor: scheduledFor,
  });
  return true;
}

/** Shared atomic status, client totals and audit update after caller checks. */
export async function completeBookingRecord(
  ctx: MutationCtx,
  booking: Doc<"bookings">,
  actor: { type: "staff" | "system"; id: string },
  execution: CompletionExecution = {},
) {
  if (!canAutomaticallyComplete(booking)) return false;
  await cancelBookingCompletion(ctx, booking, execution);
  const now = Date.now();
  await ctx.db.patch(booking._id, {
    status: "completed",
    updatedAt: now,
  });

  const customer = await ctx.db.get(booking.customerId);
  if (customer?.orgId === booking.orgId && !customer.isDeleted) {
    await ctx.db.patch(customer._id, {
      totalSpendMinorUnits:
        (customer.totalSpendMinorUnits || 0) + booking.priceMinorUnits,
      updatedAt: now,
    });
  }
  await ctx.db.insert("audit_log", {
    orgId: booking.orgId,
    actorType: actor.type,
    actorId: actor.id,
    action: "booking.completed",
    resourceType: "bookings",
    resourceId: booking._id,
    before: { status: booking.status },
    after: { status: "completed" },
    createdAt: now,
  });
  return true;
}
