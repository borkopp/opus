import { cn } from "@/lib/utils";
import Link from "next/link";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 uppercase tracking-wider",
        className
      )}
      style={{ fontFamily: "var(--font-audiowide), sans-serif" }}
    >
      <span className="inline-flex size-[1.15em] items-center justify-center rounded-[0.38em] bg-current/10">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[0.72em] fill-none stroke-current" strokeWidth="2.8" strokeLinecap="round">
          <path d="M9.2 5.2a7 7 0 1 0 0 13.6" />
          <path d="M14.8 5.2a7 7 0 1 1 0 13.6" />
        </svg>
      </span>
      OPUS
    </Link>
  );
};
