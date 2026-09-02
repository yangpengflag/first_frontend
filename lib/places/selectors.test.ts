import { describe, it, expect } from "vitest";
import {
  filterCities,
  filterSpots,
  getSpotNeighbors,
  getRelatedPostsForCity,
  listCityOptions,
  listCategories,
  listSpotTags,
} from "./index";

describe("filterCities", () => {
  it("默认按 name 升序分页（size 6 → 8 城分 2 页）", async () => {
    const r = await filterCities({ page: 1, size: 6 });
    expect(r.total).toBe(8);
    expect(r.items).toHaveLength(6);
    expect(r.totalPages).toBe(2);
    const names = r.items.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("page 2 返回剩余城市", async () => {
    const r1 = await filterCities({ page: 1, size: 6 });
    const r2 = await filterCities({ page: 2, size: 6 });
    expect(r2.items).toHaveLength(2);
    expect(new Set([...r1.items, ...r2.items]).size).toBe(8);
  });
});

describe("filterSpots", () => {
  it("默认按 viewCount 降序，热门置顶为 Terracotta Army", async () => {
    const r = await filterSpots({ page: 1, size: 10 });
    expect(r.total).toBe(10);
    expect(r.items[0].slug).toBe("xian-terracotta"); // 13400 最高
  });

  it("按 city 筛选", async () => {
    const r = await filterSpots({ city: "hangzhou" });
    expect(r.items.map((s) => s.slug)).toEqual(["hangzhou-west-lake"]);
  });

  it("按 category=history 筛选", async () => {
    const r = await filterSpots({ category: "history" });
    expect(r.items.every((s) => s.category === "history")).toBe(true);
    expect(r.items.map((s) => s.slug).sort()).toEqual(
      ["dunhuang-mogao-caves", "xian-terracotta"].sort()
    );
  });

  it("按 tag=UNESCO 筛选命中多条目", async () => {
    const r = await filterSpots({ tag: "UNESCO" });
    expect(r.items.length).toBeGreaterThan(1);
    expect(r.items.every((s) => s.tags.includes("UNESCO"))).toBe(true);
  });

  it("搜索 q=west 命中两处 West Lake（重名消歧）", async () => {
    const r = await filterSpots({ q: "west" });
    expect(r.items.map((s) => s.slug).sort()).toEqual(
      ["fuzhou-west-lake", "hangzhou-west-lake"].sort()
    );
  });

  it("搜索 q=Panda 命中熊猫基地", async () => {
    const r = await filterSpots({ q: "panda" });
    expect(r.items.map((s) => s.slug)).toEqual(["chengdu-panda-base"]);
  });

  it("sort=hidden 优先 hiddenGem 置顶且全部聚首", async () => {
    const r = await filterSpots({ sort: "hidden", page: 1, size: 10 });
    expect(r.items[0].hiddenGem).toBe(true);
    // 所有 hiddenGem 连续排在非 hiddenGem 之前
    const hiddenCount = r.items.filter((s) => s.hiddenGem).length;
    expect(r.items.slice(0, hiddenCount).every((s) => s.hiddenGem)).toBe(true);
    expect(r.items.slice(hiddenCount).every((s) => !s.hiddenGem)).toBe(true);
  });
});

describe("getSpotNeighbors", () => {
  it("返回同城市其他 POI（不含自身）", async () => {
    const n = await getSpotNeighbors("chengdu-panda-base");
    expect(n.map((s) => s.slug)).toEqual(["chengdu-kuanzhai-alley"]);
    expect(n.every((s) => s.slug !== "chengdu-panda-base")).toBe(true);
  });

  it("唯一 POI 的城市返回空数组", async () => {
    expect(await getSpotNeighbors("hangzhou-west-lake")).toEqual([]);
  });

  it("未知 slug 返回空数组", async () => {
    expect(await getSpotNeighbors("nope")).toEqual([]);
  });
});

describe("option lists", () => {
  it("listCityOptions 含 slug/name/nameZh 且按 name 排序", () => {
    const o = listCityOptions();
    const names = o.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(o.find((c) => c.slug === "hangzhou")).toMatchObject({
      name: "Hangzhou",
      nameZh: "杭州",
    });
  });
  it("listCategories 含 6 个枚举", () => {
    expect(listCategories()).toHaveLength(6);
  });
  it("listSpotTags 非空", () => {
    expect(listSpotTags().length).toBeGreaterThan(0);
  });
});

describe("related posts placeholder", () => {
  it("getRelatedPostsForCity 返回占位数据", () => {
    expect(getRelatedPostsForCity("hangzhou")).toHaveLength(2);
  });
});
