import type { ComponentProps } from "react";
import { LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/utils";
import styles from "./spinner.module.css";

function Spinner({ className, ...props }: ComponentProps<"svg">) {
  return (
    <LogoMark
      data-slot="spinner"
      viewBox="-4 0 48 48"
      role="status"
      aria-label="Loading"
      aria-hidden={undefined}
      focusable="false"
      className={cn("size-4", styles.spinner, className)}
      {...props}
    />
  );
}

export { Spinner };
