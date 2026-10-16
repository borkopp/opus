"use client";

import { useId, useState } from "react";
import { Copy, LockKeyhole, Trash2, UnlockKeyhole } from "lucide-react";
import {
  type FloorItem,
  type FloorPlanDraft,
  MIN_FLOOR_ROOM_SIZE,
  MAX_FLOOR_ROOM_SIZE,
  MIN_FLOOR_TABLE_SIZE,
  MAX_FLOOR_TABLE_SIZE,
  MIN_FLOOR_FIXTURE_SIZE,
  MAX_FLOOR_FIXTURE_SIZE,
} from "@/lib/floor-plan";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Alignment = "left" | "center" | "right" | "top" | "middle" | "bottom";
type Props = {
  selectedItems: FloorItem[];
  draft: FloorPlanDraft;
  onChange: (items: FloorItem[]) => void;
  onRoomChange: (width: number, height: number) => void;
  onAlign: (alignment: Alignment) => void;
  onDistribute: (axis: "horizontal" | "vertical") => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEditTable: (id: string) => void;
  disabled?: boolean;
};

export function FloorPlanInspector({
  selectedItems,
  draft,
  onChange,
  onRoomChange,
  onAlign,
  onDistribute,
  onDelete,
  onDuplicate,
  onEditTable,
  disabled = false,
}: Props) {
  const { t } = useDashboardI18n();
  const lockId = useId();
  const labelId = useId();
  const [labelDraft, setLabelDraft] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const item = selectedItems.length === 1 ? selectedItems[0] : undefined;
  const anyLocked = selectedItems.some((entry) => entry.locked);
  const onlyFixtures =
    selectedItems.length > 0 &&
    selectedItems.every((entry) => entry.kind !== "table");
  const geometryDisabled = disabled || anyLocked;
  const numeric = (
    label: string,
    value: number,
    min: number,
    max: number,
    onCommit: (value: number) => void,
    fieldDisabled = geometryDisabled,
  ) => (
    <NumberField
      label={label}
      value={value}
      min={min}
      max={max}
      disabled={fieldDisabled}
      onCommit={onCommit}
    />
  );
  const alignments: Array<[Alignment, string]> = [
    ["left", t("Left", "Лево", "Majtas")],
    ["center", t("Center", "Центар", "Qendër")],
    ["right", t("Right", "Десно", "Djathtas")],
    ["top", t("Top", "Горе", "Sipër")],
    ["middle", t("Middle", "Средина", "Mes")],
    ["bottom", t("Bottom", "Долу", "Poshtë")],
  ];
  const itemMin =
    item?.kind === "table" ? MIN_FLOOR_TABLE_SIZE : MIN_FLOOR_FIXTURE_SIZE;
  const itemMax =
    item?.kind === "table" ? MAX_FLOOR_TABLE_SIZE : MAX_FLOOR_FIXTURE_SIZE;
  const dimensions: Array<
    ["x" | "y" | "width" | "height" | "rotation", string, number, number]
  > = [
    [
      "x",
      t("Position X", "Позиција X", "Pozicioni X"),
      -MAX_FLOOR_FIXTURE_SIZE,
      draft.width,
    ],
    [
      "y",
      t("Position Y", "Позиција Y", "Pozicioni Y"),
      -MAX_FLOOR_FIXTURE_SIZE,
      draft.height,
    ],
    ["width", t("Width", "Ширина", "Gjerësia"), itemMin, itemMax],
    ["height", t("Height", "Висина", "Lartësia"), itemMin, itemMax],
    ["rotation", t("Rotation (°)", "Ротација (°)", "Rrotullimi (°)"), 0, 359],
  ];
  const shapes = [
    {
      value: "rectangle",
      label: t("Rectangle", "Правоаголна", "Drejtkëndësh"),
    },
    { value: "circle", label: t("Round", "Кружна", "Rrumbullake") },
    { value: "booth", label: t("Booth", "Сепаре", "Kabina") },
  ];
  function commitLabel() {
    if (
      !item ||
      disabled ||
      item.locked ||
      labelDraft?.id !== item.id ||
      item.kind === "table"
    )
      return;
    const label = labelDraft.value.trim();
    if (label) onChange([{ ...item, label }]);
    setLabelDraft(null);
  }
  return (
    <Card
      className="min-w-0"
      aria-label={t(
        "Floor plan inspector",
        "Поставки на планот",
        "Cilësimet e planit",
      )}
    >
      <CardHeader>
        <CardTitle className="[overflow-wrap:anywhere]">
          {item
            ? item.label
            : selectedItems.length
              ? t(
                  `${selectedItems.length} selected`,
                  `${selectedItems.length} избрани`,
                  `${selectedItems.length} të zgjedhura`,
                )
              : t("Room", "Просторија", "Dhoma")}
        </CardTitle>
        <CardDescription>
          {selectedItems.length
            ? t(
                "Adjust your selection without changing reservations.",
                "Уредете го изборот без промени во резервациите.",
                "Rregulloni përzgjedhjen pa ndryshuar rezervimet.",
              )
            : t(
                "Set the room size, then select items on the plan to arrange them.",
                "Поставете ја големината на просторијата, па изберете елементи на планот за уредување.",
                "Caktoni madhësinë e dhomës, pastaj zgjidhni elemente në plan për t’i rregulluar.",
              )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        {!selectedItems.length && (
          <FieldGroup className="grid grid-cols-2 gap-3">
            {numeric(
              t("Room width", "Ширина на просторија", "Gjerësia e dhomës"),
              draft.width,
              MIN_FLOOR_ROOM_SIZE,
              MAX_FLOOR_ROOM_SIZE,
              (width) => onRoomChange(width, draft.height),
              disabled,
            )}
            {numeric(
              t("Room height", "Висина на просторија", "Lartësia e dhomës"),
              draft.height,
              MIN_FLOOR_ROOM_SIZE,
              MAX_FLOOR_ROOM_SIZE,
              (height) => onRoomChange(draft.width, height),
              disabled,
            )}
            <FieldDescription className="col-span-2">
              {t(
                "Select several items to align them. Locked items stay in place.",
                "Изберете повеќе елементи за порамнување. Заклучените елементи остануваат на место.",
                "Zgjidhni disa elemente për t’i rreshtuar. Elementet e kyçura qëndrojnë në vend.",
              )}
            </FieldDescription>
          </FieldGroup>
        )}
        {item && (
          <FieldGroup key={item.id} className="gap-4">
            {item.kind === "table" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onEditTable(item.id)}
                >
                  {t(
                    "Edit table details",
                    "Уреди детали за масата",
                    "Ndrysho detajet e tavolinës",
                  )}
                </Button>
                <Field data-disabled={geometryDisabled}>
                  <FieldTitle>{t("Shape", "Облик", "Forma")}</FieldTitle>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={item.shape ?? "rectangle"}
                    disabled={geometryDisabled}
                    aria-label={t(
                      "Table shape",
                      "Облик на маса",
                      "Forma e tavolinës",
                    )}
                    className="w-full"
                    onValueChange={(shape) => {
                      if (
                        shape === "rectangle" ||
                        shape === "circle" ||
                        shape === "booth"
                      )
                        onChange([{ ...item, shape }]);
                    }}
                  >
                    {shapes.map((shape) => (
                      <ToggleGroupItem
                        key={shape.value}
                        className="h-auto min-h-9 min-w-0 flex-1 whitespace-normal px-1 py-2 [overflow-wrap:anywhere]"
                        value={shape.value}
                      >
                        {shape.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
              </>
            ) : (
              <Field data-disabled={geometryDisabled}>
                <FieldLabel htmlFor={labelId}>
                  {t("Label", "Ознака", "Etiketa")}
                </FieldLabel>
                <Input
                  id={labelId}
                  value={
                    labelDraft?.id === item.id ? labelDraft.value : item.label
                  }
                  maxLength={120}
                  disabled={geometryDisabled}
                  onChange={(event) =>
                    setLabelDraft({ id: item.id, value: event.target.value })
                  }
                  onBlur={commitLabel}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      event.stopPropagation();
                      setLabelDraft(null);
                    }
                  }}
                />
              </Field>
            )}
            <FieldGroup className="grid grid-cols-2 gap-3">
              {dimensions.map(([field, label, min, max]) => (
                <NumberField
                  key={field}
                  label={label}
                  value={item[field]}
                  min={min}
                  max={max}
                  disabled={geometryDisabled}
                  onCommit={(value) => onChange([{ ...item, [field]: value }])}
                />
              ))}
            </FieldGroup>
            <Field orientation="horizontal" data-disabled={disabled}>
              <FieldLabel htmlFor={lockId}>
                {t("Lock position", "Заклучи позиција", "Kyç pozicionin")}
              </FieldLabel>
              <Switch
                id={lockId}
                checked={item.locked}
                disabled={disabled}
                onCheckedChange={(locked) => onChange([{ ...item, locked }])}
              />
            </Field>
          </FieldGroup>
        )}
        {selectedItems.length > 1 && (
          <FieldGroup className="gap-4">
            <Field data-disabled={geometryDisabled}>
              <FieldTitle>
                {t(
                  "Align selection",
                  "Порамни го изборот",
                  "Rreshto përzgjedhjen",
                )}
              </FieldTitle>
              <div className="grid grid-cols-3 gap-2">
                {alignments.map(([alignment, label]) => (
                  <Button
                    type="button"
                    key={alignment}
                    size="sm"
                    variant="outline"
                    disabled={geometryDisabled}
                    onClick={() => onAlign(alignment)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </Field>
            <Field data-disabled={geometryDisabled || selectedItems.length < 3}>
              <FieldTitle>
                {t(
                  "Distribute evenly",
                  "Распореди рамномерно",
                  "Shpërndaj njëtrajtshëm",
                )}
              </FieldTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={geometryDisabled || selectedItems.length < 3}
                  onClick={() => onDistribute("horizontal")}
                >
                  {t("Horizontally", "Хоризонтално", "Horizontalisht")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={geometryDisabled || selectedItems.length < 3}
                  onClick={() => onDistribute("vertical")}
                >
                  {t("Vertically", "Вертикално", "Vertikalisht")}
                </Button>
              </div>
              {selectedItems.length < 3 && (
                <FieldDescription>
                  {t(
                    "Select at least three items.",
                    "Изберете најмалку три елементи.",
                    "Zgjidhni të paktën tre elemente.",
                  )}
                </FieldDescription>
              )}
            </Field>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() =>
                onChange(
                  selectedItems.map((entry) => ({
                    ...entry,
                    locked: !anyLocked,
                  })),
                )
              }
            >
              {anyLocked ? (
                <UnlockKeyhole data-icon="inline-start" />
              ) : (
                <LockKeyhole data-icon="inline-start" />
              )}
              {anyLocked
                ? t(
                    "Unlock selection",
                    "Отклучи го изборот",
                    "Shkyç përzgjedhjen",
                  )
                : t("Lock selection", "Заклучи го изборот", "Kyç përzgjedhjen")}
            </Button>
          </FieldGroup>
        )}
        {selectedItems.length > 0 && (
          <>
            {anyLocked && (
              <p className="text-sm text-muted-foreground">
                {t(
                  "Unlock the selection to move, resize or remove it.",
                  "Отклучете го изборот за преместување, промена на големина или отстранување.",
                  "Shkyçni përzgjedhjen për ta lëvizur, ndryshuar madhësinë ose hequr.",
                )}
              </p>
            )}
            {onlyFixtures ? (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={geometryDisabled}
                    onClick={onDuplicate}
                  >
                    <Copy data-icon="inline-start" />
                    {t("Duplicate", "Дуплирај", "Kopjo")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={geometryDisabled}
                    onClick={onDelete}
                  >
                    <Trash2 data-icon="inline-start" />
                    {t("Remove", "Отстрани", "Hiq")}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t(
                  "Physical tables are managed in Tables. Only fixtures can be duplicated or removed here.",
                  "Физичките маси се уредуваат во Маси. Тука може да се дуплираат или отстранат само други елементи.",
                  "Tavolinat fizike menaxhohen te Tavolinat. Këtu mund të kopjohen ose hiqen vetëm elementet dekorative.",
                )}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const { t } = useDashboardI18n();
  const id = useId();
  const [editing, setEditing] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  function commit() {
    if (editing === null || disabled) return;
    const next = Number(editing);
    if (
      !editing.trim() ||
      !Number.isInteger(next) ||
      next < min ||
      next > max
    ) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setEditing(null);
    if (next !== value) onCommit(next);
  }
  return (
    <Field
      className="min-w-0 gap-2"
      data-disabled={disabled}
      data-invalid={invalid}
    >
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        step={1}
        min={min}
        max={max}
        value={editing ?? Math.min(max, Math.max(min, Math.round(value)))}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(event) => {
          setEditing(event.target.value);
          setInvalid(false);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.stopPropagation();
            setEditing(null);
            setInvalid(false);
          }
        }}
      />
      {invalid && (
        <FieldError id={`${id}-error`}>
          {t(
            `Enter a whole number from ${min} to ${max}.`,
            `Внесете цел број од ${min} до ${max}.`,
            `Vendosni një numër të plotë nga ${min} deri në ${max}.`,
          )}
        </FieldError>
      )}
    </Field>
  );
}
