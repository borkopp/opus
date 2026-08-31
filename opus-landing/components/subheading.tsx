import React from "react";
import { cn } from "@/lib/utils";

type SubheadingTag = "p" | "span" | "div";

interface SubheadingProps extends React.HTMLAttributes<HTMLElement> {
  tag?: SubheadingTag;
  children: React.ReactNode;
}

export function Subheading({
  tag: Tag = "p",
  children,
  className,
  ...props
}: SubheadingProps) {
  return (
    <Tag
      className={cn(
        "text-sm text-white/85 md:text-base lg:text-lg",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
