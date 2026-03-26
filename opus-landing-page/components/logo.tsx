import { Audiowide } from "next/font/google";
import { cn } from "@/lib/utils";
import Link from "next/link";

const audiowide = Audiowide({
  weight: "400",
  subsets: ["latin"],
});

export const Logo = ({ className }: { className?: string }) => {
  return (
    <Link href="/" className={cn("flex items-center gap-1")}>
      <span
        className={cn(
          audiowide.className,
          "uppercase tracking-wider",
          className,
        )}
      >
        OPUS
      </span>
    </Link>
  );
};
