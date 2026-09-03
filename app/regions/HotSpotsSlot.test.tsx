import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import HotSpotsSlot from "./HotSpotsSlot";
import { getTopSpots } from "@/lib/places";

describe("HotSpotsSlot", () => {
  it("renders up to 6 hidden-gem-prioritized spot cards", async () => {
    const top = await getTopSpots(50);
    render(<HotSpotsSlot spots={top} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(top.length);
    expect(top[0].hiddenGem).toBe(true);

    // 双语名经 aria-label 呈现（nameZh 嵌在 "名 · 城市" 段落里，无法用精确 getByText）
    const first = links[0].getAttribute("aria-label") ?? "";
    expect(first).toContain(top[0].nameEn);
    expect(first).toContain(top[0].nameZh);
  });

  it("every card links to its spot detail page", async () => {
    const top = await getTopSpots(50);
    render(<HotSpotsSlot spots={top} />);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toEqual(top.map((s) => `/spots/${s.slug}`));
  });

  it("disambiguates the two West Lake entries by city", async () => {
    const top = await getTopSpots(50);
    render(<HotSpotsSlot spots={top} />);
    expect(screen.getAllByText(/West Lake/)).toHaveLength(2);
  });
});
