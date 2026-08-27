import { cn } from "@/lib/utils";
import Link from "next/link";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 uppercase tracking-wider text-[#ce5d45]",
        className
      )}
      style={{ fontFamily: "var(--font-audiowide), sans-serif" }}
    >
      <svg viewBox="0 0 38 48" aria-hidden="true" className="h-[1.35em] w-auto fill-current">
        <path d="M0 24c0-4.0995 1.29832-7.8957 3.50621-11h9.49379v1.7789c-3.01021 1.9627-5 5.3595-5 9.2211 0 6.0751 4.9249 11 11 11v8c-10.49341 0-19-8.5066-19-19z" />
        <path d="m34.4938 35c2.2079-3.1043 3.5062-6.9005 3.5062-11 0-10.4934-8.5066-19-19-19v8c6.0751 0 11 4.9249 11 11 0 3.8616-1.9898 7.2584-5 9.2211v1.7789z" />
      </svg>
      OPUS
    </Link>
  );
};
