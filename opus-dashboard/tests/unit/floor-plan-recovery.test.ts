import { describe, expect, it } from "vitest";
import { readFloorPlanRecovery } from "../../lib/floor-plan-recovery";

const draft = {
  width: 800,
  height: 600,
  items: [
    {
      id: "table-1",
      kind: "table",
      label: "T1",
      x: 20,
      y: 30,
      width: 100,
      height: 100,
      rotation: 0,
      shape: "rectangle",
      locked: false,
    },
  ],
};
const recovery = {
  baseline: { version: "0:table-1", revision: 0, draft },
  draft: { ...draft, items: [{ ...draft.items[0], x: 80 }] },
};
describe("tab-private floor plan recovery", () => {
  it("retains the original revision and draft so concurrent changes remain detectable", () => {
    expect(readFloorPlanRecovery(JSON.stringify(recovery))).toEqual(recovery);
  });
  it.each([
    null,
    "{bad",
    "null",
    "[]",
    JSON.stringify({
      baseline: recovery.baseline,
      draft: { ...draft, items: [draft.items[0], draft.items[0]] },
    }),
    JSON.stringify({
      ...recovery,
      baseline: { ...recovery.baseline, revision: -1 },
    }),
    JSON.stringify({
      ...recovery,
      draft: { ...draft, items: [{ ...draft.items[0], shape: "unknown" }] },
    }),
  ])("ignores corrupted or incompatible drafts %s", (raw) => {
    expect(readFloorPlanRecovery(raw)).toBeNull();
  });
});
