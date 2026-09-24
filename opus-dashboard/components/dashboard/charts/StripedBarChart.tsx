import { appearStep } from "@/lib/appear";
import type { CSSProperties } from "react";
import { PILL_STRIPE_STYLE } from "@/components/bookings/service-theme";
import s from "./striped-bar-chart.module.css";

type Point = { label: string; value: number | null; detail: string };

/** Values and maximum use the same units; zero and unavailable remain distinct. */
export function StripedBarChart({
  points,
  maximum,
  axisLabels,
  label,
}: {
  points: Point[];
  maximum: number;
  axisLabels: string[];
  label: string;
}) {
  const peak = Math.max(0, ...points.map((point) => point.value ?? 0));
  return (
    <div className={s.chart} role="group" aria-label={label}>
      <div
        data-appear="fade"
        style={appearStep(3)}
        className={s.axis}
        aria-hidden="true"
      >
        {axisLabels.map((text, index) => (
          <span key={index}>{text}</span>
        ))}
      </div>
      <div
        className={s.plot}
        style={{ "--columns": points.length } as CSSProperties}
      >
        <div
          data-appear="fade"
          style={appearStep(3)}
          className={s.grid}
          aria-hidden="true"
        >
          <i />
          <i />
          <i />
        </div>
        {points.map((point, index) => (
          <div
            className={s.column}
            key={index}
            tabIndex={0}
            aria-label={point.detail}
          >
            <div className={s.track} aria-hidden="true">
              {point.value !== null && point.value > 0 ? (
                <div
                  data-appear="bar-y"
                  className={s.bar}
                  data-peak={point.value === peak}
                  style={{
                    ...PILL_STRIPE_STYLE,
                    ...appearStep(4 + index),
                    height: `${Math.min(100, Math.max(0, (point.value / maximum) * 100))}%`,
                  }}
                />
              ) : (
                <span
                  data-appear="fade"
                  style={appearStep(4 + index)}
                  className={s.zero}
                >
                  {point.value === null ? "—" : "0"}
                </span>
              )}
            </div>
            <span
              data-appear="item"
              style={appearStep(4 + index)}
              className={s.label}
              aria-hidden="true"
            >
              {point.label}
            </span>
            <span className={s.tooltip} aria-hidden="true">
              {point.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
