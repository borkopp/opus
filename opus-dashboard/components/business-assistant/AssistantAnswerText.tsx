"use client";

import { useReducedMotion } from "motion/react";
import { Streamdown } from "streamdown";

// Reports remain structured components. Model prose may use basic formatting,
// but must not load remote images or create links from studio-provided data.
const proseElements = [
  "p",
  "br",
  "strong",
  "em",
  "del",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "hr",
  "code",
  "pre",
  "span",
];

export function AssistantAnswerText({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Streamdown
      data-assistant-answer
      className="assistant-answer min-w-0 text-sm leading-relaxed"
      mode="streaming"
      isAnimating={streaming}
      animated={
        reducedMotion === false ? { animation: "fadeIn", duration: 150 } : false
      }
      caret={streaming && text ? "block" : undefined}
      controls={false}
      allowedElements={proseElements}
      unwrapDisallowed
      skipHtml
      aria-live="off"
    >
      {text}
    </Streamdown>
  );
}
