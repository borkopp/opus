import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/** Tenant-scoped operational anonymization. Historical append-only audits remain retained. */
export async function eraseReservationGuest(
  ctx: MutationCtx,
  org: Doc<"orgs">,
  customerId: Id<"customers">,
  actorId: Id<"staff_members">,
) {
  const customer = await ctx.db.get(customerId);
  if (!customer || customer.orgId !== org._id)
    throw new ConvexError("Guest not found.");
  const reservations = await ctx.db
    .query("reservations")
    .withIndex("by_org_customer_start", (q) =>
      q.eq("orgId", org._id).eq("customerId", customerId),
    )
    .collect();
  if (
    customer.isDeleted &&
    customer.name === "Anonymised guest" &&
    reservations.every(
      (r) =>
        r.guestName === "Anonymised guest" &&
        !r.verifiedEmail &&
        !r.manageTokenHash &&
        !r.manageTokenCiphertext &&
        !r.manageTokenExpiresAt &&
        !r.requestFingerprint &&
        !r.opusUserId &&
        !r.specialRequests &&
        !r.staffNote &&
        !r.cancellationReason,
    )
  )
    return { anonymizedReservations: 0 };
  const notes = await ctx.db
    .query("customer_notes")
    .withIndex("by_org_customer", (q) =>
      q.eq("orgId", org._id).eq("customerId", customerId),
    )
    .collect();
  const notifications = await ctx.db
    .query("notifications")
    .withIndex("by_org_customer", (q) =>
      q.eq("orgId", org._id).eq("customerId", customerId),
    )
    .collect();
  const emails = new Set(
    [customer.email, ...reservations.map((r) => r.verifiedEmail)].filter(
      (email): email is string => Boolean(email),
    ),
  );
  const now = Date.now();
  const anonymousAddress = `erased+${customerId}@opus.invalid`;
  for (const email of emails) {
    const challenges = await ctx.db
      .query("booking_email_verifications")
      .withIndex("by_org_email", (q) =>
        q.eq("orgId", org._id).eq("email", email),
      )
      .collect();
    for (const challenge of challenges) {
      if (challenge.purpose !== "reservation") continue;
      await ctx.db.patch(challenge._id, {
        email: anonymousAddress,
        codeHash: "erased",
        status: "superseded",
        expiresAt: now,
        updatedAt: now,
      });
      notifications.push(
        ...(await ctx.db
          .query("notifications")
          .withIndex("by_org_verification", (q) =>
            q
              .eq("orgId", org._id)
              .eq("bookingEmailVerificationId", challenge._id),
          )
          .collect()),
      );
    }
  }
  for (const reservation of reservations)
    await ctx.db.patch(reservation._id, {
      guestName: "Anonymised guest",
      specialRequests: undefined,
      staffNote: undefined,
      cancellationReason: undefined,
      verifiedEmail: undefined,
      manageTokenHash: undefined,
      manageTokenCiphertext: undefined,
      manageTokenExpiresAt: undefined,
      requestFingerprint: undefined,
      opusUserId: undefined,
      updatedAt: now,
    });
  for (const note of notes)
    await ctx.db.patch(note._id, {
      note: "Anonymised",
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    });
  for (const notification of new Map(
    notifications.map((n) => [n._id, n]),
  ).values())
    await ctx.db.patch(notification._id, {
      ...(notification.type !== "staff_reservation"
        ? { recipientAddress: anonymousAddress }
        : {}),
      templateData: { redacted: true },
      providerAttempts: undefined,
      ...(notification.status === "pending"
        ? {
            status: "cancelled" as const,
            processingStartedAt: undefined,
            failureReason: "Guest details anonymised.",
          }
        : { failureReason: undefined }),
    });
  await ctx.db.patch(customerId, {
    name: "Anonymised guest",
    email: undefined,
    phone: undefined,
    avatarUrl: undefined,
    opusUserId: undefined,
    preferredStaffId: undefined,
    preferredChannel: undefined,
    whatsappOptIn: false,
    marketingOptIn: false,
    gapRecoveryEmailOptIn: false,
    gapRecoveryUndeliverableEmail: undefined,
    gdprErasureRequestedAt: now,
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
  });
  await ctx.db.insert("audit_log", {
    orgId: org._id,
    actorType: "staff",
    actorId,
    action: "reservation.guest_anonymized",
    resourceType: "customers",
    resourceId: customerId,
    after: {
      anonymizedReservations: reservations.length,
      anonymizedNotes: notes.length,
      operationalReservationsRetained: true,
    },
    createdAt: now,
  });
  return { anonymizedReservations: reservations.length };
}
