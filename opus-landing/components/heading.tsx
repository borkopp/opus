import React from "react";
import { cn } from "@/lib/utils";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingTag;
  children: React.ReactNode;
}

export function Heading({
  as: Tag = "h1",
  children,
  className,
  ...props
}: HeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display text-2xl font-bold tracking-tight text-balance text-white md:text-4xl lg:text-5xl",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
