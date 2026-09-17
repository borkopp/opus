"use client";

import { useState, type CSSProperties } from "react";
import { Sparkles } from "lucide-react";

const examples = [
  {
    label: "My busiest days?",
    question: "When is my studio busiest?",
    answer: "In this sample week, Friday is your busiest day. Tuesday has the most space for new appointments.",
    values: [48, 30, 65, 56, 92, 76],
    highlight: 4,
  },
  {
    label: "Cancellation patterns?",
    question: "What do my cancellation patterns look like?",
    answer: "In this sample, Tuesday has the most cancellations. Look at how far in advance clients cancel to plan your follow-up.",
    values: [25, 83, 39, 19, 48, 30],
    highlight: 1,
  },
  {
    label: "Room to grow?",
    question: "Where does my studio have room to grow?",
    answer: "This sample shows the most available time on Monday and Tuesday. Consider testing a relevant rebooking offer for past clients.",
    values: [70, 86, 43, 55, 20, 29],
    highlight: 1,
  },
];

export function AnalystPreview() {
  const [selected, setSelected] = useState(0);
  const example = examples[selected];

  return (
    <div className="analyst">
      <div className="analyst-top">
        <span className="analyst-icon"><Sparkles aria-hidden="true" /></span>
        <div>
          <b>Your business analyst</b>
          <span>Good questions. Clearer decisions.</span>
        </div>
      </div>
      <div className="analyst-example">
        <span className="example-label">EXPLORE A SAMPLE CONVERSATION</span>
        <div className="question-bubble">{example.question}</div>
        <div className="analyst-answer">
          <span className="blue-spark"><Sparkles aria-hidden="true" /></span>
          <div>
            <p aria-live="polite">{example.answer}</p>
            <div
              className="bar-chart"
              aria-label={`Illustrative sample chart for: ${example.question}`}
            >
              {example.values.map((value, index) => (
                <div key={index} className={index === example.highlight ? "highlight-bar" : undefined}>
                  <i style={{ "--bar": `${value}%` } as CSSProperties} />
                  <span>{["M", "T", "W", "T", "F", "S"][index]}</span>
                </div>
              ))}
            </div>
            <span className="sample-note">Illustrative data · Your answers use your studio’s data.</span>
          </div>
        </div>
      </div>
      <div className="question-options" role="group" aria-label="Sample business analyst questions">
        {examples.map((item, index) => (
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
        <span>200 answers / month</span>
        <span>Up to 20 detailed analyses</span>
      </div>
    </div>
  );
}
