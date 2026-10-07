"use client";

import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useId } from "react";

export function EditorText({
  label,
  value,
  placeholder,
  onChange,
  multiline,
  maxLength = 200,
  description,
  disabled,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  maxLength?: number;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Field data-disabled={disabled}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          rows={4}
          disabled={disabled}
        />
      ) : (
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          disabled={disabled}
        />
      )}
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

export function EditorSwitch({
  label,
  checked,
  onChange,
  description,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Field orientation="horizontal" data-disabled={disabled}>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </Field>
  );
}

export function EditorRange({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <span className="sites-control-value">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(values) => onChange(values[0])}
        aria-label={label}
      />
    </Field>
  );
}

export function EditorChoice({
  label,
  value,
  choices,
  onChange,
  thumbnails = false,
}: {
  label: string;
  value: string;
  choices: { value: string; label: string; description?: string }[];
  onChange: (value: string) => void;
  thumbnails?: boolean;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel id={id}>{label}</FieldLabel>
      <ToggleGroup
        type="single"
        variant="outline"
        value={value}
        onValueChange={(value) => {
          if (value) onChange(value);
        }}
        className={
          thumbnails ? "sites-variant-choices" : "sites-segmented-choices"
        }
        aria-labelledby={id}
        spacing={thumbnails ? 2 : 0}
      >
        {choices.map((choice) => (
          <ToggleGroupItem
            key={choice.value}
            value={choice.value}
            className={thumbnails ? "sites-variant-choice" : undefined}
          >
            {thumbnails && (
              <span
                className="sites-variant-sketch"
                data-variant={choice.value}
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
                <i />
              </span>
            )}
            <span>{choice.label}</span>
            {choice.description && <small>{choice.description}</small>}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}
