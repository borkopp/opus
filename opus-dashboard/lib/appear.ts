import type { CSSProperties } from "react";

/** Cap list staggering so large teams and schedules stay responsive. */
export function appearStep(step: number): CSSProperties {
  return { "--appear-step": Math.min(step, 8) } as CSSProperties;
}
