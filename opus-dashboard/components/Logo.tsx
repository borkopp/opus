import { Audiowide } from "next/font/google";
import { cn } from "@/lib/utils";

const audiowide = Audiowide({
  weight: "400",
  subsets: ["latin"],
});

export const Logo = ({ className }: { className?: string }) => {
  return (
    <span className={cn(audiowide.className, "uppercase tracking-wider", className)}>
      OPUS
    </span>
  );
};
