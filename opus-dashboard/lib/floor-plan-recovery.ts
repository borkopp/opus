import type { FloorPlanDraft } from "./floor-plan";

export type FloorPlanBaseline = {
  version: string;
  revision: number;
  draft: FloorPlanDraft;
};
export type FloorPlanRecovery = {
  baseline: FloorPlanBaseline;
  draft: FloorPlanDraft;
};

/** A tab-private recovery draft is untrusted input, never an authoritative layout. */
export function readFloorPlanRecovery(
  raw: string | null,
): FloorPlanRecovery | null {
  if (!raw || raw.length > 1_000_000) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!record(data) || !record(data.baseline)) return null;
    if (
      typeof data.baseline.version !== "string" ||
      data.baseline.version.length > 30_000 ||
      !Number.isSafeInteger(data.baseline.revision) ||
      (data.baseline.revision as number) < 0
    )
      return null;
    if (!validDraft(data.draft) || !validDraft(data.baseline.draft))
      return null;
    return data as FloorPlanRecovery;
  } catch {
    return null;
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validDraft(value: unknown): value is FloorPlanDraft {
  if (
    !record(value) ||
    !Number.isFinite(value.width) ||
    !Number.isFinite(value.height) ||
    (value.width as number) < 200 ||
    (value.width as number) > 4000 ||
    (value.height as number) < 200 ||
    (value.height as number) > 4000 ||
    !Array.isArray(value.items) ||
    value.items.length > 400
  )
    return false;
  const ids = new Set<string>();
  return value.items.every((item: unknown) => {
    if (
      !record(item) ||
      typeof item.id !== "string" ||
      !item.id ||
      item.id.length > 100 ||
      ids.has(item.id) ||
      typeof item.label !== "string" ||
      item.label.length > 120 ||
      typeof item.locked !== "boolean" ||
      !["table", "wall", "bar", "door", "plant", "label"].includes(
        item.kind as string,
      ) ||
      ![item.x, item.y, item.width, item.height, item.rotation].every(
        Number.isFinite,
      ) ||
      (item.width as number) <= 0 ||
      (item.height as number) <= 0
    )
      return false;
    if (
      item.kind === "table" &&
      !["rectangle", "circle", "booth"].includes(item.shape as string)
    )
      return false;
    ids.add(item.id);
    return true;
  });
}
