import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Price } from "../../components/ui/price";

describe("record currency display", () => {
  it("renders each record in its own currency without requiring studio settings access", () => {
    expect(
      renderToStaticMarkup(
        createElement(Price, {
          amount: 1234,
          currency: "EUR",
        }),
      ),
    ).toBe('<span class="">€12.34</span>');
    expect(
      renderToStaticMarkup(
        createElement(Price, {
          amount: 1234,
          currency: "MKD",
        }),
      ),
    ).toBe('<span class="">12.34 ден</span>');
  });

  it("respects the chosen interface locale without changing the currency", () => {
    expect(
      renderToStaticMarkup(
        createElement(Price, {
          amount: 1234,
          currency: "EUR",
          locale: "de-DE",
        }),
      ),
    ).toContain("12,34 €");
  });
});
