import { Appear } from "@/components/ui/appear";
import { appearStep } from "@/lib/appear";
import type { ReactNode } from "react";
import s from "../clarity.module.css";
export function WidgetHeading({
  title,
  subtitle,
  children,
  replayPublicTitle = false,
  replayPublicSubtitle = false,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  replayPublicTitle?: boolean;
  replayPublicSubtitle?: boolean;
}) {
  return (
    <div className={s.panelHeading}>
      <div className="min-w-0">
        <h2
          data-replay-public={replayPublicTitle || undefined}
          data-appear="item"
        >
          {title}
        </h2>
        {subtitle && (
          <p
            data-replay-public={replayPublicSubtitle || undefined}
            data-appear="item"
            style={appearStep(2)}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <span
          className="shrink-0 self-start"
          data-appear="scale"
          style={appearStep(2)}
        >
          {children}
        </span>
      )}
    </div>
  );
}
export function WidgetFrame({
  title,
  subtitle,
  action,
  children,
  className = "",
  delay = 0,
  replayPublicTitle = false,
  replayPublicSubtitle = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
  replayPublicTitle?: boolean;
  replayPublicSubtitle?: boolean;
}) {
  return (
    <Appear as="section" delay={delay} className={`${s.panel} ${className}`}>
      <WidgetHeading
        title={title}
        subtitle={subtitle}
        replayPublicTitle={replayPublicTitle}
        replayPublicSubtitle={replayPublicSubtitle}
      >
        {action}
      </WidgetHeading>
      {children}
    </Appear>
  );
}
export function WidgetEmpty({ children }: { children: ReactNode }) {
  return (
    <p
      data-appear="item"
      style={appearStep(3)}
      className="py-8 text-center text-sm text-muted-foreground"
    >
      {children}
    </p>
  );
}
