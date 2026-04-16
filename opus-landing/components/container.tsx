import { cn } from "@/lib/utils";
import React from "react";

type ContainerProps<T extends React.ElementType = "div"> = {
  as?: T;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "children">;

export function Container<T extends React.ElementType = "div">({
  as,
  children,
  className,
  ...props
}: ContainerProps<T>) {
  const Component = as || "div";
  return (
    <Component
      className={cn("mx-auto max-w-7xl px-4 md:px-8", className)}
      {...props}
    >
      {children}
    </Component>
  );
}
