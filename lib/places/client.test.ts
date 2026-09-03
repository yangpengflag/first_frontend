import { describe, expect, it } from "vitest";

import { fetchCities, fetchCityBySlug, fetchSpotBySlug, fetchSpots } from "./client";

/**
 * 真实后端接入层单测：验证 snake_case → camelCase 适配、枚举大小写、404 → null。
 * 后端响应形状由 test/mocks/handlers.ts 按 openapi 契约返回，无需真实后端起服。
 */
describe("lib/places/client", () => {
  it("fetchCities 适配为前端 camelCase 且分页信封完整", async () => {
    const res = await fetchCities();
    expect(res.items.length).toBeGreaterThan(0);
    const city = res.items[0];
    expect(city).toHaveProperty("name");
    expect(city).toHaveProperty("nameZh");
    expect(city).toHaveProperty("description");
    expect(typeof city.spotCount).toBe("number");
    expect(res.page).toBe(1);
    expect(res.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("fetchSpots 将枚举 category 转小写并保留数值字段", async () => {
    const res = await fetchSpots();
    expect(res.items.length).toBeGreaterThan(0);
    const spot = res.items[0];
    expect(spot.category).toBe(spot.category.toLowerCase());
    expect(spot).toHaveProperty("coverImage");
    expect(typeof spot.viewCount).toBe("number");
  });

  it("fetchSpots 为每个 Spot 反范式填充 cityName", async () => {
    const res = await fetchSpots();
    const hangzhou = res.items.find((s) => s.slug === "hangzhou-west-lake");
    expect(hangzhou?.cityName).toBe("Hangzhou");
  });

  it("fetchCityBySlug 命中返回城市，未知 slug 返回 null", async () => {
    const known = (await fetchCities()).items[0].slug;
    const city = await fetchCityBySlug(known);
    expect(city?.slug).toBe(known);

    const missing = await fetchCityBySlug("no-such-city");
    expect(missing).toBeNull();
  });

  it("fetchSpotBySlug 未知 slug 返回 null（软删行 404 语义）", async () => {
    expect(await fetchSpotBySlug("no-such-spot")).toBeNull();
  });
});
