import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import type { FloorItem, FloorPlanDraft } from "./floor-plan";

type Snapshot = FunctionReturnType<typeof api.floorPlans.get>;
export function floorPlanDraft(snapshot: Snapshot): FloorPlanDraft {
  return {
    width: snapshot.area.canvasWidth,
    height: snapshot.area.canvasHeight,
    items: [
      ...snapshot.tables.map(
        (table): FloorItem => ({
          id: table._id,
          kind: "table",
          label: table.label,
          x: table.x,
          y: table.y,
          width: table.width,
          height: table.height,
          rotation: table.rotation,
          shape: table.shape,
          locked: table.layoutLocked ?? false,
        }),
      ),
      ...snapshot.area.fixtures,
    ],
  };
}
