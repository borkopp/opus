import { Audiowide } from "next/font/google";
import { cn } from "@/lib/utils";

const audiowide = Audiowide({
  weight: "400",
  subsets: ["latin"],
});

type LogoMarkProps = {
  className?: string;
};

type LogoWordmarkProps = {
  className?: string;
};

type LogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
};

export const LogoMark = ({ className }: LogoMarkProps) => (
  <svg
    viewBox="0 0 40 48"
    aria-hidden="true"
    className={cn("h-[1.1em] w-auto shrink-0 fill-current", className)}
  >
    <path
      d="m40 32v-16c0-6.62742-5.3726-12-12-12h-16l-12 12h22c3.3137 0 6 2.6863 6 6v22z"
      opacity=".3"
    />
    <path d="m.0000014 16-.0000014 16c-.00000058 6.6274 5.37258 12 12 12h16l12-12h-20c-4.4183 0-8-3.5817-8-8v-20z" />
  </svg>
);

export const LogoWordmark = ({ className }: LogoWordmarkProps) => (
  <span
    className={cn(
      audiowide.className,
      "leading-none tracking-wider text-current uppercase",
      className,
    )}
  >
    OPUS
  </span>
);

export const Logo = ({
  className,
  markClassName,
  wordmarkClassName,
}: LogoProps) => {
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      aria-label="OPUS"
    >
      <LogoMark className={cn("text-brand-primary", markClassName)} />
      <LogoWordmark className={wordmarkClassName} />
    </span>
  );
};
