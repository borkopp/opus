import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { convexModules } from "../convex-test.setup";

// Synthetic image and in-memory studio only; no production writes.
// RUN_SERVICE_PHOTO_LIVE_TEST=true node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/service-photo-live.test.ts
describe.skipIf(process.env.RUN_SERVICE_PHOTO_LIVE_TEST !== "true")(
  "live service photo extraction",
  () => {
    it("reads Macedonian names and prices while distinguishing visible and suggested durations", async () => {
      const backend = convexTest(schema, convexModules);
      const owner = backend.withIdentity({
        subject: "synthetic-photo-owner",
        email: "test@example.com",
      });
      await owner.mutation(api.users.ensureUser);
      await owner.mutation(api.activation.startBeautyBusiness, {
        name: "Synthetic Studio",
        category: "beauty_salon",
      });
      const bytes = await readFile(
        new URL("./fixtures/service-price-list.jpg", import.meta.url),
      );
      const { rows } = await owner.action(api.servicePhoto.extract, {
        image: `data:image/jpeg;base64,${bytes.toString("base64")}`,
      });
      expect(rows).toHaveLength(4);
      expect(rows.find((row) => /шишање/i.test(row.name))).toMatchObject({
        priceMinorUnits: 50000,
        durationSource: "suggested",
      });
      expect(rows.find((row) => /маникир/i.test(row.name))).toMatchObject({
        priceMinorUnits: 120000,
        durationSource: "suggested",
      });
      expect(rows.find((row) => /масажа/i.test(row.name))).toMatchObject({
        priceMinorUnits: 90000,
        durationMins: 45,
        durationSource: "photo",
      });
      expect(rows.find((row) => /боење/i.test(row.name))).toMatchObject({
        priceMinorUnits: null,
      });
    }, 70_000);
  },
);
