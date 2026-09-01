import { describe, expect, test } from "vitest";
import {
  formatMapboxDistance,
  formatMapboxDuration,
  parseMapboxFeature,
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
