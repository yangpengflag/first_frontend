import { describe, it, expect } from "vitest";
import { CITIES_MOCK, SPOTS_MOCK } from "./mocks";

describe("places mock data integrity", () => {
  it("city slugs unique and counts non-negative", () => {
    const slugs = new Set(CITIES_MOCK.map((c) => c.slug));
    expect(slugs.size).toBe(CITIES_MOCK.length);
    for (const c of CITIES_MOCK) {
      expect(c.spotCount).toBeGreaterThanOrEqual(0);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.nameZh.length).toBeGreaterThan(0);
    }
  });

  it("spot composite slugs unique; counts non-negative; rating in range; suffix matches city", () => {
    const slugs = new Set(SPOTS_MOCK.map((s) => s.slug));
    expect(slugs.size).toBe(SPOTS_MOCK.length);
    for (const s of SPOTS_MOCK) {
      expect(s.viewCount).toBeGreaterThanOrEqual(0);
      expect(s.postCount).toBeGreaterThanOrEqual(0);
      if (s.rating != null) {
        expect(s.rating).toBeGreaterThanOrEqual(0);
        expect(s.rating).toBeLessThanOrEqual(5);
      }
      // 复合 slug 必以 citySlug + "-" 开头（不靠分割也能校验归属）
      expect(s.slug.startsWith(`${s.citySlug}-`)).toBe(true);
    }
  });

  it("includes two West Lake entries to demonstrate disambiguation", () => {
    const westLakes = SPOTS_MOCK.filter((s) => /west-lake$/i.test(s.slug));
    expect(westLakes.length).toBeGreaterThanOrEqual(2);
    const citySlugs = new Set(westLakes.map((s) => s.citySlug));
    expect(citySlugs.size).toBeGreaterThanOrEqual(2);
  });
});
