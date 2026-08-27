import { Audiowide } from "next/font/google";
import { cn } from "@/lib/utils";

const audiowide = Audiowide({
  weight: "400",
  subsets: ["latin"],
});

export const Logo = ({ className }: { className?: string }) => {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-label="OPUS">
      <span className="inline-flex size-[1.15em] items-center justify-center rounded-[0.38em] bg-current/10">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[0.72em] fill-none stroke-current" strokeWidth="2.8" strokeLinecap="round">
          <path d="M9.2 5.2a7 7 0 1 0 0 13.6" />
          <path d="M14.8 5.2a7 7 0 1 1 0 13.6" />
        </svg>
      </span>
      <span className={cn(audiowide.className, "uppercase tracking-wider")}>OPUS</span>
    </span>
  );
};
