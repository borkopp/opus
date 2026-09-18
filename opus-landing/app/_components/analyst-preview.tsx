"use client";

import { useState, type CSSProperties } from "react";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

const barValues = [
  { values: [48, 30, 65, 56, 92, 76], highlight: 4 },
  { values: [25, 83, 39, 19, 48, 30], highlight: 1 },
  { values: [70, 86, 43, 55, 20, 29], highlight: 1 },
];

export function AnalystPreview() {
  const { t } = useI18n();
  const [selected, setSelected] = useState(0);
  const analystData = t.intelligence.analyst;
  const example = analystData.examples[selected];
  const chart = barValues[selected];

  return (
    <div className="analyst">
      <div className="analyst-top">
        <span className="analyst-icon">
          <Sparkles aria-hidden="true" />
        </span>
        <div>
          <b>{analystData.yourAnalyst}</b>
          <span>{analystData.subtitle}</span>
        </div>
      </div>
      <div className="analyst-example">
        <span className="example-label">{analystData.sampleHeading}</span>
        <div className="question-bubble">{example.question}</div>
        <div className="analyst-answer">
          <span className="blue-spark">
            <Sparkles aria-hidden="true" />
          </span>
          <div>
            <p aria-live="polite">{example.answer}</p>
            <div
              className="bar-chart"
              aria-label={`Chart for: ${example.question}`}
            >
              {chart.values.map((value, index) => (
                <div
                  key={index}
                  className={
                    index === chart.highlight ? "highlight-bar" : undefined
                  }
                >
                  <i style={{ "--bar": `${value}%` } as CSSProperties} />
                  <span>{analystData.days[index]}</span>
                </div>
              ))}
            </div>
            <span className="sample-note">{analystData.sampleNote}</span>
          </div>
        </div>
      </div>
      <div
        className="question-options"
        role="group"
        aria-label={analystData.sampleHeading}
      >
        {analystData.examples.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className={selected === index ? "selected" : undefined}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="analyst-limit">
        <span>{analystData.limit1}</span>
        <span>{analystData.limit2}</span>
      </div>
    </div>
  );
}
