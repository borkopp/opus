"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Locale } from "../../shared/i18n/locale";

const themeLabels = {
  mk: {
    change: "Промени тема",
    light: "Светла",
    dark: "Темна",
    system: "Системска",
  },
  en: {
    change: "Change theme",
    light: "Light",
    dark: "Dark",
    system: "System",
  },
  sq: {
    change: "Ndrysho temën",
    light: "E çelët",
    dark: "E errët",
    system: "Sistemi",
  },
};

export function ThemeToggle({
  className,
  align = "end",
  locale = "mk",
}: {
  className?: string;
  align?: "start" | "center" | "end";
  locale?: Locale;
}) {
  const { setTheme } = useTheme();
  const labels = themeLabels[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className={cn("shrink-0", className)}
          aria-label={labels.change}
          title={labels.change}
        >
          <Sun className="size-4 rotate-0 scale-100 transition-transform duration-200 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-transform duration-200 dark:rotate-0 dark:scale-100" />
          <span data-replay-public className="sr-only">
            {labels.change}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Sun className="size-4 text-muted-foreground" />
          <span data-replay-public>{labels.light}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Moon className="size-4 text-muted-foreground" />
          <span data-replay-public>{labels.dark}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Monitor className="size-4 text-muted-foreground" />
          <span data-replay-public>{labels.system}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const ModeToggle = ThemeToggle;
