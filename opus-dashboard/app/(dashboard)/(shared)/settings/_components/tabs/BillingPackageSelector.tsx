import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import type { ProTeamLimit } from "../../../../../../../shared/pro-pricing";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { formatPrice } from "@/lib/format-price";

export function BillingPackageSelector({
  tiers,
  value,
  onChange,
  teamCount,
  disabled,
}: {
  tiers: FunctionReturnType<typeof api.billing.getStatus>["tiers"];
  value: ProTeamLimit;
  onChange: (value: ProTeamLimit) => void;
  teamCount: number;
  disabled: boolean;
}) {
  const { t, locale } = useDashboardI18n();
  const index = tiers.findIndex((tier) => tier.teamLimit === value);
  const selected = tiers[index];
  const teamLabel = t(
    `Up to ${value} team members`,
    `До ${value} членови на тимот`,
    `Deri në ${value} anëtarë të ekipit`,
  );

  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <h3 className="text-base font-medium">
          {t(
            "Choose your Pro package",
            "Изберете го вашиот Pro пакет",
            "Zgjidhni paketën tuaj Pro",
          )}
        </h3>
        <p
          aria-live="polite"
          aria-atomic="true"
          className="flex flex-wrap items-baseline gap-1.5"
        >
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {formatPrice(selected.monthlyPriceMinorUnits, "MKD", locale, false)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {t("month", "месечно", "muaj")}
          </span>
        </p>
      </div>
      <Field>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <FieldLabel htmlFor="pro-team-size">
            {t("Team size", "Големина на тимот", "Madhësia e ekipit")}
          </FieldLabel>
          <span id="pro-team-size-value" className="font-medium tabular-nums">
            {teamLabel}
          </span>
        </div>
        <div>
          <Slider
            id="pro-team-size"
            min={0}
            max={tiers.length - 1}
            step={1}
            value={[index]}
            onValueChange={([next]) => onChange(tiers[next].teamLimit)}
            disabled={disabled}
            className="min-h-11"
            thumbProps={{
              "aria-label": t(
                "Team size",
                "Големина на тимот",
                "Madhësia e ekipit",
              ),
              "aria-valuetext": teamLabel,
              "aria-valuemin": tiers[0].teamLimit,
              "aria-valuemax": tiers[tiers.length - 1].teamLimit,
              "aria-valuenow": value,
              "aria-describedby": "pro-package-description",
            }}
          />
          <div
            aria-hidden="true"
            className="flex justify-between text-xs tabular-nums text-muted-foreground"
          >
            {tiers.map((tier) => (
              <span key={tier.teamLimit}>{tier.teamLimit}</span>
            ))}
          </div>
        </div>
        <FieldDescription id="pro-package-description">
          {t(
            "Every package includes the same Pro features.",
            "Секој пакет ги вклучува истите Pro функции.",
            "Çdo paketë përfshin të njëjtat funksione Pro.",
          )}
        </FieldDescription>
        {teamCount > value && (
          <p role="status" className="text-sm text-destructive">
            {t(
              `You have ${teamCount} active team members. Choose a larger package or deactivate members first.`,
              `Имате ${teamCount} активни членови на тимот. Изберете поголем пакет или прво деактивирајте членови.`,
              `Keni ${teamCount} anëtarë aktivë të ekipit. Zgjidhni një paketë më të madhe ose çaktivizoni anëtarët fillimisht.`,
            )}
          </p>
        )}
        {!selected.checkoutAvailable && (
          <p className="text-sm text-muted-foreground">
            {t(
              "This package is not available for online purchase yet.",
              "Овој пакет сè уште не е достапен за онлајн купување.",
              "Kjo paketë nuk është ende e disponueshme për blerje në internet.",
            )}
          </p>
        )}
      </Field>
    </section>
  );
}
