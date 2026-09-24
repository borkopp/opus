import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { computeSlotsForDate } from "../slots";
import { isWithinPublicBookingWindow } from "../lib/publicBookingRules";
import {
  normalizePublicBookingPhone,
  isValidPublicBookingPhone,
} from "../../lib/public-booking-phone";
import { recordRecoveryBooking } from "../lib/gapRecovery";
import { automationReady, leasedConversation, storeReply } from "./queue";
import { isExplicitConfirmation, responseLanguage } from "./rules";
import { logEvent } from "./state";

const leaseArgs = {
  orgId: v.id("orgs"),
  conversationId: v.id("ai_conversations"),
  lease: v.string(),
};

export const availability = internalQuery({
  args: { ...leaseArgs, serviceId: v.id("services"), date: v.string() },
  handler: async (ctx, args) => {
    const conv = await leasedConversation(ctx, args),
      ready = await automationReady(ctx, args.orgId);
    if (!conv || conv.status !== "active" || !ready)
      throw new ConvexError("Conversation is no longer active.");
    if (
      !isWithinPublicBookingWindow(
        args.date,
        ready.settings.timezone,
        ready.settings.bookingWindowDays,
      )
    )
      return [];
    const slots = await computeSlotsForDate(
      ctx,
      args.orgId,
      "any",
      args.serviceId,
      args.date,
    );
    const result = [];
    for (const slot of slots.slice(0, 48)) {
      for (const staffId of slot.availableStaffIds.slice(0, 10)) {
        const staff = await ctx.db.get(staffId);
        if (staff && staff.orgId === args.orgId)
          result.push({
            ...slot,
            availableStaffIds: undefined,
            staffId,
            staffName: staff.displayName,
            time: new Date(slot.startAt).toISOString().slice(11, 16),
          });
      }
    }
    return result;
  },
});

export const clearProposal = internalMutation({
  args: leaseArgs,
  handler: async (ctx, args) => {
    const conv = await leasedConversation(ctx, args);
    if (conv?.pendingBooking)
      await ctx.db.patch(conv._id, { pendingBooking: undefined });
  },
});

export const prepare = internalMutation({
  args: {
    ...leaseArgs,
    serviceId: v.id("services"),
    staffId: v.id("staff_members"),
    startAt: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
  },
  handler: async (ctx, args) => {
    const conv = await leasedConversation(ctx, args),
      ready = await automationReady(ctx, args.orgId);
    if (
      !conv ||
      conv.status !== "active" ||
      !conv.processingMessageId ||
      !ready
    )
      throw new ConvexError("Conversation is no longer active.");
    const phone = normalizePublicBookingPhone(args.customerPhone),
      name = args.customerName.trim();
    if (
      !name ||
      name.length > 100 ||
      !isValidPublicBookingPhone(phone) ||
      !Number.isFinite(args.startAt)
    )
      throw new ConvexError(
        "Ask for the customer's name and a valid phone number.",
      );
    // Contact details must originate in this customer's messages, not the
    // business context or another customer's record.
    const history = await ctx.db
      .query("ai_messages")
      .withIndex("by_org_conversation", (q) =>
        q.eq("orgId", args.orgId).eq("conversationId", conv._id),
      )
      .order("desc")
      .take(40);
    const userText = history
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n");
    if (
      !userText.toLocaleLowerCase().includes(name.toLocaleLowerCase()) ||
      !normalizePublicBookingPhone(userText).includes(phone.replace(/^\+/, ""))
    )
      throw new ConvexError(
        "Ask the customer to provide their name and phone in this conversation.",
      );
    const service = await ctx.db.get(args.serviceId),
      staff = await ctx.db.get(args.staffId);
    if (
      !service ||
      service.orgId !== args.orgId ||
      !staff ||
      staff.orgId !== args.orgId
    )
      throw new ConvexError("Service or staff not available.");
    const date = new Date(args.startAt).toISOString().slice(0, 10);
    if (
      !isWithinPublicBookingWindow(
        date,
        ready.settings.timezone,
        ready.settings.bookingWindowDays,
      )
    )
      throw new ConvexError("Choose a date within the booking window.");
    const slot = (
      await computeSlotsForDate(
        ctx,
        args.orgId,
        args.staffId,
        args.serviceId,
        date,
      )
    ).find((s) => s.startAt === args.startAt);
    if (!slot)
      throw new ConvexError(
        "That slot is no longer available. Check availability again.",
      );
    const inbound = await ctx.db.get(conv.processingMessageId);
    const language = responseLanguage(
      ready.settings.aiLanguage,
      inbound?.content ?? "",
    );
    const summary = `${service.name} · ${staff.displayName}\n${date} ${new Date(args.startAt).toISOString().slice(11, 16)} (${ready.settings.timezone})\n${(slot.priceMinorUnits / 100).toFixed(2)} ${service.currency}\n${name} · ${phone}`;
    const reply =
      language === "mk"
        ? `Проверете ги деталите:\n${summary}\n\nОдговорете „Потврдувам“ за да закажам. Терминот сè уште не е резервиран.`
        : `Please check the details:\n${summary}\n\nReply “Confirm” to book. This appointment is not reserved yet.`;
    await ctx.db.patch(conv._id, {
      pendingBooking: {
        serviceId: args.serviceId,
        staffId: args.staffId,
        startAt: args.startAt,
        priceMinorUnits: slot.priceMinorUnits,
        customerName: name,
        customerPhone: phone,
        summary,
        proposedByMessageId: conv.processingMessageId,
        expiresAt: Date.now() + 15 * 60_000,
      },
    });
    await logEvent(ctx, args.orgId, conv._id, "ai.booking_proposed", {
      serviceId: args.serviceId,
      startAt: args.startAt,
    });
    return storeReply(ctx, conv, reply, 1);
  },
});

export const confirm = internalMutation({
  args: leaseArgs,
  handler: async (ctx, args): Promise<string | null> => {
    const conv = await leasedConversation(ctx, args),
      ready = await automationReady(ctx, args.orgId);
    if (
      !conv ||
      conv.status !== "active" ||
      !conv.processingMessageId ||
      !ready
    )
      return null;
    const message = await ctx.db.get(conv.processingMessageId);
    if (
      !message ||
      message.orgId !== args.orgId ||
      message.conversationId !== conv._id
    )
      return null;
    const language = responseLanguage(
      ready.settings.aiLanguage,
      message.content,
    );
    if (message.bookingId)
      return language === "mk"
        ? "Вашиот термин е веќе потврден."
        : "Your appointment is already confirmed.";
    const proposal = conv.pendingBooking;
    if (!proposal || !isExplicitConfirmation(message.content)) return null;
    const proposedReply = await ctx.db
      .query("ai_messages")
      .withIndex("by_org_reply", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("replyToMessageId", proposal.proposedByMessageId),
      )
      .filter((q) => q.eq(q.field("deliveryStatus"), "sent"))
      .first();
    const rejected = () =>
      language === "mk"
        ? "Терминот не е закажан. Да ги провериме деталите и достапноста повторно."
        : "The appointment has not been booked. Let’s check the details and availability again.";
    if (
      !proposedReply?.sentAt ||
      (message.providerTimestamp ?? 0) < proposedReply.sentAt ||
      (conv.lastInboundAt ?? 0) > (message.providerTimestamp ?? 0) ||
      proposal.expiresAt <= Date.now()
    ) {
      await ctx.db.patch(conv._id, { pendingBooking: undefined });
      return rejected();
    }
    const date = new Date(proposal.startAt).toISOString().slice(0, 10);
    if (
      !isWithinPublicBookingWindow(
        date,
        ready.settings.timezone,
        ready.settings.bookingWindowDays,
      )
    )
      return rejected();
    // The shared slot computation reads by_org_staff_start inside THIS mutation.
    // Convex retries serializable conflicts, so only one confirmation can win.
    const slot = (
      await computeSlotsForDate(
        ctx,
        args.orgId,
        proposal.staffId,
        proposal.serviceId,
        date,
      )
    ).find((s) => s.startAt === proposal.startAt);
    if (!slot || slot.priceMinorUnits !== proposal.priceMinorUnits) {
      await ctx.db.patch(conv._id, { pendingBooking: undefined });
      return rejected();
    }
    const service = await ctx.db.get(proposal.serviceId);
    if (!service || service.orgId !== args.orgId) return rejected();
    const matches = await ctx.db
      .query("customers")
      .withIndex("by_org_phone", (q) =>
        q.eq("orgId", args.orgId).eq("phone", proposal.customerPhone),
      )
      .collect();
    const customer = matches.find((c) => !c.isDeleted);
    if (customer?.requiresFullDeposit)
      throw new ConvexError("The team must review this booking.");
    const now = Date.now();
    const customerId =
      customer?._id ??
      (await ctx.db.insert("customers", {
        orgId: args.orgId,
        name: proposal.customerName,
        phone: proposal.customerPhone,
        totalVisits: 0,
        totalSpendMinorUnits: 0,
        noShowCount: 0,
        noShowRiskScore: 0,
        whatsappOptIn: false,
        marketingOptIn: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      }));
    const bookingId = await ctx.db.insert("bookings", {
      orgId: args.orgId,
      staffId: proposal.staffId,
      serviceId: proposal.serviceId,
      customerId,
      startAt: proposal.startAt,
      endAt: slot.endAt,
      priceMinorUnits: slot.priceMinorUnits,
      currency: service.currency,
      surgePriceApplied: slot.surgePriceApplied,
      surgeMultiplierPct: slot.surgeMultiplierPct,
      status: "confirmed",
      source: "ai_instagram",
      aiConversationId: conv._id,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(message._id, { bookingId });
    await ctx.db.patch(conv._id, {
      customerId,
      bookingIds: [...conv.bookingIds, bookingId],
      pendingBooking: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("ai_messages", {
      orgId: args.orgId,
      conversationId: conv._id,
      role: "system",
      content: proposal.summary,
      confidenceScore: 1,
      actionType: "booking_created",
      actionReferenceId: bookingId,
      createdAt: now,
    });
    await ctx.db.insert("audit_log", {
      orgId: args.orgId,
      actorType: "ai",
      actorId: "frontdesk-confirmation",
      action: "booking.created",
      resourceType: "bookings",
      resourceId: bookingId,
      after: {
        conversationId: conv._id,
        confirmationMessageId: message._id,
        startAt: proposal.startAt,
        priceMinorUnits: slot.priceMinorUnits,
      },
      createdAt: now,
    });
    await ctx.db.insert("dashboard_notifications", {
      orgId: args.orgId,
      type: "new_booking",
      title: "New Booking",
      body: `${proposal.customerName} · ${service.name} · ${date} ${new Date(proposal.startAt).toISOString().slice(11, 16)}`,
      bookingId,
      customerId,
      isRead: false,
      isDismissed: false,
      createdAt: now,
    });
    const booking = await ctx.db.get(bookingId);
    if (booking) await recordRecoveryBooking(ctx, booking);
    return language === "mk"
      ? `Вашиот термин е потврден!\n${proposal.summary}`
      : `Your appointment is confirmed!\n${proposal.summary}`;
  },
});
