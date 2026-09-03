import { render, screen } from "@testing-library/react";
import { beforeAll, describe, it, expect, vi } from "vitest";
import type { Spot } from "@/lib/places/types";

import { AuthSessionProvider } from "@/lib/auth/session";
import { SPOTS_MOCK } from "@/lib/places/mocks";
import { getSpotNeighbors } from "@/lib/places";
import { SpotDetail } from "./SpotDetail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/lib/auth/tokens", () => ({
  tokenStore: {
    getAccessToken: vi.fn(() => null),
    getRefreshToken: vi.fn(() => null),
    set: vi.fn(),
    clear: vi.fn(),
  },
}));

const related = [{ id: "p1", title: "Around Chengdu", slug: "around-chengdu" }];

function renderSpot(spot: Spot, neighbors: Spot[] = [], rel = related) {
  return render(
    <AuthSessionProvider>
      <SpotDetail spot={spot} neighbors={neighbors} related={rel} />
    </AuthSessionProvider>
  );
}

describe("SpotDetail", () => {
  const base = SPOTS_MOCK.find((s) => s.slug === "chengdu-chengdu-panda-base")!;
  const spot: Spot = { ...base, cityName: "Chengdu" };
  let neighbors: Spot[] = [];
  beforeAll(async () => {
    neighbors = await getSpotNeighbors(spot.slug);
  });

  it("renders bilingual title, city link, description and rating", () => {
    const { container } = renderSpot(spot, neighbors);
    expect(
      screen.getByRole("heading", { name: "Chengdu Panda Base", level: 1 })
    ).toBeInTheDocument();
    expect(container.textContent).toContain("大熊猫繁育研究基地");
    expect(container.textContent).toContain(spot.descriptionEn);

    const cityLink = screen
      .getAllByRole("link")
      .find((l) => l.getAttribute("href") === "/cities/chengdu");
    expect(cityLink).toBeTruthy();
    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
  });

  it("renders external map links (Google + Amap)", () => {
    renderSpot(spot, neighbors);
    const mapLinks = screen
      .getAllByRole("link")
      .filter((l) => /google|amap/i.test(l.getAttribute("href") ?? ""));
    expect(mapLinks).toHaveLength(2);
  });

  it("renders nearby POI from the same city", () => {
    renderSpot(spot, neighbors);
    expect(screen.getByText(/Nearby in Chengdu/i)).toBeInTheDocument();
    expect(screen.getByText("Wuhou Shrine")).toBeInTheDocument();
  });

  it("falls back to Chinese description when English is missing", () => {
    const noEn = { ...spot, descriptionEn: "", descriptionZh: "中文介绍" };
    renderSpot(noEn, [], []);
    expect(screen.getByText("中文介绍")).toBeInTheDocument();
  });
});
