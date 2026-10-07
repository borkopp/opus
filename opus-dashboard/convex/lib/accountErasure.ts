import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { components } from "../_generated/api";
import { wallClockNow } from "./bookingTime";

export async function eraseRequestedAccount(
  ctx: MutationCtx,
  userId: Id<"users">,
  retentionReview: string,
) {
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Account not found");
  if (user.isDeleted) return null;
  if (user.accountDeletionRequestedAt === undefined)
    throw new Error("Account has no deletion request");
  if (retentionReview.trim().length < 12 || retentionReview.length > 1000)
    throw new Error(
      "Document the business-data retention review before erasure",
    );

  // Identity-root lookup; all business data below uses that membership's named org index.
  const memberships = await ctx.db
    .query("staff_members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const member of memberships) {
    const org = await ctx.db.get(member.orgId);
    if (!org) throw new Error("Studio not found");
    let replacementOwner = false;
    if (member.role === "owner") {
      const owners = await ctx.db
        .query("staff_members")
        .withIndex("by_org_role", (q) =>
          q.eq("orgId", member.orgId).eq("role", "owner"),
        )
        .collect();
      for (const owner of owners) {
        if (
          owner.userId &&
          owner.userId !== userId &&
          owner.isActive &&
          !owner.isDeleted
        ) {
          const account = await ctx.db.get(owner.userId);
          if (account && !account.isDeleted) replacementOwner = true;
        }
      }
      if (!org.isDeleted && !replacementOwner)
        throw new Error(
          "Transfer ownership or close the studio before erasing its last owner",
        );
      if (!replacementOwner) {
        const billing = await ctx.db
          .query("billing_accounts")
          .withIndex("by_org", (q) => q.eq("orgId", member.orgId))
          .first();
        if (billing?.hasOpenSubscription)
          throw new Error(
            "Resolve the studio subscription before erasing its last owner",
          );
      }
    }
    const settings = await ctx.db
      .query("org_settings")
      .withIndex("by_org", (q) => q.eq("orgId", member.orgId))
      .first();
    const upcoming = await ctx.db
      .query("bookings")
      .withIndex("by_org_staff_start", (q) =>
        q
          .eq("orgId", member.orgId)
          .eq("staffId", member._id)
          .gte(
            "startAt",
            wallClockNow(settings?.timezone ?? "Europe/Skopje") - 86400000,
          ),
      )
      .collect();
    if (
      upcoming.some(
        (booking) =>
          !booking.isDeleted &&
          ["confirmed", "checked_in"].includes(booking.status) &&
          booking.endAt > wallClockNow(settings?.timezone ?? "Europe/Skopje"),
      )
    )
      throw new Error(
        "Reassign or cancel the account's upcoming appointments before erasure",
      );
  }

  // Run through the auth component's API in this same transaction. No active session,
  // credential or OTP survives an application tombstone, and failure rolls everything back.
  if (user.authUserId) {
    for (const model of [
      "session",
      "account",
      "twoFactor",
      "oauthApplication",
      "oauthAccessToken",
      "oauthConsent",
    ] as const) {
      let isDone = false;
      while (!isDone) {
        const result = await ctx.runMutation(
          components.betterAuth.adapter.deleteMany,
          {
            input: {
              model,
              where: [{ field: "userId", value: user.authUserId }],
            },
            paginationOpts: { numItems: 100, cursor: null },
          },
        );
        isDone = result.isDone;
      }
    }
    for (const type of ["sign-in", "email-verification", "forget-password"]) {
      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "verification",
          where: [{ field: "identifier", value: `${type}-otp-${user.email}` }],
        },
        paginationOpts: { numItems: 100, cursor: null },
      });
    }
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user.authUserId }],
      },
    });
  }

  const now = Date.now();
  const anonymousEmail = `deleted+${userId}@accounts.opus.invalid`;
  if (user.authUserId) {
    const clients = await ctx.db
      .query("opus_users")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", user.authUserId))
      .collect();
    for (const client of clients)
      await ctx.db.patch(client._id, {
        email: anonymousEmail,
        name: "Deleted account",
        phone: undefined,
        avatarUrl: undefined,
        clerkId: undefined,
        preferredCity: undefined,
        preferredChannel: undefined,
        marketingOptIn: false,
        opusPoints: 0,
        tier: "bronze",
        gdprConsentAt: undefined,
        gdprErasureRequestedAt: undefined,
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      });
  }
  for (const member of memberships) {
    const invites = await ctx.db
      .query("staff_invites")
      .withIndex("by_org", (q) => q.eq("orgId", member.orgId))
      .collect();
    const devices = await ctx.db
      .query("staff_push_devices")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", member.orgId).eq("userId", userId),
      )
      .collect();
    for (const device of devices)
      await ctx.db.patch(device._id, {
        isDeleted: true,
        deletedAt: now,
        expoToken: undefined,
        subscription: undefined,
        updatedAt: now,
      });
    const preferences = await ctx.db
      .query("staff_notification_preferences")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", member.orgId).eq("userId", userId),
      )
      .unique();
    if (preferences)
      await ctx.db.patch(preferences._id, {
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    const queued = await ctx.db
      .query("notifications")
      .withIndex("by_org_status_scheduled", (q) =>
        q.eq("orgId", member.orgId).eq("status", "pending"),
      )
      .collect();
    for (const notification of queued)
      if (notification.channel === "push" && notification.pushUserId === userId)
        await ctx.db.patch(notification._id, {
          status: "cancelled",
          processingStartedAt: undefined,
          failureReason: "Account erased.",
        });
    for (const invite of invites)
      if (invite.staffId === member._id && invite.email === user.email)
        await ctx.db.patch(invite._id, {
          email: anonymousEmail,
          token: `deleted-${invite._id}`,
          status: "cancelled",
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        });
    await ctx.db.patch(member._id, {
      userId: undefined,
      displayName: "Deleted team member",
      bio: undefined,
      avatarUrl: undefined,
      specialties: [],
      appointmentEmail: undefined,
      isActive: false,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("audit_log", {
      orgId: member.orgId,
      actorType: "system",
      actorId: "account-erasure",
      action: "account.deleted",
      resourceType: "users",
      resourceId: userId,
      after: { deletedAt: now, retentionReview: retentionReview.trim() },
      createdAt: now,
    });
  }
  await ctx.db.patch(userId, {
    email: anonymousEmail,
    name: "Deleted account",
    phone: undefined,
    avatarUrl: undefined,
    clerkId: undefined,
    activeOrgId: undefined,
    accountDeletionRequestedAt: undefined,
    accountDeletionNotifiedAt: undefined,
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
  });
  // Keep the opaque auth subject on tombstones to reject already-issued JWTs.
  // Business records and exclusive media are reviewed by the operator first; see the runbook.
  return { email: user.email, requestedAt: user.accountDeletionRequestedAt };
}
