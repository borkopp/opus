import { beforeEach, describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { convexModules } from "../../convex-test.setup";

const createBackend = () => convexTest(schema, convexModules);
type TestBackend = ReturnType<typeof createBackend>;

const identity = (subject: string, email: string) => ({
  subject,
  email,
  name: email.split("@")[0],
});

describe("Better Auth account migration", () => {
  let t: TestBackend;

  beforeEach(() => {
    t = createBackend();
  });

  test("links one legacy staff account by verified email without replacing its profile", async () => {
    const legacyUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        clerkId: "legacy-clerk-staff",
        email: "owner@example.com",
        name: "Legacy Studio Owner",
        isDeleted: false,
        createdAt: 1,
        updatedAt: 1,
      }),
    );

    const signedIn = t.withIdentity(
      identity("better-auth-staff", "owner@example.com"),
    );
    const ensuredUserId = await signedIn.mutation(api.users.ensureUser);

    expect(ensuredUserId).toBe(legacyUserId);
    const linked = await t.run(async (ctx) => ctx.db.get(legacyUserId));
    expect(linked).toMatchObject({
      authUserId: "better-auth-staff",
      clerkId: "legacy-clerk-staff",
      email: "owner@example.com",
      name: "Legacy Studio Owner",
    });
  });

  test("prevents a second Better Auth identity from claiming a linked email", async () => {
    const first = t.withIdentity(
      identity("better-auth-first", "shared@example.com"),
    );
    await first.mutation(api.users.ensureUser);

    const second = t.withIdentity(
      identity("better-auth-second", "shared@example.com"),
    );
    await expect(second.mutation(api.users.ensureUser)).rejects.toThrow(
      "Account email is already linked",
    );
  });

  test("links a legacy marketplace consumer and derives all identity server-side", async () => {
    const legacyOpusUserId = await t.run(async (ctx) =>
      ctx.db.insert("opus_users", {
        clerkId: "legacy-clerk-consumer",
        email: "guest@example.com",
        name: "Returning Guest",
        opusPoints: 20,
        tier: "bronze",
        marketingOptIn: false,
        isDeleted: false,
        createdAt: 1,
        updatedAt: 1,
      }),
    );

    const signedIn = t.withIdentity(
      identity("better-auth-consumer", "guest@example.com"),
    );
    const ensuredOpusUserId = await signedIn.mutation(
      api.opusUsers.getOrCreate,
    );

    expect(ensuredOpusUserId).toBe(legacyOpusUserId);
    const linked = await signedIn.query(api.opusUsers.getCurrent);
    expect(linked).toMatchObject({
      _id: legacyOpusUserId,
      authUserId: "better-auth-consumer",
      clerkId: "legacy-clerk-consumer",
      name: "Returning Guest",
      opusPoints: 20,
    });

    await expect(t.mutation(api.opusUsers.getOrCreate)).rejects.toThrow(
      "Unauthenticated",
    );
  });
});
