export type VenueType = "cafe" | "restaurant";
export type VenueOnboardingDraft = {
  name: string;
  type: VenueType | null;
  step: 1 | 2;
};

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export function emptyVenueDraft(): VenueOnboardingDraft {
  return { name: "", type: null, step: 1 };
}

export function validVenueName(name: string) {
  const length = name.trim().length;
  return length >= 2 && length <= 120;
}

/** Drafts belong to one verified account, active business, and browser tab. */
export function venueDraftKey(userId: string, orgId?: string) {
  return `opus:venue-onboarding:v1:${encodeURIComponent(userId)}:${encodeURIComponent(orgId ?? "new")}`;
}

export function serializeVenueDraft(draft: VenueOnboardingDraft, now: number) {
  return JSON.stringify({
    ...draft,
    version: 1,
    expiresAt: now + DRAFT_TTL_MS,
  });
}

export function parseVenueDraft(
  raw: string | null,
  now: number,
): VenueOnboardingDraft {
  if (!raw || raw.length > 2000) return emptyVenueDraft();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return emptyVenueDraft();
    const saved = value as Record<string, unknown>;
    if (
      saved.version !== 1 ||
      typeof saved.expiresAt !== "number" ||
      !Number.isFinite(saved.expiresAt) ||
      saved.expiresAt <= now ||
      saved.expiresAt > now + DRAFT_TTL_MS ||
      typeof saved.name !== "string" ||
      saved.name.length > 120
    )
      return emptyVenueDraft();
    return {
      name: saved.name,
      type:
        saved.type === "cafe" || saved.type === "restaurant"
          ? saved.type
          : null,
      step: saved.step === 2 && validVenueName(saved.name) ? 2 : 1,
    };
  } catch {
    return emptyVenueDraft();
  }
}
