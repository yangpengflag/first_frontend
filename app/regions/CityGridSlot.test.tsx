import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import CityGridSlot from "./CityGridSlot";
import { getTopCities } from "@/lib/places";

describe("CityGridSlot", () => {
  it("renders up to 6 name-ordered city cards", async () => {
    const top = await getTopCities(6);
    render(<CityGridSlot cities={top} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(top.length);
    const names = top.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

    // 双语名经 aria-label 呈现
    const first = links[0].getAttribute("aria-label") ?? "";
    expect(first).toContain(top[0].name);
    expect(first).toContain(top[0].nameZh);
  });

  it("every card links to its city page", async () => {
    const top = await getTopCities(6);
    render(<CityGridSlot cities={top} />);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toEqual(top.map((c) => `/cities/${c.slug}`));
  });
});
