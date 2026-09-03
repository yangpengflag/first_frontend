import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/test/mocks/server";
import { fetchRelatedPosts } from "./client";
import {
  filterCities,
  filterSpots,
  getSpotNeighbors,
  getRelatedPostsForCity,
  listCityOptions,
  listCategories,
  listSpotTags,
} from "./index";

// 仅替换真实聚合调用为可控 mock；列表/详情选择器仍走真实 client（fetchCities/fetchSpots）。
vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return { ...actual, fetchRelatedPosts: vi.fn() };
});

describe("filterCities", () => {
  it("默认按 name 升序分页（size 6 → 11 城分 2 页）", async () => {
    const r = await filterCities({ page: 1, size: 6 });
    expect(r.total).toBe(11);
    expect(r.items).toHaveLength(6);
    expect(r.totalPages).toBe(2);
    const names = r.items.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("page 2 返回剩余城市", async () => {
    const r1 = await filterCities({ page: 1, size: 6 });
    const r2 = await filterCities({ page: 2, size: 6 });
    expect(r2.items).toHaveLength(5);
    expect(new Set([...r1.items, ...r2.items]).size).toBe(11);
  });
});

describe("filterSpots", () => {
  it("pushes page/size/filters to the backend instead of fetch-all-then-local (real pagination)", async () => {
    let captured: string | null = null;
    server.use(
      http.get("*/api/spots", ({ request }) => {
        captured = request.url;
        return HttpResponse.json({
          request_id: "r",
          items: [],
          page: 1,
          size: 0,
          total: 0,
          has_more: false,
        });
      })
    );
    await filterSpots({
      city: "hangzhou",
      category: "nature",
      tag: "UNESCO",
      q: "lake",
      sort: "hidden",
      page: 2,
      size: 3,
    });
    expect(captured).not.toBeNull();
    expect(captured).toContain("city=hangzhou");
    expect(captured).toContain("category=nature");
    expect(captured).toContain("tag=UNESCO");
    expect(captured).toContain("q=lake");
    expect(captured).toContain("sort=hidden");
    expect(captured).toContain("page=2");
    expect(captured).toContain("size=3");
  });

  it("默认按 viewCount 降序，热门置顶为 Forbidden City", async () => {
    const r = await filterSpots({ page: 1, size: 10 });
    expect(r.total).toBe(24);
    expect(r.items[0].slug).toBe("beijing-forbidden-city"); // 15200 最高
  });

  it("按 city 筛选", async () => {
    const r = await filterSpots({ city: "hangzhou" });
    expect(r.items.map((s) => s.slug)).toEqual([
      "hangzhou-west-lake",
      "hangzhou-lingyin-temple",
    ]);
  });

  it("按 category=history 筛选", async () => {
    const r = await filterSpots({ category: "history" });
    expect(r.items.every((s) => s.category === "history")).toBe(true);
    expect(r.items.map((s) => s.slug).sort()).toEqual(
      [
        "beijing-forbidden-city",
        "beijing-temple-of-heaven",
        "chengdu-wuhou-shrine",
        "chongqing-ciqikou-ancient-town",
        "fuzhou-three-lanes-and-seven-alleys",
        "hangzhou-lingyin-temple",
        "lijiang-lijiang-old-town",
        "shanghai-yu-garden",
        "xi-an-terracotta-army",
        "xi-an-xi-an-city-wall",
        "lhasa-potala-palace",
      ].sort()
    );
  });

  it("按 tag=UNESCO 筛选命中多条目", async () => {
    const r = await filterSpots({ tag: "UNESCO" });
    expect(r.items.length).toBeGreaterThan(1);
    expect(r.items.every((s) => s.tags.includes("UNESCO"))).toBe(true);
  });

  it("搜索 q=west 命中两处 West Lake（重名消歧）+ 灵隐寺摘要含 west", async () => {
    const r = await filterSpots({ q: "west" });
    const slugs = r.items.map((s) => s.slug);
    // 两处同名 West Lake 必须同时出现（城市消歧）
    expect(slugs).toContain("fuzhou-west-lake");
    expect(slugs).toContain("hangzhou-west-lake");
    // 灵隐寺 summary_en 含 "west of West Lake"，按真实后端搜索语义也应命中
    expect(slugs).toContain("hangzhou-lingyin-temple");
  });

  it("搜索 q=Panda 命中熊猫基地", async () => {
    const r = await filterSpots({ q: "panda" });
    expect(r.items.map((s) => s.slug)).toEqual(["chengdu-chengdu-panda-base"]);
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
    const n = await getSpotNeighbors("chengdu-chengdu-panda-base");
    expect(n.map((s) => s.slug)).toEqual(["chengdu-wuhou-shrine"]);
    expect(n.every((s) => s.slug !== "chengdu-chengdu-panda-base")).toBe(true);
  });

  it("返回同城市所有其他 POI（不含自身）", async () => {
    const n = await getSpotNeighbors("beijing-forbidden-city");
    expect(n.map((s) => s.slug).sort()).toEqual(
      ["beijing-great-wall-at-mutianyu", "beijing-temple-of-heaven"].sort()
    );
    expect(n.every((s) => s.slug !== "beijing-forbidden-city")).toBe(true);
  });

  it("未知 slug 返回空数组", async () => {
    expect(await getSpotNeighbors("nope")).toEqual([]);
  });
});

describe("option lists", () => {
  it("listCityOptions 含 slug/name/nameZh 且按 name 排序", async () => {
    const o = await listCityOptions();
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
  it("listSpotTags 非空", async () => {
    expect((await listSpotTags()).length).toBeGreaterThan(0);
  });
});

describe("related posts aggregation", () => {
  it("getRelatedPostsForCity 聚合城市相关攻略", async () => {
    vi.mocked(fetchRelatedPosts).mockResolvedValue([
      { id: "1", title: "A", slug: "a" },
      { id: "2", title: "B", slug: "b" },
    ]);
    const posts = await getRelatedPostsForCity("hangzhou");
    expect(posts).toHaveLength(2);
  });
});
