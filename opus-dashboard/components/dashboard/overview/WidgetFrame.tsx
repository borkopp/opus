import { Appear } from "@/components/ui/appear";
import { appearStep } from "@/lib/appear";
import type { ReactNode } from "react";
import s from "../clarity.module.css";
export function WidgetHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.panelHeading}>
      <div className="min-w-0">
        <h2 data-appear="item">{title}</h2>
        {subtitle && (
          <p data-appear="item" style={appearStep(2)}>
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
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Appear as="section" delay={delay} className={`${s.panel} ${className}`}>
      <WidgetHeading title={title} subtitle={subtitle}>
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
