import { describe, expect, test } from "vitest";
import { parseMapboxFeature } from "../../lib/mapbox";

describe("Mapbox location parsing", () => {
  test("normalizes a geocoder feature into one structured location", () => {
    const location = parseMapboxFeature({
      id: "address.1",
      place_name: "12 Macedonia Street, Centar, Skopje 1000, North Macedonia",
      text: "Macedonia Street",
      address: "12",
      center: [21.4254, 41.9981],
      context: [
        { id: "neighborhood.1", text: "Centar" },
        { id: "place.1", text: "Skopje" },
        { id: "postcode.1", text: "1000" },
        { id: "country.1", text: "North Macedonia", short_code: "mk" },
      ],
    });

    expect(location).toEqual({
      displayName: "12 Macedonia Street, Centar, Skopje 1000, North Macedonia",
      address: "12 Macedonia Street",
      city: "Skopje",
      neighborhood: "Centar",
      postalCode: "1000",
      country: "MK",
      coordinates: { lat: 41.9981, lng: 21.4254 },
    });
  });
});
