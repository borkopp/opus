import { describe, expect, it } from "vitest";
import {
  alignFloorItems,
  arrangeFloorTables,
  clampFloorItem,
  createFloorFixture,
  distributeFloorItems,
  findFloorTableOverlaps,
  floorItemsOverlap,
  getFloorItemBounds,
  getFloorItemCorners,
  MAX_FLOOR_ROOM_SIZE,
  moveFloorItems,
  normalizeFloorRotation,
  resizeFloorItem,
  resizeFloorItemFromCorner,
  snapFloorValue,
  type FloorAlignment,
  type FloorItem,
  type FloorPlanDraft,
  type FloorRoom,
} from "../../lib/floor-plan";

const table = (id: string, patch: Partial<FloorItem> = {}): FloorItem => ({
  id,
  kind: "table",
  label: id,
  x: 100,
  y: 100,
  width: 100,
  height: 60,
  rotation: 0,
  locked: false,
  shape: "rectangle",
  ...patch,
});
const plan = (
  items: FloorItem[],
  room: FloorRoom = { width: 800, height: 600 },
): FloorPlanDraft => ({ ...room, items });
const ids = (draft: FloorPlanDraft) => draft.items.map((item) => item.id);
const item = (draft: FloorPlanDraft, id: string) =>
  draft.items.find((entry) => entry.id === id)!;

function expectInRoom(value: FloorItem, room: FloorRoom) {
  for (const corner of getFloorItemCorners(value)) {
    expect(corner.x).toBeGreaterThanOrEqual(-1e-6);
    expect(corner.y).toBeGreaterThanOrEqual(-1e-6);
    expect(corner.x).toBeLessThanOrEqual(room.width + 1e-6);
    expect(corner.y).toBeLessThanOrEqual(room.height + 1e-6);
  }
}

describe("floor-plan coordinates and constraints", () => {
  it("rotates around the unrotated rectangle center, matching editor/backend coordinates", () => {
    const rotated = table("A", {
      x: 100,
      y: 80,
      width: 120,
      height: 40,
      rotation: 90,
    });
    expect(getFloorItemBounds(rotated)).toEqual({
      x: 140,
      y: 40,
      width: 40,
      height: 120,
    });
    const center = getFloorItemCorners(rotated).reduce(
      (sum, corner) => ({ x: sum.x + corner.x / 4, y: sum.y + corner.y / 4 }),
      { x: 0, y: 0 },
    );
    expect(center).toEqual({ x: 160, y: 100 });
  });

  it("normalizes rotation and snaps to the requested grid, including negative/invalid input", () => {
    expect(normalizeFloorRotation(-45)).toBe(315);
    expect(normalizeFloorRotation(765)).toBe(45);
    expect(normalizeFloorRotation(360)).toBe(0);
    expect(normalizeFloorRotation(Number.NaN)).toBe(0);
    expect(snapFloorValue(14)).toBe(10);
    expect(snapFloorValue(16)).toBe(20);
    expect(snapFloorValue(-16)).toBe(-20);
    expect(snapFloorValue(13, 5)).toBe(15);
    expect(snapFloorValue(16, 0)).toBe(20);
    expect(snapFloorValue(Number.POSITIVE_INFINITY)).toBe(0);
    expect(Object.is(snapFloorValue(-1), -0)).toBe(false);
  });

  it.each([0, 15, 45, 90, 135, 210, 270, 315])(
    "clamps every rotated corner inside the room at %s degrees without changing identity",
    (rotation) => {
      const original = table("stable-table-id", {
        x: -80,
        y: 300,
        width: 160,
        height: 70,
        rotation,
        shape: "booth",
      });
      const room = { width: 220, height: 200 };
      const clamped = clampFloorItem(original, room);
      expectInRoom(clamped, room);
      expect(clamped).toMatchObject({
        id: original.id,
        kind: "table",
        label: original.label,
        shape: "booth",
        width: 160,
        height: 70,
        rotation,
      });
      expect(original.x).toBe(-80);
      expect(original.y).toBe(300);
    },
  );

  it("fits oversized rotated fixtures while preserving minimum dimensions and all finite values", () => {
    const room = { width: 200, height: 220 };
    const fixture = table("wall", {
      kind: "wall",
      width: 4000,
      height: 10,
      rotation: 45,
      x: -200,
      y: -200,
    });
    const result = clampFloorItem(fixture, room);
    expectInRoom(result, room);
    expect(result.height).toBeGreaterThanOrEqual(10);
    expect(result.width).toBeGreaterThanOrEqual(10);
    expect(result.rotation).toBe(45);
    const bad = clampFloorItem(
      table("invalid", {
        x: Number.NaN,
        y: Number.POSITIVE_INFINITY,
        width: -8,
        height: Number.NaN,
        rotation: Number.NaN,
      }),
      room,
    );
    expect(bad).toMatchObject({
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      rotation: 0,
    });
    expectInRoom(bad, room);
  });

  it("resizes and snaps unlocked tables within rotated room bounds, respecting table size limits", () => {
    const room = { width: 260, height: 200 };
    const original = table("A", { x: 160, y: 120, rotation: 45 });
    const result = resizeFloorItem(original, { width: 900, height: 75 }, room);
    expectInRoom(result, room);
    expect(result.width).toBeLessThanOrEqual(600);
    expect(result.width).toBeGreaterThanOrEqual(40);
    expect(result.height).toBeGreaterThanOrEqual(40);
    expect(
      resizeFloorItem(
        table("B"),
        { width: 126, height: 74 },
        { width: 800, height: 600 },
      ),
    ).toMatchObject({ width: 130, height: 70 });
    expect(
      resizeFloorItem(
        table("B"),
        { width: 126, height: 74 },
        { width: 800, height: 600 },
        { snap: false },
      ),
    ).toMatchObject({ width: 126, height: 74 });
    const locked = table("locked", { locked: true });
    expect(resizeFloorItem(locked, { width: 200, height: 200 }, room)).toBe(
      locked,
    );
  });
});

describe("selection transforms", () => {
  it.each([0, 45, 90, 270])(
    "keeps the opposite corner fixed when dragging a %s-degree resize handle",
    (rotation) => {
      const original = table("A", { x: 250, y: 200, rotation });
      const radians = (rotation * Math.PI) / 180;
      const delta = {
        x: 20 * Math.cos(radians) - 30 * Math.sin(radians),
        y: 20 * Math.sin(radians) + 30 * Math.cos(radians),
      };
      const result = resizeFloorItemFromCorner(
        original,
        delta,
        { width: 800, height: 600 },
        { snap: false },
      );
      const before = getFloorItemCorners(original);
      const after = getFloorItemCorners(result);
      expect(result.width).toBeCloseTo(120);
      expect(result.height).toBeCloseTo(90);
      expect(after[0].x).toBeCloseTo(before[0].x);
      expect(after[0].y).toBeCloseTo(before[0].y);
      expect(after[2].x - before[2].x).toBeCloseTo(delta.x);
      expect(after[2].y - before[2].y).toBeCloseTo(delta.y);
    },
  );

  it("constrains corner resizing at the room edge without dragging its anchor or locked items", () => {
    const room = { width: 400, height: 300 };
    const original = table("A", { x: 210, y: 130, rotation: 45 });
    const result = resizeFloorItemFromCorner(
      original,
      { x: 1000, y: 1000 },
      room,
    );
    expectInRoom(result, room);
    const before = getFloorItemCorners(original)[0];
    const after = getFloorItemCorners(result)[0];
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    const locked = { ...original, locked: true };
    expect(resizeFloorItemFromCorner(locked, { x: 20, y: 20 }, room)).toBe(
      locked,
    );
    const snapped = resizeFloorItemFromCorner(
      table("B"),
      { x: 16, y: 24 },
      { width: 800, height: 600 },
    );
    expect(snapped).toMatchObject({ width: 120, height: 80 });
  });

  it("snaps one group translation and excludes locked/unselected items without changing spacing", () => {
    const original = plan([
      table("A", { rotation: 45 }),
      table("B", { x: 280, y: 210, rotation: 15 }),
      table("locked", { x: 0, y: 0, locked: true }),
      table("unselected", { x: 500 }),
    ]);
    const snapshot = structuredClone(original);
    const moved = moveFloorItems(
      original,
      ["A", "B", "locked", "missing"],
      17,
      26,
    );
    for (const id of ["A", "B"]) {
      expect(item(moved, id).x - item(original, id).x).toBe(20);
      expect(item(moved, id).y - item(original, id).y).toBe(30);
      expect(item(moved, id).rotation).toBe(item(original, id).rotation);
    }
    expect(item(moved, "locked")).toBe(item(original, "locked"));
    expect(item(moved, "unselected")).toBe(item(original, "unselected"));
    expect(original).toEqual(snapshot);
  });

  it("clamps a rotated group's shared delta at each room edge without separating its members", () => {
    const original = plan([
      table("A", { x: 150, rotation: 45 }),
      table("B", { x: 420, y: 250, rotation: 30 }),
    ]);
    for (const [dx, dy] of [
      [-1000, -1000],
      [1000, 1000],
    ]) {
      const moved = moveFloorItems(original, ids(original), dx, dy);
      moved.items.forEach((entry) => expectInRoom(entry, moved));
      expect(item(moved, "B").x - item(moved, "A").x).toBeCloseTo(270);
      expect(item(moved, "B").y - item(moved, "A").y).toBeCloseTo(150);
      const bounds = moved.items.map(getFloorItemBounds);
      if (dx < 0) {
        expect(Math.min(...bounds.map((bound) => bound.x))).toBeCloseTo(0);
        expect(Math.min(...bounds.map((bound) => bound.y))).toBeCloseTo(0);
      } else {
        expect(
          Math.max(...bounds.map((bound) => bound.x + bound.width)),
        ).toBeCloseTo(moved.width);
        expect(
          Math.max(...bounds.map((bound) => bound.y + bound.height)),
        ).toBeCloseTo(moved.height);
      }
    }
  });

  it("supports unsnapped fine movement and leaves empty/locked or overlarge groups untouched", () => {
    const original = plan([table("A"), table("locked", { locked: true })]);
    expect(
      item(moveFloorItems(original, ["A"], 3, -2, { snap: false }), "A"),
    ).toMatchObject({ x: 103, y: 98 });
    expect(moveFloorItems(original, ["locked"], 20, 20)).toBe(original);
    expect(moveFloorItems(original, [], 20, 20)).toBe(original);
    const tooLarge = plan([table("A", { x: 0 }), table("B", { x: 900 })]);
    expect(moveFloorItems(tooLarge, ids(tooLarge), 10, 10)).toBe(tooLarge);
  });

  it.each([
    "left",
    "center",
    "right",
    "top",
    "middle",
    "bottom",
  ] satisfies FloorAlignment[])(
    "aligns rotated selection %s while leaving locked objects unchanged",
    (alignment) => {
      const original = plan([
        table("A", { x: 100, y: 100, rotation: 45 }),
        table("B", { x: 400, y: 300, width: 70, height: 100, rotation: 15 }),
        table("locked", { x: 680, y: 490, locked: true }),
      ]);
      const result = alignFloorItems(original, ids(original), alignment);
      expect(item(result, "locked")).toBe(item(original, "locked"));
      const bounds = result.items.slice(0, 2).map(getFloorItemBounds);
      const coordinate = (bound: ReturnType<typeof getFloorItemBounds>) =>
        ({
          left: bound.x,
          center: bound.x + bound.width / 2,
          right: bound.x + bound.width,
          top: bound.y,
          middle: bound.y + bound.height / 2,
          bottom: bound.y + bound.height,
        })[alignment];
      expect(coordinate(bounds[0])).toBeCloseTo(coordinate(bounds[1]));
      result.items.forEach((entry) => expectInRoom(entry, result));
      for (const entry of result.items)
        expect(entry.rotation).toBe(item(original, entry.id).rotation);
    },
  );

  it.each(["horizontal", "vertical"] as const)(
    "distributes %s edge gaps for three unlocked rotated items",
    (direction) => {
      const original = plan([
        table("A", { x: 90, y: 60, rotation: 10 }),
        table("B", { x: 170, y: 150, width: 50, height: 90, rotation: 20 }),
        table("C", { x: 620, y: 430, width: 70, rotation: 30 }),
        table("locked", { x: 0, y: 0, locked: true }),
      ]);
      const result = distributeFloorItems(original, ids(original), direction);
      const axis = direction === "horizontal" ? "x" : "y";
      const cross = direction === "horizontal" ? "y" : "x";
      const size = direction === "horizontal" ? "width" : "height";
      const before = original.items.slice(0, 3).map(getFloorItemBounds);
      const after = result.items.slice(0, 3).map(getFloorItemBounds);
      expect(after[1][axis] - after[0][axis] - after[0][size]).toBeCloseTo(
        after[2][axis] - after[1][axis] - after[1][size],
      );
      expect(after[0][axis]).toBeCloseTo(before[0][axis]);
      expect(after[2][axis] + after[2][size]).toBeCloseTo(
        before[2][axis] + before[2][size],
      );
      for (const entry of result.items)
        expect(entry[cross]).toBe(item(original, entry.id)[cross]);
      expect(item(result, "locked")).toBe(item(original, "locked"));
      expect(
        distributeFloorItems(original, ["A", "B", "locked"], direction),
      ).toBe(original);
    },
  );
});

describe("overlap and layout assistance", () => {
  it("uses rotated polygon intersection instead of false positives from axis-aligned boxes", () => {
    const a = table("A", { width: 120, height: 10, rotation: 45 });
    const separate = { ...a, id: "B", y: a.y + 30 };
    const aBounds = getFloorItemBounds(a);
    const bBounds = getFloorItemBounds(separate);
    expect(aBounds.y + aBounds.height).toBeGreaterThan(bBounds.y);
    expect(floorItemsOverlap(a, separate)).toBe(false);
    expect(floorItemsOverlap(a, { ...separate, y: a.y + 5 })).toBe(true);
  });

  it("allows edge touching and warns once per table pair, including locked tables but excluding fixtures", () => {
    const a = table("A", { x: 0, y: 0 });
    const b = table("B", { x: 100, y: 0 });
    expect(floorItemsOverlap(a, b)).toBe(false);
    const locked = table("C", { x: 50, y: 0, locked: true });
    const fixture = { ...a, id: "bar", kind: "bar" as const };
    expect(findFloorTableOverlaps([a, b, locked, fixture])).toEqual([
      ["A", "C"],
      ["B", "C"],
    ]);
  });

  it("arranges unlocked tables around locked tables and decoration without mutating resource metadata", () => {
    const original = plan(
      [
        table("A", { x: 20, y: 20, rotation: 45, shape: "booth" }),
        table("B", { x: 20, y: 20, rotation: 90 }),
        table("fixed", { x: 20, y: 20, locked: true }),
        table("bar", { kind: "bar", x: 150, y: 20, width: 100, height: 220 }),
      ],
      { width: 500, height: 400 },
    );
    const snapshot = structuredClone(original);
    const result = arrangeFloorTables(original);
    expect(item(result, "fixed")).toBe(item(original, "fixed"));
    expect(item(result, "bar")).toBe(item(original, "bar"));
    for (const id of ["A", "B"]) {
      const arranged = item(result, id);
      const { x: _x, y: _y, ...metadata } = arranged;
      void _x;
      void _y;
      expect(item(original, id)).toMatchObject(metadata);
      expectInRoom(arranged, result);
      for (const other of result.items.filter((entry) => entry.id !== id))
        expect(floorItemsOverlap(arranged, other)).toBe(false);
    }
    expect(original).toEqual(snapshot);
  });

  it("expands room within the maximum when needed and leaves an impossible arrangement wholly unchanged", () => {
    const original = plan(
      Array.from({ length: 10 }, (_, index) =>
        table(`table-${index}`, { x: 20, y: 20, width: 100, height: 100 }),
      ),
      { width: 200, height: 200 },
    );
    const result = arrangeFloorTables(original);
    expect(result.width * result.height).toBeGreaterThan(200 * 200);
    expect(result.width).toBeLessThanOrEqual(MAX_FLOOR_ROOM_SIZE);
    expect(result.height).toBeLessThanOrEqual(MAX_FLOOR_ROOM_SIZE);
    expect(findFloorTableOverlaps(result.items)).toEqual([]);
    result.items.forEach((entry) => expectInRoom(entry, result));
    const blocked = plan(
      [
        table("fixed", { kind: "wall", x: 0, y: 0, width: 4000, height: 4000 }),
        table("A"),
      ],
      { width: 4000, height: 4000 },
    );
    expect(arrangeFloorTables(blocked)).toBe(blocked);
    expect(
      arrangeFloorTables(plan([table("locked", { locked: true })])).items[0]
        .locked,
    ).toBe(true);
  });

  it.each(["wall", "bar", "door", "plant", "label"] as const)(
    "creates a bounded %s fixture with stable identity",
    (kind) => {
      const room = { width: 200, height: 200 };
      const fixture = createFloorFixture(kind, "fixture-uuid", room);
      expect(fixture).toMatchObject({
        id: "fixture-uuid",
        kind,
        locked: false,
        rotation: 0,
      });
      expect(fixture.label.length).toBeGreaterThan(0);
      expect(fixture.width).toBeGreaterThanOrEqual(10);
      expect(fixture.height).toBeGreaterThanOrEqual(10);
      expectInRoom(fixture, room);
    },
  );
});
