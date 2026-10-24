import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PromotionsWorkspace } from "../../app/(dashboard)/beauty/promote/_components/PromotionsWorkspace";
import { OpeningStoryEditor } from "../../app/(dashboard)/beauty/promote/_components/OpeningStory";
import { PromotionKit } from "../../app/(dashboard)/beauty/promote/_components/PromotionKit";
import type {
  PromotionWorkspace,
  PromotionOpening,
} from "../../lib/promotions";
import type { Id } from "../../convex/_generated/dataModel";

const state = vi.hoisted(() => ({ data: null as PromotionWorkspace | null }));

vi.mock("convex/react", () => ({
  useQuery: () => state.data,
  useConvex: () => ({}),
  useMutation: () => vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/dashboard-i18n-provider", () => ({
  useDashboardI18n: () => ({
    t: (english: string) => english,
    language: "en",
  }),
}));
vi.mock("@/hooks/use-promotion-palette", () => ({
  usePromotionPalette: () => [{}, vi.fn()],
}));
vi.mock("@/components/promotions/ArtworkPaletteEditor", () => ({
  ArtworkPaletteEditor: () => null,
}));
vi.mock("@/components/promotions/ArtworkPreview", () => ({
  ArtworkPreview: () => "Booking artwork preview",
}));

const serviceId = "service-1" as Id<"services">;
const staffId = "staff-1" as Id<"staff_members">;
const opening: PromotionOpening = {
  startAt: Date.UTC(2026, 9, 25, 10),
  endAt: Date.UTC(2026, 9, 25, 11),
  priceMinorUnits: 120000,
  currency: "MKD",
  staffId,
};

function fixture(): PromotionWorkspace {
  return {
    orgId: "studio-1" as Id<"orgs">,
    name: "Luna",
    slug: "luna",
    published: true,
    acceptingBookings: false,
    accessState: "expired",
    websiteUrl: "https://luna.opus.mk",
    bookingUrl: "https://luna.opus.mk/book",
    address: "Skopje",
    today: "2026-10-24",
    maxDate: "2026-11-01",
    canManageReplies: true,
    canManageBilling: true,
    services: [
      {
        id: serviceId,
        name: "Haircut",
        staffIds: [staffId],
        durationMins: 60,
        priceMinorUnits: 120000,
        currency: "MKD",
      },
    ],
    staff: [{ id: staffId, name: "Ana" }],
    values: {
      studio_name: "Luna",
      booking_link: "",
      address: "Skopje",
      phone: "",
      hours: "",
      services: "",
    },
    starters: [],
    replies: [],
  };
}

beforeEach(() => {
  state.data = fixture();
});

describe("trial promotion UI", () => {
  it("keeps a published website link and directs an expired owner to billing", () => {
    const html = renderToStaticMarkup(createElement(PromotionsWorkspace));
    expect(html).toContain("A paid plan is needed");
    expect(html).toContain('href="/settings?tab=billing"');
    expect(html).toContain('href="https://luna.opus.mk"');
    expect(html).not.toContain("Publish your booking website first");
    expect(html).not.toContain("Finish website setup");
    expect(html).not.toContain("Booking artwork preview");
  });

  it("directs expired staff to the owner without offering owner-only billing", () => {
    state.data!.canManageBilling = false;
    const html = renderToStaticMarkup(createElement(PromotionsWorkspace));
    expect(html).toContain("Contact your studio owner");
    expect(html).not.toContain('href="/settings?tab=billing"');
  });

  it("retains the publication prompt for an unpublished studio with booking access", () => {
    state.data!.accessState = "legacy_free";
    state.data!.published = false;
    const html = renderToStaticMarkup(createElement(PromotionsWorkspace));
    expect(html).toContain("Publish your booking website first");
    expect(html).toContain("Finish website setup");
    expect(html).not.toContain("A paid plan is needed");
  });

  it("hides expired booking kit artwork and explains subscription access", () => {
    const html = renderToStaticMarkup(
      createElement(PromotionKit, { data: fixture(), language: "en" }),
    );
    expect(html).toContain("Choose a paid plan to download booking graphics");
    expect(html).not.toContain("Publish your website");
    expect(html).not.toContain("Booking artwork preview");
    expect(html).not.toContain('value="https://luna.opus.mk/book"');
  });

  it("hides an expired opening preview even if a previously selected slot is retained", () => {
    const html = renderToStaticMarkup(
      createElement(OpeningStoryEditor, {
        data: fixture(),
        language: "en",
        serviceId,
        staffId,
        date: "2026-10-25",
        slots: [opening],
        selected: opening,
        onServiceChange: vi.fn(),
        onStaffChange: vi.fn(),
        onDateChange: vi.fn(),
        onSelect: vi.fn(),
      }),
    );
    expect(html).toContain(
      "Choose a paid plan to share available appointments again",
    );
    expect(html).not.toContain("after your website is published");
    expect(html).not.toContain("Booking artwork preview");
  });
});
