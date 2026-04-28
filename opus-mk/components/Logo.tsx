import { cn } from "@/lib/utils";
import Link from "next/link";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <Link
      href="/"
      className={cn(
        "uppercase tracking-wider",
        className
      )}
      style={{ fontFamily: "var(--font-audiowide), sans-serif" }}
    >
      OPUS
    </Link>
  );
};
