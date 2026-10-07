import { afterEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { convexModules } from "../../convex-test.setup";
import {
  defaultWebsiteDesign,
  type WebsiteDesign,
} from "../../../shared/website-design";
import { websiteBookingContent } from "../../lib/website-booking-content";

function backend() {
  return convexTest(schema, convexModules);
}
type Backend = ReturnType<typeof backend>;

async function studio(
  t: Backend,
  subject = "sites-owner",
  plan: "free" | "paid" = "free",
) {
  const owner = t.withIdentity({
    subject,
    email: `${subject}@example.com`,
    name: "Sites Owner",
  });
  await owner.mutation(api.users.ensureUser);
  const { orgId } = await owner.mutation(api.activation.startBeautyBusiness, {
    name: subject,
    category: "hair_salon",
  });
  if (plan === "paid") await t.run((ctx) => ctx.db.patch(orgId, { plan }));
  await owner.mutation(api.activation.saveOwnerName, { name: "Sites Owner" });
  await owner.mutation(api.activation.saveLocation, {
    address: "Macedonia Street 12",
    city: "Skopje",
    neighborhood: "Centar",
    postalCode: "1000",
    country: "mk",
    coordinates: { lat: 41.9981, lng: 21.4254 },
  });
  const serviceId = await owner.mutation(api.activation.saveFirstService, {
    name: "Signature Cut",
    durationMins: 45,
    priceMinorUnits: 1800,
  });
  await owner.mutation(api.activation.saveHours, {
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      open: "09:00",
      close: "17:00",
      isClosed: dayOfWeek > 4,
    })),
  });
  return { owner, orgId, serviceId };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("OPUS Sites ownership and publication", () => {
  test("rejects anonymous and staff access, and cross-studio content references", async () => {
    const t = backend();
    const first = await studio(t);
    const second = await studio(t, "other-sites-owner");
    await expect(t.query(api.websiteDesigns.getEditor, {})).rejects.toThrow(
      "Unauthenticated",
    );
    const employee = t.withIdentity({
      subject: "sites-employee",
      email: "employee@example.com",
    });
    const userId = await employee.mutation(api.users.ensureUser);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.patch(userId, { activeOrgId: first.orgId });
      await ctx.db.insert("staff_members", {
        orgId: first.orgId,
        userId,
        displayName: "Employee",
        role: "manager",
        specialties: [],
        isActive: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
    });
    await expect(
      employee.query(api.websiteDesigns.getEditor, {}),
    ).rejects.toThrow();
    await expect(
      employee.mutation(api.websiteDesigns.saveDraft, {
        design: defaultWebsiteDesign(),
        baseRevision: 0,
      }),
    ).rejects.toThrow();
    const design = defaultWebsiteDesign();
    design.serviceCopy = [
      {
        serviceId: second.serviceId,
        name: "Other studio service",
        description: "",
      },
    ];
    await expect(
      first.owner.mutation(api.websiteDesigns.saveDraft, {
        design,
        baseRevision: 0,
      }),
    ).rejects.toThrow("service text");
    const otherImage = await second.owner.mutation(api.orgMedia.addMedia, {
      orgId: second.orgId,
      url: "https://images.example.com/other.jpg",
      type: "gallery",
      sortOrder: 0,
    });
    design.serviceCopy = [];
    design.hero.imageId = otherImage;
    await expect(
      first.owner.mutation(api.websiteDesigns.saveDraft, {
        design,
        baseRevision: 0,
      }),
    ).rejects.toThrow("own studio");
    expect(
      (await first.owner.query(api.websiteDesigns.getEditor, {})).revision,
    ).toBe(0);
  });

  test("keeps drafts private until explicit publishing and rejects stale saves", async () => {
    const t = backend();
    const { owner, orgId, serviceId } = await studio(t, "sites-owner", "paid");
    await owner.mutation(api.website.publish, {});
    const slug = (await owner.query(api.websiteDesigns.getEditor, {})).site
      .slug;
    const design = defaultWebsiteDesign("en");
    design.content.heroTitle = "Make time for yourself";
    design.serviceCopy = [
      {
        serviceId,
        name: "The signature cut",
        description: "Thoughtful, wearable hair.",
      },
    ];
    const saved = await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 0,
    });
    expect(
      (await t.query(api.publicSite.getBySlug, { slug }))?.design,
    ).toBeUndefined();
    await expect(
      owner.mutation(api.websiteDesigns.saveDraft, { design, baseRevision: 0 }),
    ).rejects.toThrow("another window");
    await owner.mutation(api.websiteDesigns.publish, {
      revision: saved.revision,
    });
    const publicSite = (await t.query(api.publicSite.getBySlug, { slug }))!;
    const bookingSite = websiteBookingContent(publicSite, "en");
    expect(bookingSite.services[0].name).toBe("The signature cut");
    expect(bookingSite.services[0]._id).toBe(serviceId);
    expect(bookingSite.services[0].priceMinorUnits).toBe(1800);
    expect(
      (await t.query(api.publicSite.getBySlug, { slug }))?.design?.content
        .heroTitle,
    ).toBe("Make time for yourself");
    design.content.heroTitle = "An unpublished experiment";
    await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 1,
    });
    await expect(
      owner.mutation(api.websiteDesigns.publish, { revision: 1 }),
    ).rejects.toThrow("Save your current draft");
    expect(
      (await t.query(api.publicSite.getBySlug, { slug }))?.design?.content
        .heroTitle,
    ).toBe("Make time for yourself");
    const service = await t.run((ctx) => ctx.db.get(serviceId));
    expect(service?.name).toBe("Signature Cut");
    expect(service?.priceMinorUnits).toBe(1800);
    expect(service?.durationMins).toBe(45);
    const actions = await t.run((ctx) =>
      ctx.db
        .query("audit_log")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect(),
    );
    expect(
      actions.some((item) => item.action === "website.design_published"),
    ).toBe(true);
  });

  test("keeps website readiness requirements and required booking sections", async () => {
    const t = backend();
    const owner = t.withIdentity({
      subject: "incomplete-sites",
      email: "incomplete@example.com",
    });
    await owner.mutation(api.users.ensureUser);
    await owner.mutation(api.activation.startBeautyBusiness, {
      name: "Incomplete Studio",
      category: "barbershop",
    });
    const design = defaultWebsiteDesign();
    await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 0,
    });
    await expect(
      owner.mutation(api.websiteDesigns.publish, { revision: 1 }),
    ).rejects.toThrow("Cannot publish");
    design.sections.find((section) => section.id === "services")!.visible =
      false;
    await expect(
      owner.mutation(api.websiteDesigns.saveDraft, { design, baseRevision: 1 }),
    ).rejects.toThrow("visible");
  });

  test("omits hidden service copy from the public payload while retaining editable photo history", async () => {
    const t = backend();
    const { owner, orgId, serviceId } = await studio(t, "sites-owner", "paid");
    const staffId = (await owner.query(api.users.getMyProfile))!.staffId!;
    const otherServiceId = await owner.mutation(api.services.createService, {
      orgId,
      name: "A hidden service",
      durationMins: 30,
      priceMinorUnits: 1200,
      currency: "MKD",
      staffIds: [staffId],
      sortOrder: 1,
    });
    const imageId = await owner.mutation(api.orgMedia.addMedia, {
      orgId,
      url: "https://images.example.com/gallery.jpg",
      type: "gallery",
      sortOrder: 0,
    });
    const design = defaultWebsiteDesign("en");
    design.languages.push("mk");
    design.gallery.imageIds = [imageId];
    design.serviceCopy = [
      {
        serviceId: otherServiceId,
        name: "Private old wording",
        description: "",
      },
    ];
    design.translations = [
      {
        locale: "mk",
        messages: [
          {
            key: `service.${otherServiceId}.name`,
            source: "Private old wording",
            value: "Стар приватен текст",
            manual: false,
          },
        ],
      },
    ];
    await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 0,
    });
    await owner.mutation(api.websiteDesigns.publish, { revision: 1 });
    await t.run(async (ctx) => {
      await ctx.db.patch(otherServiceId, { isOpusVisible: false });
      await ctx.db.patch(imageId, { isDeleted: true, deletedAt: Date.now() });
      // Ensure another public service still satisfies the booking journey.
      await ctx.db.patch(serviceId, { isOpusVisible: true });
    });
    await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 1,
    });
    const slug = (await owner.query(api.websiteDesigns.getEditor, {})).site
      .slug;
    const site = await t.query(api.publicSite.getBySlug, { slug });
    expect(site).not.toBeNull();
    expect(site?.design?.serviceCopy).toEqual([]);
    expect(site?.design?.translations[0].messages).toEqual([]);
    expect(site?.design?.gallery.imageIds).toEqual([]);
  });

  test("preserves manual translations, synchronizes a published revision and discards stale jobs", async () => {
    const t = backend();
    const { owner, orgId } = await studio(t, "sites-owner", "paid");
    const design = defaultWebsiteDesign("en");
    design.languages.push("mk");
    design.content.heroTitle = "A moment for you";
    design.content.heroDescription = "Calm, considered care";
    design.translations = [
      {
        locale: "mk",
        messages: [
          {
            key: "content.heroTitle",
            source: design.content.heroTitle,
            value: "Момент за вас",
            manual: true,
          },
        ],
      },
    ];
    await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 0,
    });
    await owner.mutation(api.websiteDesigns.publish, { revision: 1 });
    const document = await t.run((ctx) =>
      ctx.db
        .query("website_designs")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .first(),
    );
    const ownerMember = (await owner.query(api.users.getMyProfile))!.staffId!;
    await t.run((ctx) =>
      ctx.db.patch(document!._id, {
        translationJob: "job-1",
        translationStatus: "queued",
      }),
    );
    const translations = [
      {
        locale: "mk" as const,
        messages: [
          {
            key: "content.heroTitle",
            source: design.content.heroTitle,
            value: "Automatic title",
            manual: false,
          },
          {
            key: "content.heroDescription",
            source: design.content.heroDescription,
            value: "Смирена, внимателна грижа",
            manual: false,
          },
        ],
      },
    ];
    await t.mutation(internal.websiteDesigns.finishTranslations, {
      orgId,
      actorId: ownerMember,
      revision: 1,
      job: "job-1",
      target: "draft",
      translations,
      failed: false,
    });
    const editor = await owner.query(api.websiteDesigns.getEditor, {});
    expect(
      editor.draft.translations[0].messages.find(
        (m) => m.key === "content.heroTitle",
      )?.value,
    ).toBe("Момент за вас");
    expect(
      editor.site.design?.translations[0].messages.find(
        (m) => m.key === "content.heroDescription",
      )?.value,
    ).toBe("Смирена, внимателна грижа");
    design.content.heroTitle = "A new original";
    await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 1,
    });
    await t.mutation(internal.websiteDesigns.finishTranslations, {
      orgId,
      actorId: ownerMember,
      revision: 1,
      job: "job-1",
      target: "published",
      translations,
      failed: false,
    });
    expect(
      (await owner.query(api.websiteDesigns.getEditor, {})).draft.content
        .heroTitle,
    ).toBe("A new original");
  });

  test("publishes the primary language even when the translation provider is unavailable", async () => {
    vi.useFakeTimers();
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("WEBSITE_TRANSLATION_OPENAI_API_KEY", "");
    const t = backend();
    const { owner } = await studio(t, "sites-owner", "paid");
    const design = defaultWebsiteDesign("en");
    design.content.heroTitle = "Original copy";
    design.languages.push("mk");
    design.autoTranslate = true;
    await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 0,
    });
    await owner.mutation(api.websiteDesigns.publish, { revision: 1 });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const editor = await owner.query(api.websiteDesigns.getEditor, {});
    expect(editor.translationStatus).toBe("failed");
    expect(editor.site.design?.content.heroTitle).toBe("Original copy");
    expect(editor.websitePublished).toBe(true);
  });

  test("expires interrupted jobs and does not let translation limits block publication", async () => {
    const t = backend();
    const { owner, orgId } = await studio(t, "sites-owner", "paid");
    const design = defaultWebsiteDesign("en");
    design.languages.push("mk");
    design.autoTranslate = true;
    await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 0,
    });
    const document = (await t.run((ctx) =>
      ctx.db
        .query("website_designs")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .first(),
    ))!;
    await t.run((ctx) =>
      ctx.db.patch(document._id, {
        translationJob: "interrupted",
        translationStatus: "queued",
        translationCount: 20,
        translationWindowAt: Date.now(),
      }),
    );
    await t.mutation(internal.websiteDesigns.expireTranslations, {
      orgId,
      revision: 1,
      job: "older-job",
    });
    expect(
      (await owner.query(api.websiteDesigns.getEditor, {})).translationStatus,
    ).toBe("queued");
    await t.mutation(internal.websiteDesigns.expireTranslations, {
      orgId,
      revision: 1,
      job: "interrupted",
    });
    expect(
      (await owner.query(api.websiteDesigns.getEditor, {})).translationStatus,
    ).toBe("failed");
    await expect(
      owner.mutation(api.websiteDesigns.translateDraft, { revision: 1 }),
    ).rejects.toThrow("limit reached");
    await owner.mutation(api.websiteDesigns.publish, { revision: 1 });
    expect(
      (await owner.query(api.websiteDesigns.getEditor, {})).websitePublished,
    ).toBe(true);
  });

  test("allows Free design edits but rejects all language and translation changes", async () => {
    const t = backend();
    const { owner, orgId } = await studio(t);
    expect(
      (await owner.query(api.websiteDesigns.getEditor, {})).canManageLanguages,
    ).toBe(false);
    const design = defaultWebsiteDesign();
    design.theme = "sage";
    design.content.heroTitle = "Your moment of calm";
    await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 0,
    });
    const blockedChanges: Partial<WebsiteDesign>[] = [
      { primaryLanguage: "en", languages: ["en"] },
      { languages: ["mk", "en"] },
      { autoTranslate: true },
      {
        translations: [
          {
            locale: "en",
            messages: [
              {
                key: "content.heroTitle",
                source: design.content.heroTitle,
                value: "A forged translation",
                manual: true,
              },
            ],
          },
        ],
      },
    ];
    for (const change of blockedChanges)
      await expect(
        owner.mutation(api.websiteDesigns.saveDraft, {
          design: { ...design, ...change },
          baseRevision: 1,
        }),
      ).rejects.toThrow("Website languages requires the paid plan");
    await expect(
      owner.mutation(api.websiteDesigns.translateDraft, { revision: 1 }),
    ).rejects.toThrow("Website languages requires the paid plan");
    await owner.mutation(api.websiteDesigns.publish, { revision: 1 });
    const free = await owner.query(api.websiteDesigns.getEditor, {});
    expect(free.site.design?.theme).toBe("sage");
    expect(free.site.design?.languages).toEqual(["mk"]);

    await t.run((ctx) => ctx.db.patch(orgId, { plan: "paid" }));
    expect(
      (await owner.query(api.websiteDesigns.getEditor, {})).canManageLanguages,
    ).toBe(true);
    design.languages.push("en");
    design.autoTranslate = true;
    await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 1,
    });
    expect(
      (await owner.query(api.websiteDesigns.getEditor, {})).draft.languages,
    ).toEqual(["mk", "en"]);
  });

  test("stops queued translation on downgrade and preserves settings for a later upgrade", async () => {
    vi.useFakeTimers();
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("WEBSITE_TRANSLATION_OPENAI_API_KEY", "test-api-key");
    const providerFetch = vi.fn(() => {
      throw new Error("Provider must not be called after downgrade");
    });
    vi.stubGlobal("fetch", providerFetch);
    const t = backend();
    const { owner, orgId } = await studio(t, "sites-owner", "paid");
    const design = defaultWebsiteDesign("en");
    design.content.heroTitle = "A moment for you";
    design.languages.push("mk");
    design.autoTranslate = true;
    design.translations = [
      {
        locale: "mk",
        messages: [
          {
            key: "content.heroTitle",
            source: design.content.heroTitle,
            value: "Момент за вас",
            manual: true,
          },
        ],
      },
    ];
    await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 0,
    });
    await owner.mutation(api.websiteDesigns.publish, { revision: 1 });
    const document = (await t.run((ctx) =>
      ctx.db
        .query("website_designs")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .first(),
    ))!;
    const actorId = (await owner.query(api.users.getMyProfile))!.staffId!;
    const job = { orgId, actorId, revision: 1, job: document.translationJob! };
    expect(await t.query(internal.websiteDesigns.canRunTranslations, job)).toBe(
      true,
    );
    await t.run((ctx) => ctx.db.patch(orgId, { plan: "free" }));
    expect(await t.query(internal.websiteDesigns.canRunTranslations, job)).toBe(
      false,
    );
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(providerFetch).not.toHaveBeenCalled();
    const downgraded = await owner.query(api.websiteDesigns.getEditor, {});
    expect(downgraded.translationStatus).toBe("failed");
    expect(downgraded.draft.languages).toEqual(["en", "mk"]);
    expect(downgraded.draft.translations).toEqual(design.translations);
    expect(downgraded.site.design?.languages).toEqual(["en"]);
    expect(downgraded.site.design?.translations).toEqual([]);

    // A response already in flight may finish after billing removes Pro.
    await t.run((ctx) =>
      ctx.db.patch(document._id, {
        translationJob: "late-response",
        translationStatus: "queued",
      }),
    );
    await t.mutation(internal.websiteDesigns.finishTranslations, {
      ...job,
      job: "late-response",
      target: "published",
      failed: false,
      translations: [
        {
          locale: "mk",
          messages: [
            {
              key: "content.heroDescription",
              source: "",
              value: "Late result",
              manual: false,
            },
          ],
        },
      ],
    });
    expect(
      (await owner.query(api.websiteDesigns.getEditor, {})).draft.translations,
    ).toEqual(design.translations);

    design.content.heroDescription = "A new introduction";
    await owner.mutation(api.websiteDesigns.saveDraft, {
      design,
      baseRevision: 1,
    });
    await owner.mutation(api.websiteDesigns.publish, { revision: 2 });
    const free = await owner.query(api.websiteDesigns.getEditor, {});
    expect(free.translationStatus).toBe("idle");
    expect(free.site.design?.content.heroDescription).toBe(
      "A new introduction",
    );
    expect(free.site.design?.languages).toEqual(["en"]);
    expect(providerFetch).not.toHaveBeenCalled();
    await t.run((ctx) => ctx.db.patch(orgId, { plan: "paid" }));
    const restored = await owner.query(api.websiteDesigns.getEditor, {});
    expect(restored.site.design?.languages).toEqual(["en", "mk"]);
    expect(restored.site.design?.translations).toEqual(design.translations);
  });
});
