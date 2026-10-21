import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { convexModules } from "../../convex-test.setup";
import {
  normalizeExtractedServices,
  serviceImportSchema,
} from "../../convex/lib/serviceImport";

const { createResponse } = vi.hoisted(() => ({ createResponse: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: createResponse };
  },
}));

const extracted = [
  {
    name: "Гел маникир",
    categoryName: null,
    priceMinorUnits: 120000,
    durationMins: 60,
    durationSource: "suggested" as const,
    confidenceScore: 0.95,
  },
  {
    name: "Корекција",
    categoryName: null,
    priceMinorUnits: null,
    durationMins: 40,
    durationSource: "photo" as const,
    confidenceScore: 0.6,
  },
];
// Minimal JPEG header is sufficient for the mocked provider boundary.
const image = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
async function setup() {
  const backend = convexTest(schema, convexModules);
  const owner = backend.withIdentity({
    subject: "photo-owner",
    email: "owner@example.com",
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: "Test Studio",
    category: "nail_salon",
  });
  return { backend, owner, orgId };
}
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-not-a-real-key");
  createResponse.mockReset().mockResolvedValue({
    status: "completed",
    output_text: JSON.stringify({ services: extracted }),
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("onboarding service photo import", () => {
  it("extracts draft services without creating bookable services and marks rounded durations as suggestions", async () => {
    const { backend, owner, orgId } = await setup();
    const result = await owner.action(api.servicePhoto.extract, { image });
    expect(result.rows[0]).toEqual(extracted[0]);
    expect(result.rows[1]).toMatchObject({
      priceMinorUnits: null,
      durationMins: 45,
      durationSource: "suggested",
    });
    expect(
      await backend.run((ctx) =>
        ctx.db
          .query("services")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .collect(),
      ),
    ).toHaveLength(0);
    const job = await backend.run((ctx) => ctx.db.get(result.importId));
    expect(job?.status).toBe("ready");
    expect(JSON.stringify(job)).not.toContain("base64");
    expect(createResponse.mock.calls[0][0]).toMatchObject({
      store: false,
      model: "gpt-6-luna",
    });
  });

  it("requires review, saves atomically for the owner, and makes retries idempotent", async () => {
    const { backend, owner, orgId } = await setup();
    const { importId } = await owner.action(api.servicePhoto.extract, {
      image,
    });
    const services = [
      { name: "Гел маникир", durationMins: 75, priceMinorUnits: 120000 },
      { name: "Корекција", durationMins: 45, priceMinorUnits: 90000 },
    ];
    await expect(
      owner.mutation(api.serviceImports.confirm, {
        importId,
        services,
        reviewed: false,
      }),
    ).rejects.toThrow("Review the prices");
    await expect(
      owner.mutation(api.serviceImports.confirm, {
        importId,
        services: [services[0], { ...services[1], durationMins: 44 }],
        reviewed: true,
      }),
    ).rejects.toThrow("Check every service");
    expect(
      await backend.run((ctx) =>
        ctx.db
          .query("services")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .collect(),
      ),
    ).toHaveLength(0);
    const ids = await owner.mutation(api.serviceImports.confirm, {
      importId,
      services,
      reviewed: true,
    });
    expect(
      await owner.mutation(api.serviceImports.confirm, {
        importId,
        services,
        reviewed: true,
      }),
    ).toEqual(ids);
    const saved = await backend.run((ctx) =>
      ctx.db
        .query("services")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(saved).toHaveLength(2);
    expect(saved[0]).toMatchObject({
      name: "Гел маникир",
      currency: "MKD",
      durationMins: 75,
      priceMinorUnits: 120000,
      isActive: true,
    });
    expect(saved.every((row) => row.staffIds.length === 1)).toBe(true);
    const state = await owner.query(api.activation.getState);
    expect(state?.firstService?._id).toBe(ids[0]);
    const audits = await backend.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org_action", (q) =>
          q.eq("orgId", orgId).eq("action", "services.photo_imported"),
        )
        .collect(),
    );
    expect(audits).toHaveLength(2);
  });

  it("rejects other studios, staff, and unauthenticated users before provider calls or writes", async () => {
    const { backend, owner, orgId } = await setup();
    await expect(
      backend.action(api.servicePhoto.extract, { image }),
    ).rejects.toThrow("Unauthenticated");
    expect(createResponse).not.toHaveBeenCalled();
    const { importId } = await owner.action(api.servicePhoto.extract, {
      image,
    });
    const other = backend.withIdentity({
      subject: "other-owner",
      email: "other@example.com",
    });
    await other.mutation(api.users.ensureUser);
    await other.mutation(api.activation.startBeautyBusiness, {
      name: "Other Studio",
      category: "hair_salon",
    });
    const services = [
      { name: "Haircut", priceMinorUnits: 50000, durationMins: 30 },
    ];
    await expect(
      other.mutation(api.serviceImports.confirm, {
        importId,
        services,
        reviewed: true,
      }),
    ).rejects.toThrow("Import not found");
    await backend.run(async (ctx) => {
      const staff = await ctx.db
        .query("staff_members")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .first();
      await ctx.db.patch(staff!._id, { role: "staff" });
    });
    createResponse.mockClear();
    await expect(
      owner.action(api.servicePhoto.extract, { image }),
    ).rejects.toThrow("Unauthorised");
    await expect(
      owner.mutation(api.serviceImports.confirm, {
        importId,
        services,
        reviewed: true,
      }),
    ).rejects.toThrow("Unauthorised");
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("rejects duplicates without modifying existing services or partially importing", async () => {
    const { backend, owner, orgId } = await setup();
    const id = await owner.mutation(api.activation.saveFirstService, {
      name: "Гел маникир",
      priceMinorUnits: 130000,
      durationMins: 90,
    });
    const { importId } = await owner.action(api.servicePhoto.extract, {
      image,
    });
    await expect(
      owner.mutation(api.serviceImports.confirm, {
        importId,
        reviewed: true,
        services: [
          { name: "New service", priceMinorUnits: 40000, durationMins: 30 },
          {
            name: "  ГЕЛ   МАНИКИР ",
            priceMinorUnits: 120000,
            durationMins: 60,
          },
        ],
      }),
    ).rejects.toThrow("already exists");
    expect(await backend.run((ctx) => ctx.db.get(id))).toMatchObject({
      durationMins: 90,
      priceMinorUnits: 130000,
    });
    expect(
      await backend.run((ctx) =>
        ctx.db
          .query("services")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .collect(),
      ),
    ).toHaveLength(1);
  });

  it("preserves photo sections and imports repeated names into separate categories", async () => {
    const { backend, owner, orgId } = await setup();
    const photoRows = [
      { ...extracted[0], name: "Hair Styling", categoryName: " WOMEN " },
      { ...extracted[0], name: "Hair Styling", categoryName: "MEN" },
      { ...extracted[0], name: "Shampoo-Blow-Dry", categoryName: "MEN" },
      { ...extracted[0], name: "Shampoo-Blow-Dry", categoryName: "KIDS" },
    ];
    createResponse.mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({ services: photoRows }),
    });
    const { importId, rows } = await owner.action(api.servicePhoto.extract, {
      image,
    });
    expect(rows.map((row) => row.categoryName)).toEqual([
      "WOMEN",
      "MEN",
      "MEN",
      "KIDS",
    ]);
    expect((await backend.run((ctx) => ctx.db.get(importId)))?.rows).toEqual(
      rows,
    );
    expect(
      await backend.run((ctx) =>
        ctx.db
          .query("service_categories")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .collect(),
      ),
    ).toHaveLength(0);
    const services = rows.map((row) => ({
      name: row.name,
      categoryName: row.categoryName!,
      priceMinorUnits: row.priceMinorUnits!,
      durationMins: row.durationMins!,
    }));
    const ids = await owner.mutation(api.serviceImports.confirm, {
      importId,
      reviewed: true,
      services,
    });
    expect(
      await owner.mutation(api.serviceImports.confirm, {
        importId,
        reviewed: true,
        services,
      }),
    ).toEqual(ids);
    const categories = await backend.run((ctx) =>
      ctx.db
        .query("service_categories")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      categories.map(({ name, sortOrder }) => ({ name, sortOrder })),
    ).toEqual([
      { name: "WOMEN", sortOrder: 0 },
      { name: "MEN", sortOrder: 1 },
      { name: "KIDS", sortOrder: 2 },
    ]);
    const saved = await backend.run((ctx) =>
      ctx.db
        .query("services")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      saved.map((service) => ({
        name: service.name,
        category: categories.find(
          (category) => category._id === service.categoryId,
        )?.name,
      })),
    ).toEqual(
      services.map((service) => ({
        name: service.name,
        category: service.categoryName,
      })),
    );
    const categoryAudits = await backend.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org_action", (q) =>
          q.eq("orgId", orgId).eq("action", "service_category.created"),
        )
        .collect(),
    );
    expect(categoryAudits).toHaveLength(3);
    expect(
      categoryAudits.every((audit) => audit.after.importId === importId),
    ).toBe(true);
  });

  it("reuses only this studio's active categories and scopes existing-service duplicates by category", async () => {
    const { backend, owner, orgId } = await setup();
    const women = await owner.mutation(api.serviceCategories.createCategory, {
      orgId,
      name: "Women",
      sortOrder: 2,
    });
    const deleted = await owner.mutation(api.serviceCategories.createCategory, {
      orgId,
      name: "Kids",
      sortOrder: 3,
    });
    await backend.run((ctx) =>
      ctx.db.patch(deleted, { isDeleted: true, deletedAt: Date.now() }),
    );
    const other = backend.withIdentity({
      subject: "category-other-owner",
      email: "other@example.com",
    });
    await other.mutation(api.users.ensureUser);
    const { orgId: otherOrgId } = await other.mutation(
      api.activation.startBeautyBusiness,
      { name: "Other Studio", category: "hair_salon" },
    );
    const otherMen = await other.mutation(
      api.serviceCategories.createCategory,
      { orgId: otherOrgId, name: "Men", sortOrder: 0 },
    );
    const existingId = await owner.mutation(api.activation.saveFirstService, {
      name: "Hair Styling",
      priceMinorUnits: 50000,
      durationMins: 30,
    });
    await backend.run((ctx) => ctx.db.patch(existingId, { categoryId: women }));
    const { importId } = await owner.action(api.servicePhoto.extract, {
      image,
    });
    const draft = {
      name: "Hair Styling",
      priceMinorUnits: 60000,
      durationMins: 45,
    };
    await expect(
      owner.mutation(api.serviceImports.confirm, {
        importId,
        reviewed: true,
        services: [
          { ...draft, categoryName: "MEN" },
          {
            ...draft,
            name: " HAIR   STYLING ",
            categoryName: "  ＷＯＭＥＮ  ",
          },
        ],
      }),
    ).rejects.toThrow("already exists in this category");
    const ids = await owner.mutation(api.serviceImports.confirm, {
      importId,
      reviewed: true,
      services: [
        { ...draft, categoryName: "MEN" },
        { ...draft, name: "Haircut", categoryName: "  WOMEN  " },
        { ...draft, categoryName: " KIDS " },
        { ...draft, categoryName: "  " },
      ],
    });
    const saved = await backend.run(async (ctx) =>
      Promise.all(ids.map((id) => ctx.db.get(id))),
    );
    expect(saved[0]?.categoryId).not.toBe(otherMen);
    expect(saved[1]?.categoryId).toBe(women);
    expect(saved[2]?.categoryId).not.toBe(deleted);
    expect(saved[3]?.categoryId).toBeUndefined();
    const categories = await backend.run((ctx) =>
      ctx.db
        .query("service_categories")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      categories
        .filter((category) => !category.isDeleted)
        .map((category) => [category.name, category.sortOrder]),
    ).toEqual([
      ["Women", 2],
      ["MEN", 4],
      ["KIDS", 5],
    ]);
    expect(await backend.run((ctx) => ctx.db.get(existingId))).toMatchObject({
      categoryId: women,
      priceMinorUnits: 50000,
    });
  });

  it.each([" MEN ", "   "])(
    "rejects repeated names within category %j without creating categories or services",
    async (categoryName) => {
      const { backend, owner, orgId } = await setup();
      const { importId } = await owner.action(api.servicePhoto.extract, {
        image,
      });
      const draft = {
        name: "Hair Styling",
        categoryName,
        priceMinorUnits: 50000,
        durationMins: 30,
      };
      await expect(
        owner.mutation(api.serviceImports.confirm, {
          importId,
          reviewed: true,
          services: [
            draft,
            {
              ...draft,
              name: " HAIR   STYLING ",
              categoryName: categoryName.trim().toLowerCase(),
            },
          ],
        }),
      ).rejects.toThrow("already exists in this category");
      expect(
        await backend.run((ctx) =>
          ctx.db
            .query("service_categories")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect(),
        ),
      ).toHaveLength(0);
      expect(
        await backend.run((ctx) =>
          ctx.db
            .query("services")
            .withIndex("by_org", (q) => q.eq("orgId", orgId))
            .collect(),
        ),
      ).toHaveLength(0);
      expect((await backend.run((ctx) => ctx.db.get(importId)))?.status).toBe(
        "ready",
      );
    },
  );

  it("accepts legacy drafts without categories and validates edited category names", async () => {
    const { backend, owner, orgId } = await setup();
    const { importId } = await owner.mutation(
      internal.serviceImports.reserve,
      {},
    );
    await owner.mutation(internal.serviceImports.finish, {
      importId,
      orgId,
      failed: false,
      rows: [
        {
          name: "Hair Styling",
          priceMinorUnits: 50000,
          durationMins: 30,
          durationSource: "suggested",
          confidenceScore: 0.9,
        },
      ],
    });
    const draft = {
      name: "Hair Styling",
      priceMinorUnits: 50000,
      durationMins: 30,
    };
    await expect(
      owner.mutation(api.serviceImports.confirm, {
        importId,
        reviewed: true,
        services: [{ ...draft, categoryName: "x".repeat(121) }],
      }),
    ).rejects.toThrow("120 characters");
    const [id] = await owner.mutation(api.serviceImports.confirm, {
      importId,
      reviewed: true,
      services: [draft],
    });
    expect(
      (await backend.run((ctx) => ctx.db.get(id)))?.categoryId,
    ).toBeUndefined();
  });

  it("bounds spend per studio and blocks overlapping extraction attempts", async () => {
    const { owner, orgId } = await setup();
    const job = await owner.mutation(internal.serviceImports.reserve, {});
    await expect(
      owner.action(api.servicePhoto.extract, { image }),
    ).rejects.toThrow("already being read");
    await owner.mutation(internal.serviceImports.finish, {
      importId: job.importId,
      orgId,
      rows: [],
      failed: true,
    });
    for (let attempt = 1; attempt < 10; attempt++)
      await owner.action(api.servicePhoto.extract, { image });
    await expect(
      owner.action(api.servicePhoto.extract, { image }),
    ).rejects.toThrow("Photo limit reached");
    expect(createResponse).toHaveBeenCalledTimes(9);
  });

  it("does not expose provider failures or accept truncated, malformed or oversized payloads", async () => {
    const { backend, owner, orgId } = await setup();
    await expect(
      owner.action(api.servicePhoto.extract, {
        image: "https://example.com/image.jpg",
      }),
    ).rejects.toThrow("Choose a smaller");
    await expect(
      owner.action(api.servicePhoto.extract, {
        image: "data:image/jpeg;base64," + "a".repeat(900_001),
      }),
    ).rejects.toThrow("Choose a smaller");
    expect(createResponse).not.toHaveBeenCalled();
    createResponse.mockRejectedValueOnce(
      new Error("provider-private-debug-info"),
    );
    await expect(
      owner.action(api.servicePhoto.extract, { image }),
    ).rejects.toThrow("Try a clearer photo");
    createResponse.mockResolvedValueOnce({
      status: "incomplete",
      output_text: JSON.stringify({ services: extracted }),
    });
    await expect(
      owner.action(api.servicePhoto.extract, { image }),
    ).rejects.toThrow("Try a clearer photo");
    const jobs = await backend.run((ctx) =>
      ctx.db
        .query("service_imports")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      jobs.every((job) => job.status === "failed" && job.rows.length === 0),
    ).toBe(true);
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(
      owner.action(api.servicePhoto.extract, { image }),
    ).rejects.toThrow("temporarily unavailable");
  });

  it("keeps unknown values missing and validates model money and confidence", () => {
    expect(
      normalizeExtractedServices(
        [{ ...extracted[0], durationSource: "missing", durationMins: 60 }],
        15,
      )[0],
    ).toMatchObject({ durationMins: null, durationSource: "missing" });
    expect(
      serviceImportSchema.safeParse({
        services: [{ ...extracted[0], priceMinorUnits: 3.14 }],
      }).success,
    ).toBe(false);
    expect(
      serviceImportSchema.safeParse({
        services: [{ ...extracted[0], confidenceScore: 1.1 }],
      }).success,
    ).toBe(false);
  });
});
