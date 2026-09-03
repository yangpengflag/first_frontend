import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { filterSpots } from "@/lib/places";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/spots",
}));

import SpotsPage from "./page";

describe("SpotsPage", () => {
  it("renders heading and spot cards", async () => {
    render(await SpotsPage({ searchParams: {} }));
    expect(screen.getByRole("heading", { name: /景点探索/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link").length).toBeGreaterThanOrEqual(6);
  });

  it("filters by category=history", async () => {
    render(await SpotsPage({ searchParams: { category: "history" } }));
    expect(screen.getByText("Terracotta Army")).toBeInTheDocument();
    expect(screen.getByText("Forbidden City")).toBeInTheDocument();
    expect(screen.queryByText("West Lake")).not.toBeInTheDocument();
  });

  it("search q=west disambiguates the two West Lakes", async () => {
    render(await SpotsPage({ searchParams: { q: "west" } }));
    expect(screen.getAllByText(/West Lake/)).toHaveLength(2);
  });

  it("sort=hidden puts a hiddenGem spot first", async () => {
    const expected = (await filterSpots({ sort: "hidden" })).items[0].slug;
    render(await SpotsPage({ searchParams: { sort: "hidden" } }));
    const firstHref = screen.getAllByRole("link")[0].getAttribute("href");
    expect(firstHref).toBe(`/spots/${expected}`);
  });

  it("shows empty state when no spot matches", async () => {
    render(await SpotsPage({ searchParams: { q: "zzzzznope" } }));
    expect(screen.getByText("没有符合条件的景点")).toBeInTheDocument();
  });
});
