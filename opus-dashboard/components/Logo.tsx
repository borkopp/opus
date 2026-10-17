import { Audiowide } from "next/font/google";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/ui/logo-mark";

export { LogoMark };

const audiowide = Audiowide({
  weight: "400",
  subsets: ["latin"],
});

type LogoWordmarkProps = {
  className?: string;
};

type LogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
};

type LogoProProps = LogoProps & {
  proClassName?: string;
};

type LogoFreeProps = LogoProps & {
  freeClassName?: string;
};

export const LogoWordmark = ({ className }: LogoWordmarkProps) => (
  <span
    data-replay-public
    className={cn(
      audiowide.className,
      "uppercase leading-none tracking-wider text-current",
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
      className={cn(
        "inline-flex items-center gap-2 text-foreground",
        className,
      )}
      aria-label="OPUS"
    >
      <LogoMark className={cn("text-brand", markClassName)} />
      <LogoWordmark className={wordmarkClassName} />
    </span>
  );
};

const LogoPlan = ({
  className,
  markClassName,
  wordmarkClassName,
  planClassName,
  plan,
}: LogoProps & { plan: "Free" | "Pro"; planClassName?: string }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-foreground",
        className,
      )}
      aria-label={`OPUS ${plan}`}
    >
      <LogoMark className={cn("text-brand", markClassName)} />
      <span className="inline-flex items-start gap-0.5">
        <LogoWordmark className={wordmarkClassName} />
        <span
          className={cn(
            "relative -top-[0.45em] font-mono text-[0.44em] font-medium leading-none tracking-tight text-foreground",
            planClassName,
          )}
        >
          {plan}
        </span>
      </span>
    </span>
  );
};

export const LogoPro = ({ proClassName, ...props }: LogoProProps) => (
  <LogoPlan {...props} plan="Pro" planClassName={proClassName} />
);

export const LogoFree = ({ freeClassName, ...props }: LogoFreeProps) => (
  <LogoPlan {...props} plan="Free" planClassName={freeClassName} />
);
