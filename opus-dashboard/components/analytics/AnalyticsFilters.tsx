"use client";

import { CalendarDays } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AnalyticsFilters as Filters,
  offsetMonth,
  studioMonth,
  validAnalyticsMonths,
} from "@/lib/analytics-filters";

export function AnalyticsFilters({
  filters,
  onChange,
  staff,
  currencies,
  demo,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  staff: { id: string; name: string }[];
  currencies: string[];
  demo: boolean;
}) {
  const { t } = useDashboardI18n();
  const month = studioMonth();
  const invalid = !validAnalyticsMonths(filters.startMonth, filters.endMonth);
  const presets = [
    {
      label: t("This month", "Овој месец", "Këtë muaj"),
      start: month,
      end: month,
    },
    {
      label: t("Last month", "Минат месец", "Muajin e kaluar"),
      start: offsetMonth(month, -1),
      end: offsetMonth(month, -1),
    },
    {
      label: t("Last 3 months", "Последни 3 месеци", "3 muajt e fundit"),
      start: offsetMonth(month, -2),
      end: month,
    },
  ];
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="workspace-segments">
          {presets.map((preset) => {
            const active =
              preset.start === filters.startMonth &&
              preset.end === filters.endMonth;
            return (
              <Button
                key={preset.label}
                size="sm"
                variant={active ? "secondary" : "ghost"}
                className={
                  active ? "bg-card shadow-xs" : "text-muted-foreground"
                }
                aria-pressed={active}
                onClick={() =>
                  onChange({
                    ...filters,
                    startMonth: preset.start,
                    endMonth: preset.end,
                  })
                }
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1fr_0.65fr]">
        {(["startMonth", "endMonth"] as const).map((key) => (
          <label
            key={key}
            className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground"
          >
            {key === "startMonth"
              ? t("From month", "Од месец", "Nga muaji")
              : t("To month", "До месец", "Deri në muaj")}
            <span className="relative min-w-0">
              <CalendarDays className="pointer-events-none absolute top-3 left-3 hidden size-4 text-muted-foreground sm:block" />
              <Input
                type="month"
                min="2000-01"
                max={month}
                value={filters[key]}
                onChange={(event) =>
                  onChange({ ...filters, [key]: event.target.value })
                }
                aria-invalid={invalid}
                aria-describedby={invalid ? "analytics-range-error" : undefined}
                className="h-10 min-w-0 bg-card text-foreground sm:pl-9"
              />
            </span>
          </label>
        ))}
        <div className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
          <span id="analytics-team-label">
            {t("Team member", "Член на тимот", "Anëtar i ekipit")}
          </span>
          <Select
            value={filters.staffId || "all"}
            onValueChange={(value) =>
              onChange({ ...filters, staffId: value === "all" ? "" : value })
            }
          >
            <SelectTrigger
              aria-labelledby="analytics-team-label"
              className="h-10 w-full min-w-0 bg-card text-foreground"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("All team members", "Целиот тим", "I gjithë ekipi")}
              </SelectItem>
              {staff.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
          <span id="analytics-currency-label">
            {t("Value currency", "Валута", "Monedha e vlerës")}
          </span>
          <Select
            value={filters.currency || "default"}
            onValueChange={(value) =>
              onChange({
                ...filters,
                currency: value === "default" ? "" : value,
              })
            }
          >
            <SelectTrigger
              aria-labelledby="analytics-currency-label"
              className="h-10 w-full bg-card text-foreground"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                {t("Studio default", "Валута на студиото", "Monedha e studios")}
              </SelectItem>
              {currencies.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {invalid && (
        <p
          id="analytics-range-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {t(
            "Choose a valid range of up to 12 months, with the starting month first.",
            "Изберете важечки период до 12 месеци, со почетниот месец прв.",
            "Zgjidhni një periudhë deri në 12 muaj, me muajin e fillimit të parin.",
          )}
        </p>
      )}
      {demo && (
        <p className="text-xs text-muted-foreground">
          {t(
            "Explore with sample data. Pro connects this view to your studio.",
            "Истражете со демо податоци. Pro го поврзува прегледот со вашето студио.",
            "Eksploroni me të dhëna shembull. Pro e lidh këtë pamje me studion tuaj.",
          )}
        </p>
      )}
    </div>
  );
}
