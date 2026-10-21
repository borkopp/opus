import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { convexModules } from "../convex-test.setup";

// In-memory studios only; no production writes. An optional local image is sent
// transiently to the configured extraction provider, like the onboarding upload.
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

    it.skipIf(!process.env.SERVICE_PHOTO_LIVE_IMAGE_PATH)(
      "keeps WOMEN, MEN and KIDS sections from a supplied salon photo through confirmation",
      async () => {
        const backend = convexTest(schema, convexModules);
        const owner = backend.withIdentity({
          subject: "category-photo-owner",
          email: "test@example.com",
        });
        await owner.mutation(api.users.ensureUser);
        const { orgId } = await owner.mutation(
          api.activation.startBeautyBusiness,
          { name: "Photo Test Studio", category: "hair_salon" },
        );
        const bytes = await readFile(
          process.env.SERVICE_PHOTO_LIVE_IMAGE_PATH!,
        );
        const { importId, rows } = await owner.action(
          api.servicePhoto.extract,
          { image: `data:image/jpeg;base64,${bytes.toString("base64")}` },
        );
        expect(rows).toHaveLength(19);
        expect(
          rows.filter((row) => row.categoryName?.toUpperCase() === "WOMEN"),
        ).toHaveLength(12);
        expect(
          rows.filter((row) => row.categoryName?.toUpperCase() === "MEN"),
        ).toHaveLength(4);
        expect(
          rows.filter((row) => row.categoryName?.toUpperCase() === "KIDS"),
        ).toHaveLength(3);
        expect(
          rows
            .filter((row) => /^hair styling$/i.test(row.name))
            .map((row) => row.categoryName?.toUpperCase())
            .sort(),
        ).toEqual(["MEN", "WOMEN"]);
        // The supplied list uses dollars; prices must not be silently used as MKD.
        expect(rows.every((row) => row.priceMinorUnits === null)).toBe(true);
        const ids = await owner.mutation(api.serviceImports.confirm, {
          importId,
          reviewed: true,
          services: rows.map((row) => ({
            name: row.name,
            categoryName: row.categoryName ?? undefined,
            priceMinorUnits: 50000, // Explicit synthetic review value, not currency conversion.
            durationMins: 30,
          })),
        });
        expect(ids).toHaveLength(19);
        const categories = await backend.run((ctx) =>
          ctx.db
            .query("service_categories")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect(),
        );
        expect(
          categories.map((category) => category.name.toUpperCase()).sort(),
        ).toEqual(["KIDS", "MEN", "WOMEN"]);
        const services = await backend.run((ctx) =>
          ctx.db
            .query("services")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect(),
        );
        expect(
          services.every((service) =>
            categories.some((category) => category._id === service.categoryId),
          ),
        ).toBe(true);
      },
      70_000,
    );
  },
);
