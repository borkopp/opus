"use client";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { useState } from "react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  closureTimeInput,
  closureTimeOptions,
  resolveClosureTime,
  type ClosureTimeInput,
} from "@/lib/reservation-closure-time";
import { ReservationSettingsNotice } from "./ReservationSettingsNotice";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { localDate, localTimeLabel } from "@/convex/lib/reservationTime";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReservationAction } from "@/hooks/use-reservation-action";
import {
  ReservationError,
  ReservationInput,
  ReservationSelect,
} from "./ReservationFields";

type Workspace = FunctionReturnType<typeof api.hospitality.getWorkspace>;
type Editor =
  | { kind: "area"; row?: Doc<"floor_plans"> }
  | { kind: "table"; row?: Doc<"tables"> }
  | { kind: "combination"; row?: Doc<"table_combinations"> }
  | { kind: "closure"; row?: Doc<"reservation_closures"> };

export function VenueResources({
  workspace,
  closuresOnly = false,
  section,
}: {
  workspace: Workspace;
  closuresOnly?: boolean;
  section?: "area" | "table" | "combination";
}) {
  const copy = useReservationCopy();
  const [editor, setEditor] = useState<Editor | null>(null);
  const remove = useMutation(api.hospitality.removeResource);
  const action = useReservationAction();
  const timezone = workspace.settings?.timezone ?? "Europe/Skopje";
  if (workspace.role === "staff") return null;
  if (closuresOnly && !workspace.canReadReservations)
    return <ReservationSettingsNotice missing={!workspace.settings} />;
  const groups = closuresOnly
    ? (["closure"] as const)
    : section
      ? [section]
      : (["area", "table", "combination"] as const);
  return (
    <div className="flex flex-col gap-6">
      <ReservationError error={action.error} />
      {groups.map((kind) => {
        const title = {
          area: copy("Areas"),
          table: copy("Tables"),
          combination: copy("Table combinations"),
          closure: copy("Closures"),
        }[kind];
        const rows =
          kind === "area"
            ? workspace.areas
            : kind === "table"
              ? workspace.tables
              : kind === "combination"
                ? workspace.combinations
                : workspace.closures;
        return (
          <Card key={kind}>
            <CardHeader className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <CardTitle>{title}</CardTitle>
                <CardDescription>
                  {kind === "combination"
                    ? copy(
                        "Only explicitly configured combinations can be reserved together. Their tables must be in the same area.",
                      )
                    : kind === "closure"
                      ? copy(
                          "Times use {timezone}. An empty table selection closes the whole venue.",
                          { timezone },
                        )
                      : kind === "area"
                        ? copy(
                            "Group tables by room or terrace. A floor drawing is not required.",
                          )
                        : copy(
                            "Set physical capacity and the smallest party you accept at each table.",
                          )}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setEditor({ kind } as Editor)}
              >
                <Plus data-icon="inline-start" />
                {copy("Add")} {copy(kind)}
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {rows.length === 0 && (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>
                      {copy("No {items} yet.", { items: title.toLowerCase() })}
                    </EmptyTitle>
                    <EmptyDescription>
                      {copy("Add")} {copy(kind)}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              {rows.map((row) => (
                <div
                  key={row._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium [overflow-wrap:anywhere]">
                      {"label" in row
                        ? row.label
                        : "name" in row
                          ? row.name
                          : row.reason}
                    </span>
                    {"floorPlanId" in row && (
                      <span className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                        {
                          workspace.areas.find(
                            (area) => area._id === row.floorPlanId,
                          )?.name
                        }
                      </span>
                    )}
                    {"tableIds" in row && kind === "combination" && (
                      <span className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                        {row.tableIds
                          .map(
                            (id) =>
                              workspace.tables.find((table) => table._id === id)
                                ?.label ?? copy("table"),
                          )
                          .join(" + ")}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {"capacity" in row
                        ? `${"minPartySize" in row ? row.minPartySize : (row.minCapacity ?? 1)}–${row.capacity} ${copy("guests")}`
                        : "startAt" in row
                          ? `${localDate(row.startAt, timezone)} ${localTimeLabel(row.startAt, timezone)} – ${localDate(row.endAt, timezone)} ${localTimeLabel(row.endAt, timezone)}`
                          : ""}
                    </span>
                    {"isActive" in row && !row.isActive && (
                      <Badge variant="secondary">{copy("Inactive")}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditor({ kind, row } as Editor)}
                    >
                      {copy("Edit")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(
                          () => remove({ kind, id: row._id }),
                          copy("Removed"),
                        )
                      }
                    >
                      {copy("Remove")}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
      {editor && (
        <ResourceEditor
          key={`${editor.kind}-${editor.row?._id ?? "new"}`}
          editor={editor}
          workspace={workspace}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}

function ResourceEditor({
  editor,
  workspace,
  onClose,
}: {
  editor: Editor;
  workspace: Workspace;
  onClose: () => void;
}) {
  const copy = useReservationCopy();
  const { t } = useDashboardI18n();
  const saveArea = useMutation(api.hospitality.saveArea);
  const saveTable = useMutation(api.hospitality.saveTable);
  const saveCombination = useMutation(api.hospitality.saveCombination);
  const saveClosure = useMutation(api.hospitality.saveClosure);
  const action = useReservationAction();
  const row = editor.row;
  const [name, setName] = useState(
    row
      ? "label" in row
        ? row.label
        : "name" in row
          ? row.name
          : row.reason
      : "",
  );
  const [capacity, setCapacity] = useState(
    row && "capacity" in row ? row.capacity : 2,
  );
  const [minimum, setMinimum] = useState(
    row && "capacity" in row
      ? "minPartySize" in row
        ? row.minPartySize
        : (row.minCapacity ?? 1)
      : 1,
  );
  const [active, setActive] = useState(
    row && "isActive" in row ? row.isActive !== false : true,
  );
  const [area, setArea] = useState<string>(
    row && "floorPlanId" in row
      ? row.floorPlanId
      : (workspace.areas[0]?._id ?? ""),
  );
  const [tableIds, setTableIds] = useState<Id<"tables">[]>(
    row && "tableIds" in row ? row.tableIds : [],
  );
  const timezone = workspace.settings?.timezone ?? "Europe/Skopje";
  const savedStart = row && "startAt" in row ? row.startAt : undefined;
  const savedEnd = row && "endAt" in row ? row.endAt : undefined;
  const [start, setStart] = useState(() =>
    closureTimeInput(savedStart, timezone),
  );
  const [end, setEnd] = useState(() => closureTimeInput(savedEnd, timezone));
  const closureInstant = (input: ClosureTimeInput, saved?: number) => {
    const instant = resolveClosureTime(input, timezone, saved);
    if (instant === null)
      throw new ConvexError(
        copy(
          "This local time does not exist because clocks change. Choose another time.",
        ),
      );
    return instant;
  };
  async function save() {
    const result = await action.run(async () => {
      if (editor.kind === "area")
        await saveArea({ areaId: editor.row?._id, name, isActive: active });
      if (editor.kind === "table")
        await saveTable({
          tableId: editor.row?._id,
          areaId: area as Id<"floor_plans">,
          label: name,
          capacity,
          minPartySize: minimum,
          isActive: active,
        });
      if (editor.kind === "combination")
        await saveCombination({
          combinationId: editor.row?._id,
          name,
          tableIds,
          capacity,
          minPartySize: minimum,
          isActive: active,
        });
      if (editor.kind === "closure")
        await saveClosure({
          closureId: editor.row?._id,
          reason: name,
          tableIds,
          startAt: closureInstant(start, savedStart),
          endAt: closureInstant(end, savedEnd),
        });
    }, copy("Saved"));
    if (result) onClose();
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {row ? copy("Edit") : copy("Add")} {copy(editor.kind)}
          </DialogTitle>
          <DialogDescription>
            {editor.kind === "closure"
              ? copy(
                  "Closure times use {timezone}. Existing reservations must be moved or cancelled first.",
                  { timezone },
                )
              : copy(
                  "Changes are checked against existing reservations before saving.",
                )}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="flex flex-col gap-5"
        >
          <FieldGroup>
            <ReservationInput
              label={
                editor.kind === "table"
                  ? copy("Table label")
                  : editor.kind === "closure"
                    ? copy("Closure reason")
                    : copy("Name")
              }
              value={name}
              required
              onChange={(event) => setName(event.target.value)}
            />
            {editor.kind === "table" && (
              <ReservationSelect
                label={copy("Area")}
                value={area}
                onChange={setArea}
                options={workspace.areas.map((item) => ({
                  value: item._id,
                  label: item.name,
                }))}
              />
            )}
            {(editor.kind === "table" || editor.kind === "combination") && (
              <>
                <ReservationInput
                  label={copy("Capacity")}
                  value={capacity}
                  type="number"
                  min={1}
                  max={100}
                  required
                  onChange={(event) => setCapacity(Number(event.target.value))}
                />
                <ReservationInput
                  label={copy("Minimum party size")}
                  value={minimum}
                  type="number"
                  min={1}
                  max={capacity}
                  required
                  onChange={(event) => setMinimum(Number(event.target.value))}
                />
              </>
            )}
            {editor.kind !== "closure" && (
              <Field orientation="horizontal">
                <Checkbox
                  id="resource-active"
                  checked={active}
                  onCheckedChange={(checked) => setActive(checked === true)}
                />
                <FieldLabel htmlFor="resource-active">
                  {copy("Active")}
                </FieldLabel>
              </Field>
            )}
            {editor.kind === "closure" && (
              <>
                <ReservationInput
                  label={copy("Closure starts")}
                  type="datetime-local"
                  value={start.value}
                  required
                  onChange={(event) =>
                    setStart({ ...start, value: event.target.value })
                  }
                />
                <ReservationInput
                  label={copy("Closure ends")}
                  type="datetime-local"
                  value={end.value}
                  required
                  onChange={(event) =>
                    setEnd({ ...end, value: event.target.value })
                  }
                />
                {closureTimeOptions(start.value, timezone).length > 1 && (
                  <ReservationSelect
                    label={t(
                      "If clocks repeat the start time",
                      "Ако почетното време се повторува",
                      "Nëse ora e fillimit përsëritet",
                    )}
                    value={start.occurrence}
                    onChange={(value) =>
                      setStart({
                        ...start,
                        occurrence: value === "later" ? "later" : "earlier",
                      })
                    }
                    options={[
                      { value: "earlier", label: copy("First occurrence") },
                      { value: "later", label: copy("Second occurrence") },
                    ]}
                  />
                )}
                {closureTimeOptions(end.value, timezone).length > 1 && (
                  <ReservationSelect
                    label={t(
                      "If clocks repeat the end time",
                      "Ако крајното време се повторува",
                      "Nëse ora e përfundimit përsëritet",
                    )}
                    value={end.occurrence}
                    onChange={(value) =>
                      setEnd({
                        ...end,
                        occurrence: value === "later" ? "later" : "earlier",
                      })
                    }
                    options={[
                      { value: "earlier", label: copy("First occurrence") },
                      { value: "later", label: copy("Second occurrence") },
                    ]}
                  />
                )}
              </>
            )}
            {(editor.kind === "combination" || editor.kind === "closure") && (
              <FieldSet>
                <FieldLegend>
                  {editor.kind === "closure"
                    ? copy("Affected tables (none means whole venue)")
                    : copy("Constituent tables")}
                </FieldLegend>
                <FieldGroup>
                  {workspace.tables.map((table) => (
                    <Field key={table._id} orientation="horizontal">
                      <Checkbox
                        id={`select-${table._id}`}
                        checked={tableIds.includes(table._id)}
                        onCheckedChange={(checked) =>
                          setTableIds((current) =>
                            checked
                              ? [...current, table._id]
                              : current.filter((id) => id !== table._id),
                          )
                        }
                      />
                      <FieldLabel htmlFor={`select-${table._id}`}>
                        {table.label} · {table.capacity} {copy("guests")}
                      </FieldLabel>
                    </Field>
                  ))}
                </FieldGroup>
              </FieldSet>
            )}
          </FieldGroup>
          <ReservationError error={action.error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={action.busy}
              onClick={onClose}
            >
              {copy("Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={action.busy || (editor.kind === "table" && !area)}
            >
              {action.busy ? copy("Saving…") : copy("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
