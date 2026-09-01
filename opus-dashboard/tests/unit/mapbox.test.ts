import { describe, expect, test, vi } from "vitest";
import {
  formatMapboxDistance,
  formatMapboxDuration,
  getBusinessLocationError,
  parseMapboxFeature,
  searchMapbox,
} from "../../lib/mapbox";

describe("Mapbox location parsing", () => {
  test("normalizes a geocoder feature into one structured location", () => {
    const location = parseMapboxFeature({
      id: "address.1",
      place_name: "12 Macedonia Street, Centar, Skopje 1000, Macedonia",
      text: "Macedonia Street",
      address: "12",
      center: [21.4254, 41.9981],
      context: [
        { id: "neighborhood.1", text: "Centar" },
        { id: "place.1", text: "Skopje" },
        { id: "postcode.1", text: "1000" },
        { id: "country.1", text: "Macedonia", short_code: "mk" },
      ],
    });

    expect(location).toEqual({
      displayName: "12 Macedonia Street, Centar, Skopje 1000, Macedonia",
      address: "12 Macedonia Street",
      city: "Skopje",
      neighborhood: "Centar",
      postalCode: "1000",
      country: "MK",
      coordinates: { lat: 41.9981, lng: 21.4254 },
    });
  });

  test("uses a top-level place feature as the city instead of sending an empty value", () => {
    const location = parseMapboxFeature({
      id: "place.533650",
      place_type: ["place"],
      place_name: "Skopje, North Macedonia",
      text: "Skopje",
      center: [21.4254, 41.9981],
      context: [
        { id: "country.8850", text: "North Macedonia", short_code: "mk" },
      ],
    });

    expect(location).toMatchObject({
      address: "Skopje",
      city: "Skopje",
      country: "MK",
    });
    expect(getBusinessLocationError(location)).toBeNull();
  });

  test("prefers the city hierarchy and normalizes country subdivision codes", () => {
    const location = parseMapboxFeature({
      id: "address.2",
      place_type: ["address"],
      place_name: "8 Partizanski Odredi, Karposh, Skopje, North Macedonia",
      text: "Partizanski Odredi",
      address: "8",
      center: [21.407, 42.003],
      context: [
        { id: "locality.1", text: "Karposh" },
        { id: "place.1", text: "Skopje" },
        { id: "country.1", text: "North Macedonia", short_code: "mk-85" },
      ],
    });

    expect(location).toMatchObject({
      address: "8 Partizanski Odredi",
      city: "Skopje",
      neighborhood: "Karposh",
      country: "MK",
    });
  });

  test("falls back to the municipality when Mapbox omits a place context", () => {
    const location = parseMapboxFeature({
      id: "address.3",
      place_type: ["address"],
      place_name: "Партизанска 8, 2000, Македонија",
      text: "Партизанска",
      address: "8",
      center: [22.188957, 41.739624],
      context: [
        { id: "postcode.1", text: "2000" },
        { id: "region.1", text: "Општина Штип", short_code: "MK-211" },
        { id: "country.1", text: "Македонија", short_code: "mk" },
      ],
    });

    expect(location.city).toBe("Општина Штип");
    expect(getBusinessLocationError(location)).toBeNull();
  });

  test("rejects incomplete and out-of-market locations before submission", () => {
    expect(
      getBusinessLocationError({
        address: "Main Street 1",
        city: "",
        neighborhood: "",
        postalCode: "",
        country: "MK",
        coordinates: { lat: 41.99, lng: 21.43 },
        displayName: "Main Street 1",
      }),
    ).toBe("Choose a result that includes both an address and city.");

    expect(
      getBusinessLocationError({
        address: "Main Street 1",
        city: "Sofia",
        neighborhood: "",
        postalCode: "",
        country: "BG",
        coordinates: { lat: 42.69, lng: 23.32 },
        displayName: "Main Street 1, Sofia",
      }),
    ).toBe("Choose a location in North Macedonia.");

    expect(
      getBusinessLocationError({
        address: "Foreign Street 1",
        city: "Sofia",
        neighborhood: "",
        postalCode: "",
        country: "MK",
        coordinates: { lat: 42.69, lng: 23.32 },
        displayName: "Foreign Street 1, Sofia",
      }),
    ).toBe("Choose a location in North Macedonia.");
  });

  test("constrains search to North Macedonia and discards malformed features", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test-token");
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      requestedUrls.push(String(input));
      return {
        ok: true,
        json: async () => ({
          features: [
            {
              id: "place.533650",
              place_type: ["place"],
              place_name: "Skopje, North Macedonia",
              text: "Skopje",
              center: [21.4254, 41.9981],
              context: [
                {
                  id: "postcode.1150610",
                  text: "1000",
                  short_code: null,
                },
                {
                  id: "country.8850",
                  text: "North Macedonia",
                  short_code: "mk",
                },
              ],
            },
            {
              id: "address.invalid",
              place_name: "Broken result",
              text: "Broken result",
              center: ["not-a-coordinate", 41.9981],
            },
          ],
        }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      const results = await searchMapbox("  Skopje  ");
      expect(results).toHaveLength(1);

      const requestedUrl = new URL(requestedUrls[0]);
      expect(requestedUrl.pathname).toContain("/Skopje.json");
      expect(requestedUrl.searchParams.get("country")).toBe("mk");
      expect(requestedUrl.searchParams.get("language")).toBe("mk,en");
      expect(requestedUrl.searchParams.get("types")).toBe(
        "address,place,locality,neighborhood",
      );
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});

describe("Mapbox route summary formatting", () => {
  test("formats short and hour-long travel times", () => {
    expect(formatMapboxDuration(61)).toBe("2 мин");
    expect(formatMapboxDuration(3_600)).toBe("1 ч");
    expect(formatMapboxDuration(3_661)).toBe("1 ч 2 мин");
  });

  test("formats metres and localized kilometres", () => {
    expect(formatMapboxDistance(850)).toBe("850 м");
    expect(formatMapboxDistance(1_250)).toBe("1,3 км");
  });
});
