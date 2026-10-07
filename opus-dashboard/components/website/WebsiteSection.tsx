"use client";

import { Pencil } from "lucide-react";
import type { WebsitePanel } from "../../../shared/website-design";
import type { WebsiteEditing } from "./website-types";
import { cn } from "@/lib/utils";

export function WebsiteSection({
  id,
  label,
  children,
  editing,
  className,
}: {
  id: WebsitePanel;
  label: string;
  children: React.ReactNode;
  editing?: WebsiteEditing;
  className?: string;
}) {
  return (
    <section
      id={id}
      data-site-section={id}
      className={cn(
        "opus-site-section",
        editing && "opus-site-selectable",
        className,
      )}
      data-selected={editing?.selected === id || undefined}
      onClickCapture={
        editing
          ? (event) => {
              const target = event.target as HTMLElement;
              if (
                target.closest(
                  '[contenteditable="plaintext-only"], [data-gallery-control], [data-site-language]',
                )
              )
                return;
              if (target.closest("a")) event.preventDefault();
              editing.select(id);
            }
          : undefined
      }
    >
      {editing && (
        <button
          type="button"
          className="opus-site-section-label"
          onClick={() => editing.select(id)}
          aria-label={`${label}`}
        >
          <Pencil aria-hidden="true" />
          {label}
        </button>
      )}
      {children}
    </section>
  );
}
