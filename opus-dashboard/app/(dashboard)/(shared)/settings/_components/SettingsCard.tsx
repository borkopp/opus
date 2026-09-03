import type { ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SettingsCardProps {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SettingsCard({
  title,
  description,
  action,
  children,
  footer,
  className,
  contentClassName,
}: SettingsCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <CardHeader className="border-b border-border/50 px-5 pb-5 sm:px-6 sm:pt-6">
        <CardTitle className="font-display text-lg font-semibold tracking-tight">
          {title}
        </CardTitle>
        <CardDescription className="max-w-2xl leading-5">
          {description}
        </CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn("px-5 pb-6 sm:px-6", contentClassName)}>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className="justify-end border-t border-border/50 bg-muted/20 px-5 pb-5 sm:px-6">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}

interface SettingsToggleRowProps {
  title: ReactNode;
  description: ReactNode;
  control: ReactNode;
  className?: string;
}

export function SettingsToggleRow({
  title,
  description,
  control,
  className,
}: SettingsToggleRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-5 rounded-xl border border-border/50 bg-muted/30 p-4 sm:items-center",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

interface SettingsSectionProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
