"use node";

import OpenAI from "openai";
import { zodResponsesFunction, zodTextFormat } from "openai/helpers/zod";
import type {
  ResponseInput,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { AnalystReport } from "./contracts";
import { ANALYST_LIMITS, analystConfigured } from "./limits";
import {
  ANALYST_SYSTEM_PROMPT,
  analysisSchema,
  answerSchema,
  compactReport,
  validateAnswer,
} from "./prompt";
import { dateKey } from "./periods";
import { wallClockNow } from "../lib/bookingTime";

export const run = internalAction({
  args: { turnId: v.id("analyst_turns") },
  handler: async (ctx, { turnId }): Promise<void> => {
    const reports: AnalystReport[] = [];
    let requestInFlight = false;
    try {
      if (
        !(await ctx.runMutation(internal.analyst.conversations.claim, {
          turnId,
        }))
      )
        return;
      if (!analystConfigured()) throw new Error("ANALYST_NOT_CONFIGURED");
      const runtime = await ctx.runQuery(
        internal.analyst.conversations.runtime,
        { turnId },
      );
      const { turn } = runtime;
      const client = new OpenAI({
        apiKey: process.env.BUSINESS_ANALYST_OPENAI_API_KEY,
        maxRetries: 0,
        timeout: 45_000,
      });
      const tools = [
        zodResponsesFunction({
          name: "analyse_period",
          parameters: analysisSchema,
          description:
            "Calculate exact appointment analytics for this business. Group by day, weekday, staff, service bundle, or total; optionally compare periods. All fields are required; use null for unused filters, dates, and comparison.",
        }),
      ];
      const input: ResponseInput = [
        {
          role: "user",
          content: JSON.stringify({
            environment: {
              business: runtime.businessName,
              language: turn.language,
              today: dateKey(wallClockNow(runtime.timezone, turn.createdAt)),
              timezone: runtime.timezone,
              staffNames: runtime.staffNames,
              serviceNames: runtime.serviceNames,
            },
            previousConversation: runtime.history,
            question: turn.question,
          }),
        },
      ];
      let inputBytes = 0,
        toolCalls = 0;
      const cache = new Map<string, AnalystReport>();
      for (let step = 0; step < ANALYST_LIMITS.maxModelCalls; step++) {
        // Recheck permission and the lease before every paid provider request.
        await ctx.runQuery(internal.analyst.conversations.runtime, { turnId });
        if (!analystConfigured()) throw new Error("ANALYST_NOT_CONFIGURED");
        const params: ResponseCreateParamsNonStreaming = {
          model: turn.model,
          instructions: ANALYST_SYSTEM_PROMPT,
          input,
          tools,
          tool_choice:
            step === ANALYST_LIMITS.maxModelCalls - 1 ||
            toolCalls >= ANALYST_LIMITS.maxToolCalls
              ? "none"
              : "auto",
          parallel_tool_calls: true,
          store: false,
          include: ["reasoning.encrypted_content"],
          reasoning: { effort: turn.depth === "deep" ? "low" : "none" },
          max_output_tokens: ANALYST_LIMITS.maxOutputTokens,
          text: { format: zodTextFormat(answerSchema, "business_analysis") },
        };
        inputBytes += new TextEncoder().encode(
          JSON.stringify(params),
        ).byteLength;
        if (inputBytes > ANALYST_LIMITS.maxInputBytes)
          throw new Error("ANALYST_CONTEXT_LIMIT");
        requestInFlight = true;
        const response = await client.responses.create(params);
        // Save billable output including reasoning even when output is invalid.
        if (!response.usage) throw new Error("ANALYST_USAGE_UNAVAILABLE");
        await ctx.runMutation(internal.analyst.conversations.recordUsage, {
          turnId,
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        });
        requestInFlight = false;
        if (response.status !== "completed")
          throw new Error("ANALYST_INCOMPLETE_RESPONSE");
        const calls = response.output.filter(
          (item) => item.type === "function_call",
        );
        const continuation = response.output.filter(
          (item) =>
            item.type === "function_call" ||
            item.type === "message" ||
            item.type === "reasoning",
        );
        if (!calls.length) {
          try {
            const answer = validateAnswer(
              JSON.parse(response.output_text),
              reports,
              turn.language,
            );
            await ctx.runMutation(internal.analyst.conversations.finish, {
              turnId,
              answer,
              reports,
            });
            return;
          } catch {
            if (step === ANALYST_LIMITS.maxModelCalls - 1)
              throw new Error("ANALYST_INVALID_RESPONSE");
            input.push(...continuation);
            input.push({
              role: "user",
              content:
                "The answer failed validation. Return valid JSON with at most two evidence-backed recommendations and three follow-ups. Cite existing reports. Use [[fact_id]] for all numbers and dates, with no numeric literals outside those references. If facts are insufficient, ask one clarification.",
            });
            continue;
          }
        }
        input.push(...continuation);
        for (const call of calls) {
          let output: unknown;
          toolCalls++;
          if (
            call.name !== "analyse_period" ||
            toolCalls > ANALYST_LIMITS.maxToolCalls
          )
            output = { error: "ANALYST_TOOL_LIMIT" };
          else {
            try {
              const request = analysisSchema.parse(JSON.parse(call.arguments));
              const cacheKey = JSON.stringify(request);
              let report = cache.get(cacheKey);
              if (!report) {
                report = await ctx.runQuery(
                  internal.analyst.analytics.analyse,
                  { turnId, request, key: `r${reports.length + 1}` },
                );
                cache.set(cacheKey, report);
                reports.push(report);
              }
              output = compactReport(report, turn.language);
            } catch (error) {
              const code =
                error instanceof Error
                  ? error.message.match(/ANALYST_[A-Z_]+/)?.[0]
                  : null;
              output = {
                error: code ?? "ANALYST_INVALID_ANALYSIS",
                instruction:
                  "Clarify or narrow the request. Do not invent results.",
              };
            }
          }
          input.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify(output),
          });
        }
      }
      throw new Error("ANALYST_TOOL_LIMIT");
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message.match(/ANALYST_[A-Z_]+/)?.[0]
          : null;
      // Provider errors can contain request content; persist only our safe code.
      await ctx.runMutation(internal.analyst.conversations.finish, {
        turnId,
        reports: [],
        errorCode: code ?? "ANALYST_PROVIDER_UNAVAILABLE",
        uncertainCost: requestInFlight,
      });
    }
  },
});
