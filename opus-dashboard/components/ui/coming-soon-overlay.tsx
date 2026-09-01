"use client";

import * as React from "react";
import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ComingSoonOverlayProps {
  /** Icon component (Lucide icon) or custom ReactNode to display in the main card */
  icon?: ElementType | ReactNode;
  /** Label for the pill badge (default: "Coming Soon") */
  badgeLabel?: string;
  /** Optional icon component or ReactNode for inside the badge */
  badgeIcon?: ElementType | ReactNode;
  /** Optional title override */
  title?: string;
  /** Description explanation text or ReactNode */
  description: string | ReactNode;
  /** Blurred background content */
  children?: ReactNode;
  /** Custom class for outer wrapper */
  className?: string;
  /** Custom class for the blurred content */
  contentClassName?: string;
  /** Custom class for the overlay panel */
  overlayClassName?: string;
  /** Blur Tailwind class (default: "blur-[4px]") */
  blurClassName?: string;
  /** Opacity Tailwind class (default: "opacity-35") */
  opacityClassName?: string;
}

function renderIcon(
  iconOrNode: ElementType | ReactNode,
  className?: string,
): ReactNode {
  if (!iconOrNode) return null;
  if (React.isValidElement(iconOrNode)) {
    return React.cloneElement(
      iconOrNode as React.ReactElement<{ className?: string }>,
      {
        className: cn(
          (iconOrNode.props as { className?: string })?.className,
          className,
        ),
      },
    );
  }
  if (
    typeof iconOrNode === "function" ||
    (typeof iconOrNode === "object" &&
      iconOrNode !== null &&
      "$$typeof" in iconOrNode)
  ) {
    const IconComponent = iconOrNode as ElementType;
    return <IconComponent className={className} />;
  }
  return iconOrNode as ReactNode;
}

export function ComingSoonBanner({
  icon,
  badgeLabel = "Coming Soon",
  badgeIcon,
  title,
  description,
  className,
}: Omit<ComingSoonOverlayProps, "children" | "contentClassName">) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-6 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-card/90 shadow-sm">
          {renderIcon(icon, "size-6 text-foreground")}
        </div>
      )}
      <div className="flex flex-col items-center gap-1.5">
        {badgeLabel && (
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold text-foreground">
            {renderIcon(badgeIcon, "size-3.5 text-primary")}
            <span>{badgeLabel}</span>
          </div>
        )}
        {title && (
          <h4 className="font-display text-sm font-semibold text-foreground">
            {title}
          </h4>
        )}
        {description && (
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function ComingSoonOverlay({
  icon,
  badgeLabel = "Coming Soon",
  badgeIcon,
  title,
  description,
  children,
  className,
  contentClassName,
  overlayClassName,
  blurClassName = "blur-[4px]",
  opacityClassName = "opacity-35",
}: ComingSoonOverlayProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      {children && (
        <div
          className={cn(
            "pointer-events-none select-none filter",
            blurClassName,
            opacityClassName,
            contentClassName,
          )}
        >
          {children}
        </div>
      )}

      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/25 backdrop-blur-[1.5px]",
          overlayClassName,
        )}
      >
        <ComingSoonBanner
          icon={icon}
          badgeLabel={badgeLabel}
          badgeIcon={badgeIcon}
          title={title}
          description={description}
        />
      </div>
    </div>
  );
}
