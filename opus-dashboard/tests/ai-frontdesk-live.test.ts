import { describe, expect, test } from "vitest";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { buildSystemPrompt } from "../convex/ai/context";
import { aiReplySchema, parseReply } from "../convex/ai/rules";

// Opt-in provider smoke test: synthetic studio facts only, no Instagram sends.
// RUN_FRONTDESK_LIVE_TEST=true node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/ai-frontdesk-live.test.ts
describe.skipIf(process.env.RUN_FRONTDESK_LIVE_TEST !== "true")(
  "live Luna frontdesk",
  () => {
    const instructions = buildSystemPrompt(
      {
        aiPersonaName: "Aria",
        aiTone: "friendly",
        aiLanguage: "mk",
        timezone: "Europe/Skopje",
        cancellationWindowHours: 24,
        bookingWindowDays: 30,
        aiStudioContext:
          "Користиме Example Gel за гел-нокти. Вообичаено препорачуваме корекција по 3 недели. Трајноста зависи од негата и не даваме гаранција.",
      },
      { name: "Example Test Studio", openingHours: [], services: [] },
    );

    test("answers from saved studio context and hands off an unknown product fact", async () => {
      const client = new OpenAI({
        apiKey:
          process.env.AI_FRONTDESK_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
        timeout: 30_000,
        maxRetries: 0,
      });
      for (const scenario of [
        {
          question: "Кој гел го користите и кога треба да дојдам на корекција?",
          handoff: false,
        },
        { question: "Дали производите ви содржат HEMA?", handoff: true },
      ]) {
        const response = await client.responses.create({
          model: "gpt-6-luna",
          instructions,
          input: scenario.question,
          store: false,
          reasoning: { effort: "low" },
          max_output_tokens: 1_500,
          text: { format: zodTextFormat(aiReplySchema, "frontdesk_smoke") },
        });
        expect(response.status).toBe("completed");
        const answer = parseReply(response.output_text);
        expect(answer).not.toBeNull();
        expect(answer?.handoff).toBe(scenario.handoff);
        if (!scenario.handoff) {
          expect(answer?.message).toContain("Example Gel");
          expect(answer?.message).toMatch(/3|три/);
        } else expect(answer?.confidenceScore).toBeLessThan(0.7);
      }
    }, 65_000);
  },
);
