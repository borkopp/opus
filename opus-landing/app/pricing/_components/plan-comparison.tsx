"use client";

import { Check, Minus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n/context";
import { pricingPageMessages } from "@/lib/i18n/pricing";

function PlanValue({
  value,
  label,
}: {
  value: boolean | string;
  label: string;
}) {
  if (typeof value === "string") return <span>{value}</span>;
  const Icon = value ? Check : Minus;
  return (
    <span className="plan-comparison-status" data-included={value}>
      <Icon aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PlanComparison() {
  const { locale } = useI18n();
  const copy = pricingPageMessages[locale];

  return (
    <section
      className="section plan-comparison"
      id="comparison"
      aria-labelledby="comparison-title"
    >
      <div className="section-heading centered">
        <h2 id="comparison-title">{copy.comparisonHeading}</h2>
        <p>{copy.comparisonDescription}</p>
      </div>
      <div className="plan-comparison-frame">
        <Table
          className="plan-comparison-table table-fixed text-xs sm:text-sm"
          aria-labelledby="comparison-title"
        >
          <colgroup>
            <col className="plan-comparison-feature-col" />
            <col />
            <col />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead
                scope="col"
                className="px-3 py-5 whitespace-normal sm:px-6"
              >
                {copy.feature}
              </TableHead>
              <TableHead
                scope="col"
                className="px-2 py-5 text-center whitespace-normal sm:px-6"
              >
                {copy.free}
              </TableHead>
              <TableHead
                scope="col"
                className="px-2 py-5 text-center whitespace-normal sm:px-6"
              >
                Pro
              </TableHead>
            </TableRow>
          </TableHeader>
          {copy.groups.map((group) => (
            <TableBody key={group.title}>
              <TableRow className="plan-comparison-group">
                <TableHead
                  colSpan={3}
                  scope="rowgroup"
                  className="px-3 py-4 whitespace-normal sm:px-6"
                >
                  {group.title}
                </TableHead>
              </TableRow>
              {group.rows.map((row) => (
                <TableRow key={row.feature}>
                  <TableHead
                    scope="row"
                    className="px-3 py-4 whitespace-normal sm:px-6"
                  >
                    {row.feature}
                    {row.description && <small>{row.description}</small>}
                  </TableHead>
                  {[row.free, row.pro].map((value, index) => (
                    <TableCell
                      key={index}
                      className="px-2 py-4 text-center whitespace-normal sm:px-6"
                    >
                      <span
                        className="comparison-mobile-plan"
                        aria-hidden="true"
                      >
                        {index === 0 ? copy.free : "Pro"}
                      </span>
                      <PlanValue
                        value={value}
                        label={value ? copy.included : copy.notIncluded}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          ))}
        </Table>
      </div>
      <div className="plan-comparison-note">
        <h3>{copy.activationTitle}</h3>
        <p>{copy.activationNote}</p>
      </div>
    </section>
  );
}
