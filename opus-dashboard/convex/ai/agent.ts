"use node";

import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { zodResponsesFunction, zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses";
import { z } from "zod";
import { ConvexError, v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { buildSystemPrompt, type StudioContext } from "./context";
import {
  aiReplySchema,
  handoffReply,
  parseReply,
  responseLanguage,
  withinReplyHours,
} from "./rules";

export const FRONTDESK_MODEL = "gpt-6-luna";
const availabilitySchema = z.object({
  service: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const proposalSchema = z.object({
  service: z.string(),
  slot: z.string(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(7).max(30),
});
const tools = [
  zodResponsesFunction({
    name: "check_availability",
    parameters: availabilitySchema,
    description:
      "Look up current available appointments for a service reference from the studio facts, and a local date YYYY-MM-DD. Returns ephemeral slot references and actual prices.",
  }),
  zodResponsesFunction({
    name: "prepare_booking",
    parameters: proposalSchema,
    description:
      "Propose (not create) an appointment after the customer has chosen it and supplied their name and phone. Use a slot reference returned by check_availability in this turn. The server asks for a separate confirmation.",
  }),
];

function client() {
  const apiKey =
    process.env.AI_FRONTDESK_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (process.env.AI_FRONTDESK_ENABLED !== "true" || !apiKey)
    throw new ConvexError("The AI frontdesk provider is not configured yet.");
  return new OpenAI({ apiKey, timeout: 30_000, maxRetries: 0 });
}

export const processConversation = internalAction({
  args: { orgId: v.id("orgs"), conversationId: v.id("ai_conversations") },
  handler: async (ctx, args): Promise<void> => {
    const lease = randomUUID(),
      work = { ...args, lease };
    const messageId = await ctx.runMutation(internal.ai.queue.claim, work);
    if (!messageId) return;
    const model = process.env.AI_FRONTDESK_MODEL || FRONTDESK_MODEL;
    try {
      const runtime = await ctx.runQuery(internal.ai.queue.runtime, work);
      if (!runtime) return;
      const { settings, org, message } = runtime;
      const finish = async (
        reply: string,
        confidenceScore = 1,
        needsHandoff = false,
        reason?: string,
      ) => {
        const replyId = await ctx.runMutation(internal.ai.queue.finish, {
          ...work,
          reply,
          confidenceScore,
          needsHandoff,
          model,
          reason,
        });
        if (replyId)
          await ctx.runAction(internal.ai.instagram.sendMessage, {
            orgId: args.orgId,
            messageId: replyId,
          });
      };
      if (!withinReplyHours(settings)) {
        await finish(
          settings.aiAwayMessage ||
            handoffReply(
              responseLanguage(settings.aiLanguage, message.content),
              settings.aiHandoffPhoneNumber,
            ),
        );
        return;
      }
      const confirmation = await ctx.runMutation(
        internal.ai.booking.confirm,
        work,
      );
      if (confirmation) {
        await finish(confirmation);
        return;
      }
      await ctx.runMutation(internal.ai.booking.clearProposal, work);
      const services = runtime.services.map((s, i) => ({
        reference: `service_${i + 1}`,
        name: s.name,
        description: s.description,
        durationMins: s.durationMins,
        priceMinorUnits: s.priceMinorUnits,
        currency: s.currency,
      }));
      const studio: StudioContext = {
        name: org.name,
        address: org.address,
        city: org.city,
        phone: org.phone,
        bio: org.bio,
        openingHours: org.openingHours,
        services,
        ...(org.websiteStatus === "published"
          ? {
              bookingUrl: `https://${org.slug}.${process.env.ROOT_DOMAIN || "opus.mk"}`,
            }
          : {}),
      };
      const input: ResponseInput = [
        ...runtime.history,
        { role: "user", content: message.content },
      ];
      if (
        JSON.stringify(input).length +
          buildSystemPrompt(settings, studio).length >
        80_000
      )
        throw new Error("Frontdesk context limit reached");
      const provider = client();
      const slots = new Map<
        string,
        {
          serviceId: Id<"services">;
          staffId: Id<"staff_members">;
          startAt: number;
        }
      >();
      let slotSequence = 0;
      for (let step = 0; step < 4; step++) {
        if (!(await ctx.runQuery(internal.ai.queue.runtime, work))) return;
        const response = await provider.responses.create({
          model,
          instructions: buildSystemPrompt(settings, studio),
          input,
          tools,
          tool_choice: step === 3 ? "none" : "auto",
          parallel_tool_calls: false,
          store: false,
          reasoning: { effort: "low" },
          include: ["reasoning.encrypted_content"],
          max_output_tokens: 2_048,
          text: { format: zodTextFormat(aiReplySchema, "frontdesk_reply") },
        });
        if (response.usage)
          await ctx.runMutation(internal.ai.queue.recordUsage, {
            ...args,
            input: response.usage.input_tokens,
            output: response.usage.output_tokens,
          });
        if (response.status !== "completed")
          throw new Error("Incomplete model response");
        const calls = response.output.filter(
          (item) => item.type === "function_call",
        );
        if (!calls.length) {
          const reply = parseReply(response.output_text);
          if (!reply) throw new Error("Invalid model response");
          await finish(reply.message, reply.confidenceScore, reply.handoff);
          return;
        }
        input.push(
          ...response.output.filter(
            (item) =>
              item.type === "function_call" ||
              item.type === "message" ||
              item.type === "reasoning",
          ),
        );
        for (const call of calls.slice(0, 4)) {
          let output: unknown;
          try {
            if (call.name === "check_availability") {
              const request = availabilitySchema.parse(
                JSON.parse(call.arguments),
              );
              const index = services.findIndex(
                (s) => s.reference === request.service,
              );
              const service = runtime.services[index];
              if (!service) throw new Error("Unknown service reference");
              const available = await ctx.runQuery(
                internal.ai.booking.availability,
                { ...work, serviceId: service._id, date: request.date },
              );
              output = available.map((slot) => {
                const reference = `slot_${++slotSequence}`;
                slots.set(reference, {
                  serviceId: service._id,
                  staffId: slot.staffId,
                  startAt: slot.startAt,
                });
                return {
                  reference,
                  date: request.date,
                  time: slot.time,
                  staff: slot.staffName,
                  priceMinorUnits: slot.priceMinorUnits,
                  currency: service.currency,
                };
              });
            } else if (call.name === "prepare_booking") {
              const request = proposalSchema.parse(JSON.parse(call.arguments));
              const slot = slots.get(request.slot),
                serviceIndex = services.findIndex(
                  (s) => s.reference === request.service,
                );
              if (
                !slot ||
                runtime.services[serviceIndex]?._id !== slot.serviceId
              )
                throw new Error(
                  "Check availability in this turn before proposing a booking",
                );
              const replyId = await ctx.runMutation(
                internal.ai.booking.prepare,
                {
                  ...work,
                  ...slot,
                  customerName: request.customerName,
                  customerPhone: request.customerPhone,
                },
              );
              await ctx.runAction(internal.ai.instagram.sendMessage, {
                orgId: args.orgId,
                messageId: replyId,
              });
              return;
            } else throw new Error("Unknown tool");
          } catch {
            output = {
              error:
                "This request could not be completed. Check the service and availability again or ask the customer to clarify. Do not claim a booking was created.",
            };
          }
          input.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify(output),
          });
        }
      }
      throw new Error("Tool limit reached");
    } catch {
      const replyId = await ctx.runMutation(internal.ai.queue.finish, {
        ...work,
        reply: "",
        confidenceScore: 0,
        needsHandoff: true,
        model,
        reason:
          "The assistant could not complete this request. Please review the conversation.",
      });
      if (replyId)
        await ctx.runAction(internal.ai.instagram.sendMessage, {
          orgId: args.orgId,
          messageId: replyId,
        });
    } finally {
      await ctx.runMutation(internal.ai.queue.release, work);
    }
  },
});

// A private setup check, not a public web chat. Uses saved context and has no
// booking tools, sends no DM, and shares the per-studio daily cost allowance.
export const preview = action({
  args: { question: v.string() },
  handler: async (
    ctx,
    { question },
  ): Promise<{
    message: string;
    confidenceScore: number;
    handoff: boolean;
  }> => {
    if (!question.trim() || question.length > 2_000)
      throw new ConvexError("Enter a question of up to 2,000 characters.");
    const runtime = await ctx.runMutation(internal.ai.previewData.reserve, {
      question: question.trim(),
    });
    const model = process.env.AI_FRONTDESK_MODEL || FRONTDESK_MODEL;
    let inputTokens = 0,
      outputTokens = 0;
    try {
      const response = await client().responses.create({
        model,
        instructions: `${buildSystemPrompt(runtime.settings, runtime.studio)}\nThis is a setup test. For appointments, explain that this preview does not make bookings.`,
        input: [{ role: "user", content: question.trim() }],
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 2_048,
        text: { format: zodTextFormat(aiReplySchema, "frontdesk_preview") },
      });
      inputTokens = response.usage?.input_tokens ?? 0;
      outputTokens = response.usage?.output_tokens ?? 0;
      const reply =
        response.status === "completed"
          ? parseReply(response.output_text)
          : null;
      if (!reply) throw new Error("Incomplete preview response");
      await ctx.runMutation(internal.ai.previewData.complete, {
        orgId: runtime.orgId,
        conversationId: runtime.conversationId,
        content: reply.message,
        confidenceScore: reply.confidenceScore,
        inputTokens,
        outputTokens,
        model,
        failed: false,
      });
      return {
        ...reply,
        handoff:
          reply.handoff ||
          reply.confidenceScore <
            Math.max(0.7, runtime.settings.aiConfidenceThreshold),
      };
    } catch {
      await ctx.runMutation(internal.ai.previewData.complete, {
        orgId: runtime.orgId,
        conversationId: runtime.conversationId,
        content: "Preview could not be completed.",
        confidenceScore: 0,
        inputTokens,
        outputTokens,
        model,
        failed: true,
      });
      throw new ConvexError("The AI could not answer. Please try again.");
    }
  },
});
