import { cn } from "@/lib/utils";
import styles from "./animated-number.module.css";

const digits = Array.from({ length: 10 }, (_, digit) => digit);

/** Roll stable digit columns; CSS can retarget a transition mid-drag. */
export function AnimatedNumber({
  value,
  animate = true,
  minDigits = 0,
  className,
}: {
  value: string;
  animate?: boolean;
  minDigits?: number;
  className?: string;
}) {
  const characters = [...value.padStart(minDigits, " ")];

  return (
    <span className={cn(styles.number, className)} data-animate={animate}>
      <span className={styles.accessible}>{value}</span>
      <span className={styles.visual} aria-hidden="true">
        {characters.map((character, index) => {
          // Anchor columns from the right so 8 → 12 keeps the units column.
          const position = characters.length - index;
          return /[0-9]/.test(character) ? (
            <span className={styles.digit} key={`digit-${position}`}>
              <span className={styles.placeholder}>{character}</span>
              <span className={styles.clip}>
                <span
                  className={styles.reel}
                  style={{ transform: `translateY(-${Number(character) * 10}%)` }}
                >
                  {digits.map((digit) => (
                    <span key={digit}>{digit}</span>
                  ))}
                </span>
              </span>
            </span>
          ) : (
            <span
              key={`separator-${position}`}
              className={character === " " ? styles.spacer : undefined}
            >
              {character}
            </span>
          );
        })}
      </span>
    </span>
  );
}
