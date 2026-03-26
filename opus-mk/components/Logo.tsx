import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <span
      className={cn(
        "uppercase tracking-wider",
        className
      )}
      style={{ fontFamily: "var(--font-audiowide), sans-serif" }}
    >
      OPUS
    </span>
  );
};
