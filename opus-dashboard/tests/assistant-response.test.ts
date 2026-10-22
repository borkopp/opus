import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantResponse } from "@/components/business-assistant/AssistantResponse";
import { AssistantAnswerText } from "@/components/business-assistant/AssistantAnswerText";
import { AssistantComposer } from "@/components/business-assistant/AssistantComposer";
import { getExample } from "@/app/dashboard-preview/assistant/_lib/examples";

const motionPreference = vi.hoisted(() => ({
  reduced: null as boolean | null,
}));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionPreference.reduced,
}));
afterEach(() => {
  motionPreference.reduced = null;
});

vi.mock("@/components/dashboard-i18n-provider", () => ({
  useDashboardI18n: () => ({
    language: "en",
    locale: "en-GB",
    t: (text: string) => text,
  }),
}));

describe("assistant response presentation", () => {
  const turn = getExample("streaming", "en").turn;
  const props = {
    answer: turn.answer,
    question: turn.question,
    reports: turn.reports,
    turnId: turn._id,
    disabled: false,
    onPrompt: vi.fn(),
  };

  it("keeps the end of a long streamed answer visible after completion", () => {
    expect(turn.answer!.text.length).toBeGreaterThan(650);
    const streaming = renderToStaticMarkup(
      createElement(AssistantResponse, {
        ...props,
        streaming: true,
        streamedText: turn.answer!.text,
      }),
    );
    const completed = renderToStaticMarkup(
      createElement(AssistantResponse, props),
    );
    for (const html of [streaming, completed]) {
      expect(html).toContain("the period included in this answer.");
      expect(html).toContain('data-streamdown="strong"');
      expect(html).toContain("<ul");
      expect(html).not.toContain("Read the rest");
    }
    expect(streaming).not.toContain('aria-label="Copy answer"');
    expect(streaming).not.toContain("data-report-template");
    expect(completed).toContain('aria-label="Copy answer"');
    expect(completed).toContain('aria-label="Full report"');
    expect(completed).toContain("data-report-template");
  });

  it("shows review status before text, then announces writing without repeating every word", () => {
    const waiting = renderToStaticMarkup(
      createElement(AssistantResponse, { ...props, streaming: true }),
    );
    const writing = renderToStaticMarkup(
      createElement(AssistantResponse, {
        ...props,
        streaming: true,
        streamedText: "Your studio",
      }),
    );
    expect(waiting).toContain("Reviewing your appointments");
    expect(writing).toContain("Writing your answer");
    expect(writing).toContain('aria-live="off"');
    expect(writing).not.toContain("Reviewing your appointments");
  });

  it("renders prose without fetching images or creating model-supplied links and HTML", () => {
    const html = renderToStaticMarkup(
      createElement(AssistantAnswerText, {
        text: '**Studio** [click](https://example.com) ![pixel](https://example.com/pixel) <iframe src="https://example.com"></iframe><script>alert(1)</script>',
      }),
    );
    expect(html).toContain("Studio");
    expect(html).not.toMatch(/<(img|iframe|script|a)\b/);
    expect(html).not.toContain("https://example.com");
  });

  it("animates incoming words only during streaming and honors reduced motion", () => {
    motionPreference.reduced = false;
    const animated = renderToStaticMarkup(
      createElement(AssistantAnswerText, {
        text: "Hello studio",
        streaming: true,
      }),
    );
    expect(animated).toContain("data-sd-animate=");
    const saved = renderToStaticMarkup(
      createElement(AssistantAnswerText, {
        text: "Hello studio",
        streaming: false,
      }),
    );
    expect(saved).not.toContain("data-sd-animate=");
    motionPreference.reduced = true;
    const reduced = renderToStaticMarkup(
      createElement(AssistantAnswerText, {
        text: "Hello studio",
        streaming: true,
      }),
    );
    expect(reduced).not.toContain("data-sd-animate=");
  });

  it("keeps Free Detailed mode and sending locked while allowing a draft during streaming", () => {
    const html = renderToStaticMarkup(
      createElement(AssistantComposer, {
        question: "Next question",
        setQuestion: vi.fn(),
        depth: "standard",
        setDepth: vi.fn(),
        disabled: true,
        pending: true,
        detailedAllowed: false,
        deepRemaining: 0,
        onSend: vi.fn(),
      }),
    );
    expect(html.match(/<textarea[^>]*>/)?.[0]).not.toContain('disabled=""');
    expect(
      html.match(/<button[^>]*aria-label="Send question"[^>]*>/)?.[0],
    ).toContain('disabled=""');
    expect(html).toContain("Detailed analysis is available with OPUS Pro");
  });
});
