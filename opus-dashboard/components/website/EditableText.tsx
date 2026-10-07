"use client";

import { useEffect, useRef, useState } from "react";

export function EditableText({
  as: Tag = "p",
  value,
  onChange,
  className,
  multiline = false,
  label,
}: {
  as?: "h1" | "h2" | "h3" | "p" | "span";
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  multiline?: boolean;
  label?: string;
}) {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!active) return;
    ref.current?.focus();
    const range = document.createRange();
    if (ref.current) {
      range.selectNodeContents(ref.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [active]);
  return (
    <Tag
      ref={ref as React.Ref<HTMLHeadingElement>}
      className={className}
      data-inline-edit={onChange ? "true" : undefined}
      contentEditable={active ? "plaintext-only" : undefined}
      suppressContentEditableWarning
      role={active ? "textbox" : undefined}
      aria-label={active ? label : undefined}
      aria-multiline={active ? multiline : undefined}
      title={onChange ? label : undefined}
      onDoubleClick={
        onChange
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              setActive(true);
            }
          : undefined
      }
      onBlur={() => {
        if (!active) return;
        const value = ref.current?.innerText ?? "";
        onChange?.(
          multiline ? value.trim() : value.replace(/\s+/g, " ").trim(),
        );
        setActive(false);
      }}
      onKeyDown={(event) => {
        if (!active) return;
        event.stopPropagation();
        if (event.key === "Escape") {
          if (ref.current) ref.current.textContent = value;
          ref.current?.blur();
        }
        if (event.key === "Enter" && !multiline) {
          event.preventDefault();
          ref.current?.blur();
        }
      }}
    >
      {value}
    </Tag>
  );
}
