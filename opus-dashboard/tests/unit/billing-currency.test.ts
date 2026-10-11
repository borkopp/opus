import { describe, expect, it } from "vitest";
import {
  billingCurrencyCookie,
  billingCurrencyForCountry,
  billingCurrencyFromCookie,
  parseBillingCurrency,
  requestBillingCurrency,
} from "../../../shared/billing-currency";
import {
  proPriceMinorUnits,
  PRO_TEAM_TIERS,
} from "../../../shared/pro-pricing";
import { GET } from "../../app/api/billing/currency/route";
import { authDestination } from "../../lib/auth-destination";
import { upgradeDestination, upgradeLoginPath } from "../../lib/upgrade";

describe("billing currency selection", () => {
  it.each(["DE", "FR", "BG", "IT", "de"])("selects EUR for %s", (country) => {
    expect(billingCurrencyForCountry(country)).toBe("eur");
  });
  it.each(["MK", "US", "GB", "CH", "", null, undefined])(
    "defaults to MKD for %s",
    (country) => {
      expect(billingCurrencyForCountry(country)).toBe("mkd");
    },
  );
  it.each(["usd", "EUR", "", "eur;foo", null, undefined])(
    "ignores unsupported currency %s",
    (value) => {
      expect(parseBillingCurrency(value)).toBeUndefined();
    },
  );
  it("manual choice wins over country, with malformed preferences ignored", () => {
    expect(
      requestBillingCurrency(
        new Headers({
          "x-vercel-ip-country": "DE",
          cookie: "other=1; opus-billing-currency=mkd",
        }),
      ),
    ).toBe("mkd");
    expect(
      requestBillingCurrency(
        new Headers({
          "x-vercel-ip-country": "MK",
          cookie: "opus-billing-currency=eur",
        }),
      ),
    ).toBe("eur");
    expect(
      requestBillingCurrency(
        new Headers({
          "x-vercel-ip-country": "DE",
          cookie: "opus-billing-currency=usd",
        }),
      ),
    ).toBe("eur");
    expect(
      billingCurrencyFromCookie("fake-opus-billing-currency=eur"),
    ).toBeUndefined();
  });
  it("shares the preference across OPUS hosts and isolates local development", () => {
    expect(billingCurrencyCookie("eur", "studio.opus.mk", true)).toContain(
      "Domain=opus.mk; Secure",
    );
    expect(billingCurrencyCookie("mkd", "opus.mk", true)).toContain(
      "SameSite=Lax; Domain=opus.mk",
    );
    expect(billingCurrencyCookie("eur", "localhost", false)).not.toContain(
      "Domain=",
    );
    expect(billingCurrencyCookie("eur", "evilopus.mk", true)).not.toContain(
      "Domain=",
    );
  });
  it("returns location-based currency without allowing cross-user caching", async () => {
    const response = GET(
      new Request("https://studio.opus.mk/api/billing/currency", {
        headers: { "x-vercel-ip-country": "DE" },
      }),
    );
    expect(await response.json()).toEqual({ currency: "eur" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it.each(PRO_TEAM_TIERS)(
    "retains EUR and team $teamLimit through sign-in and onboarding",
    ({ teamLimit }) => {
      const callback = new URL(
        upgradeLoginPath(teamLimit, "eur"),
        "https://studio.opus.mk",
      ).searchParams.get("callbackUrl")!;
      expect(authDestination(callback, false)).toBe(
        `/upgrade?team=${teamLimit}&currency=eur`,
      );
      const onboarding = upgradeDestination({
        hasStudio: false,
        operationalSetupComplete: false,
        teamLimit,
        currency: "eur",
      });
      expect(onboarding).toBe(
        `/onboarding?plan=pro&team=${teamLimit}&currency=eur`,
      );
      expect(authDestination(onboarding, true)).toBe(callback);
      expect(
        upgradeDestination({
          hasStudio: true,
          role: "owner",
          operationalSetupComplete: true,
          teamLimit,
          currency: "eur",
        }),
      ).toBe(`/settings?tab=billing&team=${teamLimit}&currency=eur`);
    },
  );
  it("uses fixed EUR cents alongside unchanged MKD prices", () => {
    expect(
      PRO_TEAM_TIERS.map((tier) => proPriceMinorUnits(tier, "eur")),
    ).toEqual([2490, 2990, 3490, 3990, 5490]);
    expect(
      PRO_TEAM_TIERS.map((tier) => proPriceMinorUnits(tier, "mkd")),
    ).toEqual([149000, 179000, 209000, 249000, 329000]);
  });
});
