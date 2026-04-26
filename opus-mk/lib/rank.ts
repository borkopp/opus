import { calcDistanceMeters } from "./format";

export const RANKING_CONSTANTS = {
  SMOOTHING_PRIOR_WEIGHT: 20, // C
  PRIOR_MEAN: 4.0,            // M
};

export const DISTANCE_BUCKETS_METERS = [500, 1000, 2000, 5000];

export const BOOSTS = {
  EXACT_NAME_MATCH: 1.5,
  PREFIX_NAME_MATCH: 1.0,
  TAG_CUISINE_MATCH: 0.6,
  PARTIAL_SUBSTRING_MATCH: 0.3,
  CATEGORY_MATCH: 0.8,
  INDUSTRY_MATCH: 0.4,
  OPEN_NOW: 0.4,
};

export interface RankContext {
  coords?: { lat: number; lng: number } | null;
  query?: string;
  selectedCategory?: string;
  industry?: string;
}

export function getBayesianRating(averageRating: number, reviewCount: number): number {
  if (reviewCount === 0) return 0;
  const { SMOOTHING_PRIOR_WEIGHT: C, PRIOR_MEAN: M } = RANKING_CONSTANTS;
  return (averageRating * reviewCount + C * M) / (reviewCount + C);
}

export function scoreOrg(org: any, ctx: RankContext, isOpenNowFunc?: (org: any) => boolean): number {
  const bayesian = getBayesianRating(org.averageRating || 0, org.reviewCount || 0);
  let baseScore = bayesian;

  if (isOpenNowFunc && isOpenNowFunc(org)) {
    baseScore += BOOSTS.OPEN_NOW;
  }

  // Query Match Boost
  if (ctx.query) {
    const q = ctx.query.toLowerCase().trim();
    const name = (org.name || "").toLowerCase();
    
    if (name === q) {
      baseScore += BOOSTS.EXACT_NAME_MATCH;
    } else if (name.startsWith(q)) {
      baseScore += BOOSTS.PREFIX_NAME_MATCH;
    } else if (
      (org.tags && org.tags.some((t: string) => t.toLowerCase().includes(q))) ||
      (org.cuisine && org.cuisine.some((c: string) => c.toLowerCase().includes(q)))
    ) {
      baseScore += BOOSTS.TAG_CUISINE_MATCH;
    } else if (name.includes(q)) {
      baseScore += BOOSTS.PARTIAL_SUBSTRING_MATCH;
    }
  }

  // Category Match Boost
  if (ctx.selectedCategory && org.beautyCategory === ctx.selectedCategory) {
    baseScore += BOOSTS.CATEGORY_MATCH;
  }

  // Industry Match Boost
  if (ctx.industry && org.industry === ctx.industry) {
    baseScore += BOOSTS.INDUSTRY_MATCH;
  }

  return baseScore;
}

export function bucketByDistance(orgs: any[], coords: { lat: number; lng: number }) {
  const buckets: { [key: number]: any[] } = {
    500: [],
    1000: [],
    2000: [],
    5000: [],
    Infinity: [],
  };

  orgs.forEach((org) => {
    if (!org.coordinates) {
      buckets[Infinity].push(org);
      return;
    }
    const dist = calcDistanceMeters(
      coords.lat,
      coords.lng,
      org.coordinates.lat,
      org.coordinates.lng
    );

    const bucketKey = DISTANCE_BUCKETS_METERS.find((b) => dist < b) || Infinity;
    buckets[bucketKey].push(org);
  });

  return buckets;
}

export function rankOrgs(orgs: any[], ctx: RankContext, isOpenNowFunc?: (org: any) => boolean) {
  // 1. Calculate base score for all
  const scoredOrgs = orgs.map((org) => ({
    ...org,
    _rankScore: scoreOrg(org, ctx, isOpenNowFunc),
  }));

  // 2. If geo provided, bucket and sort
  if (ctx.coords) {
    const buckets = bucketByDistance(scoredOrgs, ctx.coords);
    const sortedResult: any[] = [];
    
    // Sort each bucket by score desc and concatenate
    [...DISTANCE_BUCKETS_METERS, Infinity].forEach((bucketKey) => {
      const bucketOrgs = buckets[bucketKey] || [];
      bucketOrgs.sort((a, b) => b._rankScore - a._rankScore);
      sortedResult.push(...bucketOrgs);
    });

    return sortedResult;
  }

  // 3. No geo, sort by base score only
  return scoredOrgs.sort((a, b) => b._rankScore - a._rankScore);
}
