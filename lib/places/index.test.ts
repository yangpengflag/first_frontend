import { describe, expect, it } from "vitest";

import { listCityOptions, listSpotTags } from "./index";

describe("listCityOptions / listSpotTags 接真后端聚合", () => {
  it("listCityOptions 返回真实后端城市，不含 mock 特有城市", async () => {
    const cities = await listCityOptions();
    const slugs = cities.map((c) => c.slug);
    // 真实后端 wanderchina.cities 含这些城市
    expect(slugs).toContain("beijing");
    expect(slugs).toContain("shanghai");
    expect(slugs).toContain("lhasa");
    expect(slugs).toContain("guangzhou");
    expect(slugs).toContain("chongqing");
    expect(slugs).toContain("fuzhou");
    // 与真实后端对齐后，mock 特有的城市不应出现
    expect(slugs).not.toContain("suzhou");
    expect(slugs).not.toContain("dunhuang");
    expect(slugs).not.toContain("zhangjiajie");
  });

  it("listSpotTags 聚合自真实后端并去重、字母序排列", async () => {
    const tags = await listSpotTags();
    expect(tags).toContain("UNESCO");
    // 去重：同一标签只出现一次
    expect(tags.filter((t) => t === "UNESCO").length).toBe(1);
    // 字母序
    const sorted = [...tags].sort();
    expect(tags).toEqual(sorted);
  });
});
