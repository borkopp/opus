export type FloorItemKind =
  | "table"
  | "wall"
  | "bar"
  | "door"
  | "plant"
  | "label";
export type FloorItem = {
  /** Physical table ID for tables; a separate, stable ID for decorative fixtures. */
  id: string;
  kind: FloorItemKind;
  label: string;
  /** Unrotated top-left position. Rotation is clockwise around the item's center. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  shape?: "rectangle" | "circle" | "booth";
};
export type FloorPlanDraft = {
  width: number;
  height: number;
  items: FloorItem[];
};
export type FloorRoom = Pick<FloorPlanDraft, "width" | "height">;
export type FloorPoint = { x: number; y: number };
export type FloorBounds = FloorPoint & FloorRoom;
export type FloorGeometry = Pick<
  FloorItem,
  "x" | "y" | "width" | "height" | "rotation"
>;
export type FloorSnapOptions = { snap?: boolean; grid?: number };
export type FloorAlignment =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

export const FLOOR_GRID_SIZE = 10;
export const MIN_FLOOR_ROOM_SIZE = 200;
export const MAX_FLOOR_ROOM_SIZE = 4000;
export const MIN_FLOOR_TABLE_SIZE = 40;
export const MAX_FLOOR_TABLE_SIZE = 600;
export const MIN_FLOOR_FIXTURE_SIZE = 10;
export const MAX_FLOOR_FIXTURE_SIZE = 4000;
const EPSILON = 1e-7;

const finite = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const roomSize = (value: number) =>
  clamp(
    finite(value, MIN_FLOOR_ROOM_SIZE),
    MIN_FLOOR_ROOM_SIZE,
    MAX_FLOOR_ROOM_SIZE,
  );

export function normalizeFloorRotation(degrees: number) {
  return ((finite(degrees, 0) % 360) + 360) % 360;
}

export function snapFloorValue(value: number, grid = FLOOR_GRID_SIZE) {
  const step = Number.isFinite(grid) && grid > 0 ? grid : FLOOR_GRID_SIZE;
  const result = Math.round(finite(value, 0) / step) * step;
  return Object.is(result, -0) ? 0 : result;
}

export function getFloorItemCorners(item: FloorGeometry): FloorPoint[] {
  const angle = (normalizeFloorRotation(item.rotation) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sy]) => {
    const x = (sx * item.width) / 2;
    const y = (sy * item.height) / 2;
    return { x: cx + x * cos - y * sin, y: cy + x * sin + y * cos };
  });
}

export function getFloorItemBounds(item: FloorGeometry): FloorBounds {
  const points = getFloorItemCorners(item);
  const x = Math.min(...points.map((point) => point.x));
  const y = Math.min(...points.map((point) => point.y));
  return {
    x,
    y,
    width: Math.max(...points.map((point) => point.x)) - x,
    height: Math.max(...points.map((point) => point.y)) - y,
  };
}

/** Shared backend/editor convention; these are bounds of the rotated rectangle. */
export const rotatedBounds = getFloorItemBounds;

/** Normalize dimensions and fit the entire rotated footprint; this low-level helper ignores locks. */
export function clampFloorItem(item: FloorItem, room: FloorRoom): FloorItem {
  const min =
    item.kind === "table" ? MIN_FLOOR_TABLE_SIZE : MIN_FLOOR_FIXTURE_SIZE;
  const max =
    item.kind === "table" ? MAX_FLOOR_TABLE_SIZE : MAX_FLOOR_FIXTURE_SIZE;
  const width = roomSize(room.width);
  const height = roomSize(room.height);
  const normalized = {
    ...item,
    x: finite(item.x, 0),
    y: finite(item.y, 0),
    width: clamp(finite(item.width, min), min, max),
    height: clamp(finite(item.height, min), min, max),
    rotation: normalizeFloorRotation(item.rotation),
  };
  // Interpolate toward the minimum size so even very thin rotated fixtures remain valid.
  const fits = (scale: number) => {
    const candidate = {
      ...normalized,
      width: min + (normalized.width - min) * scale,
      height: min + (normalized.height - min) * scale,
    };
    const bounds = getFloorItemBounds(candidate);
    return {
      candidate,
      fits: bounds.width <= width && bounds.height <= height,
    };
  };
  if (!fits(1).fits) {
    let low = 0;
    let high = 1;
    for (let step = 0; step < 40; step++) {
      const middle = (low + high) / 2;
      if (fits(middle).fits) low = middle;
      else high = middle;
    }
    Object.assign(normalized, fits(low).candidate);
  }
  const bounds = getFloorItemBounds(normalized);
  return {
    ...normalized,
    x: normalized.x + clamp(bounds.x, 0, width - bounds.width) - bounds.x,
    y: normalized.y + clamp(bounds.y, 0, height - bounds.height) - bounds.y,
  };
}

function selectedItems(draft: FloorPlanDraft, ids: readonly string[]) {
  const selected = new Set(ids);
  return draft.items.filter((item) => selected.has(item.id) && !item.locked);
}

function groupBounds(items: readonly FloorItem[]): FloorBounds {
  const bounds = items.map(getFloorItemBounds);
  const x = Math.min(...bounds.map((item) => item.x));
  const y = Math.min(...bounds.map((item) => item.y));
  return {
    x,
    y,
    width: Math.max(...bounds.map((item) => item.x + item.width)) - x,
    height: Math.max(...bounds.map((item) => item.y + item.height)) - y,
  };
}

function replaceItems(
  draft: FloorPlanDraft,
  items: readonly FloorItem[],
): FloorPlanDraft {
  const changed = new Map(items.map((item) => [item.id, item]));
  return {
    ...draft,
    items: draft.items.map((item) => changed.get(item.id) ?? item),
  };
}

/** Snap one shared translation, then constrain the group; individual positions never drift. */
export function moveFloorItems(
  draft: FloorPlanDraft,
  ids: readonly string[],
  dx: number,
  dy: number,
  options: FloorSnapOptions = {},
): FloorPlanDraft {
  const selected = selectedItems(draft, ids);
  if (!selected.length) return draft;
  const bounds = groupBounds(selected);
  if (
    bounds.width > draft.width + EPSILON ||
    bounds.height > draft.height + EPSILON
  )
    return draft;
  const moveX =
    options.snap === false ? finite(dx, 0) : snapFloorValue(dx, options.grid);
  const moveY =
    options.snap === false ? finite(dy, 0) : snapFloorValue(dy, options.grid);
  const x = clamp(moveX, -bounds.x, draft.width - bounds.x - bounds.width);
  const y = clamp(moveY, -bounds.y, draft.height - bounds.y - bounds.height);
  return replaceItems(
    draft,
    selected.map((item) => ({ ...item, x: item.x + x, y: item.y + y })),
  );
}

export function resizeFloorItem(
  item: FloorItem,
  size: FloorRoom,
  room: FloorRoom,
  options: FloorSnapOptions = {},
): FloorItem {
  if (item.locked) return item;
  return clampFloorItem(
    {
      ...item,
      width:
        options.snap === false
          ? size.width
          : snapFloorValue(size.width, options.grid),
      height:
        options.snap === false
          ? size.height
          : snapFloorValue(size.height, options.grid),
    },
    room,
  );
}

/** Drag the rotated bottom-right handle while keeping the opposite world-space corner fixed. */
export function resizeFloorItemFromCorner(
  item: FloorItem,
  delta: FloorPoint,
  room: FloorRoom,
  options: FloorSnapOptions = {},
): FloorItem {
  if (item.locked) return item;
  const original = clampFloorItem(item, room);
  const anchor = getFloorItemCorners(original)[0];
  const radians = (original.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const min =
    item.kind === "table" ? MIN_FLOOR_TABLE_SIZE : MIN_FLOOR_FIXTURE_SIZE;
  const max =
    item.kind === "table" ? MAX_FLOOR_TABLE_SIZE : MAX_FLOOR_FIXTURE_SIZE;
  const dx = finite(delta.x, 0);
  const dy = finite(delta.y, 0);
  const size = (value: number) =>
    clamp(
      options.snap === false ? value : snapFloorValue(value, options.grid),
      min,
      max,
    );
  const desiredWidth = size(original.width + dx * cos + dy * sin);
  const desiredHeight = size(original.height - dx * sin + dy * cos);
  const candidate = (progress: number): FloorItem => {
    const width = original.width + (desiredWidth - original.width) * progress;
    const height =
      original.height + (desiredHeight - original.height) * progress;
    const centerX = anchor.x + (width / 2) * cos - (height / 2) * sin;
    const centerY = anchor.y + (width / 2) * sin + (height / 2) * cos;
    return {
      ...original,
      width,
      height,
      x: centerX - width / 2,
      y: centerY - height / 2,
    };
  };
  const fits = (value: FloorItem) => {
    const bounds = getFloorItemBounds(value);
    return (
      bounds.x >= -EPSILON &&
      bounds.y >= -EPSILON &&
      bounds.x + bounds.width <= roomSize(room.width) + EPSILON &&
      bounds.y + bounds.height <= roomSize(room.height) + EPSILON
    );
  };
  if (fits(candidate(1))) return candidate(1);
  // Every corner is linear in the two dimensions; interpolate to the first room edge.
  let low = 0;
  let high = 1;
  for (let step = 0; step < 40; step++) {
    const middle = (low + high) / 2;
    if (fits(candidate(middle))) low = middle;
    else high = middle;
  }
  return candidate(low);
}

/** Align the rotated outer edges of unlocked selections; locked items are neither moved nor anchors. */
export function alignFloorItems(
  draft: FloorPlanDraft,
  ids: readonly string[],
  alignment: FloorAlignment,
): FloorPlanDraft {
  const selected = selectedItems(draft, ids);
  if (selected.length < 2) return draft;
  const group = groupBounds(selected);
  return replaceItems(
    draft,
    selected.map((item) => {
      const bounds = getFloorItemBounds(item);
      let dx = 0;
      let dy = 0;
      if (alignment === "left") dx = group.x - bounds.x;
      if (alignment === "center")
        dx = group.x + group.width / 2 - bounds.x - bounds.width / 2;
      if (alignment === "right")
        dx = group.x + group.width - bounds.x - bounds.width;
      if (alignment === "top") dy = group.y - bounds.y;
      if (alignment === "middle")
        dy = group.y + group.height / 2 - bounds.y - bounds.height / 2;
      if (alignment === "bottom")
        dy = group.y + group.height - bounds.y - bounds.height;
      return { ...item, x: item.x + dx, y: item.y + dy };
    }),
  );
}

/** Equal edge-to-edge gaps, preserving the two outer edges and the other coordinate. */
export function distributeFloorItems(
  draft: FloorPlanDraft,
  ids: readonly string[],
  direction: "horizontal" | "vertical",
): FloorPlanDraft {
  const selected = selectedItems(draft, ids);
  if (selected.length < 3) return draft;
  const horizontal = direction === "horizontal";
  const axis = horizontal ? "x" : "y";
  const size = horizontal ? "width" : "height";
  const ordered = selected
    .map((item) => ({ item, bounds: getFloorItemBounds(item) }))
    .sort((a, b) => a.bounds[axis] - b.bounds[axis]);
  const group = groupBounds(selected);
  const gap =
    (group[size] - ordered.reduce((sum, { bounds }) => sum + bounds[size], 0)) /
    (ordered.length - 1);
  let cursor = group[axis];
  return replaceItems(
    draft,
    ordered.map(({ item, bounds }) => {
      const moved = { ...item, [axis]: item[axis] + cursor - bounds[axis] };
      cursor += bounds[size] + gap;
      return moved;
    }),
  );
}

function boundsOverlap(a: FloorBounds, b: FloorBounds, gap = 0) {
  return (
    a.x < b.x + b.width + gap - EPSILON &&
    a.x + a.width > b.x - gap + EPSILON &&
    a.y < b.y + b.height + gap - EPSILON &&
    a.y + a.height > b.y - gap + EPSILON
  );
}

/** Separating-axis intersection of the rotated rectangular footprints. Edge touching is allowed. */
export function floorItemsOverlap(a: FloorGeometry, b: FloorGeometry): boolean {
  if (!boundsOverlap(getFloorItemBounds(a), getFloorItemBounds(b)))
    return false;
  const polygonA = getFloorItemCorners(a);
  const polygonB = getFloorItemCorners(b);
  for (const polygon of [polygonA, polygonB]) {
    for (let index = 0; index < 2; index++) {
      const first = polygon[index];
      const next = polygon[index + 1];
      const length = Math.hypot(next.x - first.x, next.y - first.y);
      if (length <= EPSILON) return false;
      const axis = {
        x: -(next.y - first.y) / length,
        y: (next.x - first.x) / length,
      };
      const projectedA = polygonA.map(
        (point) => point.x * axis.x + point.y * axis.y,
      );
      const projectedB = polygonB.map(
        (point) => point.x * axis.x + point.y * axis.y,
      );
      if (
        Math.max(...projectedA) <= Math.min(...projectedB) + EPSILON ||
        Math.max(...projectedB) <= Math.min(...projectedA) + EPSILON
      )
        return false;
    }
  }
  return true;
}

/** Conservative for round/booth tables: warnings use each table's rotated rectangular footprint. */
export function findFloorTableOverlaps(
  items: readonly FloorItem[],
): [string, string][] {
  const tables = items.filter((item) => item.kind === "table");
  const overlaps: [string, string][] = [];
  for (let a = 0; a < tables.length; a++)
    for (let b = a + 1; b < tables.length; b++)
      if (
        tables[a].id !== tables[b].id &&
        floorItemsOverlap(tables[a], tables[b])
      )
        overlaps.push([tables[a].id, tables[b].id]);
  return overlaps;
}

/** Place only unlocked tables around fixed fixtures/locked tables. An impossible arrangement is a no-op. */
export function arrangeFloorTables(draft: FloorPlanDraft): FloorPlanDraft {
  const movable = draft.items.filter(
    (item) => item.kind === "table" && !item.locked,
  );
  if (!movable.length) return draft;
  const obstacles = draft.items
    .filter((item) => item.kind !== "table" || item.locked)
    .map(getFloorItemBounds);
  const gap = 20;
  let width = roomSize(draft.width);
  let height = roomSize(draft.height);
  const arranged: FloorItem[] = [];
  const ceilGrid = (value: number) =>
    Math.ceil(value / FLOOR_GRID_SIZE) * FLOOR_GRID_SIZE;
  for (const item of movable) {
    const bounds = getFloorItemBounds(item);
    let position: FloorPoint | undefined;
    while (!position) {
      const ys = [
        ...new Set([
          gap,
          ...obstacles.map((obstacle) =>
            ceilGrid(obstacle.y + obstacle.height + gap),
          ),
        ]),
      ].sort((a, b) => a - b);
      for (const y of ys) {
        if (y + bounds.height > height - gap + EPSILON) continue;
        let x = gap;
        while (x + bounds.width <= width - gap + EPSILON) {
          const candidate = {
            x,
            y,
            width: bounds.width,
            height: bounds.height,
          };
          const collision = obstacles.find((obstacle) =>
            boundsOverlap(candidate, obstacle, gap),
          );
          if (!collision) {
            position = { x, y };
            break;
          }
          x = Math.max(
            x + FLOOR_GRID_SIZE,
            ceilGrid(collision.x + collision.width + gap),
          );
        }
        if (position) break;
      }
      if (position) break;
      if (width === MAX_FLOOR_ROOM_SIZE && height === MAX_FLOOR_ROOM_SIZE)
        return draft;
      width = Math.min(MAX_FLOOR_ROOM_SIZE, width + 200);
      height = Math.min(MAX_FLOOR_ROOM_SIZE, height + 200);
    }
    const moved = {
      ...item,
      x: item.x + position.x - bounds.x,
      y: item.y + position.y - bounds.y,
    };
    arranged.push(moved);
    obstacles.push(getFloorItemBounds(moved));
  }
  return { ...replaceItems(draft, arranged), width, height };
}

export function createFloorFixture(
  kind: Exclude<FloorItemKind, "table">,
  id: string,
  room: FloorRoom,
): FloorItem {
  const defaults = {
    wall: { label: "Wall", width: 200, height: 20 },
    bar: { label: "Bar", width: 180, height: 60 },
    door: { label: "Door", width: 80, height: 20 },
    plant: { label: "Plant", width: 40, height: 40 },
    label: { label: "Label", width: 120, height: 30 },
  }[kind];
  return clampFloorItem(
    {
      id,
      kind,
      ...defaults,
      x: snapFloorValue((roomSize(room.width) - defaults.width) / 2),
      y: snapFloorValue((roomSize(room.height) - defaults.height) / 2),
      rotation: 0,
      locked: false,
    },
    room,
  );
}
