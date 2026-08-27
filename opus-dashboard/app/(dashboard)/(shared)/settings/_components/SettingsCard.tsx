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
  title: string;
  description: string;
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
        "overflow-hidden border border-border/60 bg-card shadow-s dark:shadow-l",
        className,
      )}
    >
      <CardHeader className="border-b border-border/50 pb-5">
        <CardTitle className="font-display text-xl font-semibold tracking-tight">
          {title}
        </CardTitle>
        <CardDescription className="max-w-2xl leading-6">
          {description}
        </CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn("pb-6", contentClassName)}>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className="justify-end border-t border-border/50 bg-card py-4">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}

interface SettingsToggleRowProps {
  title: string;
  description: string;
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
        "flex items-center justify-between gap-6 rounded-2xl border border-border/50 bg-muted/40 p-4",
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
