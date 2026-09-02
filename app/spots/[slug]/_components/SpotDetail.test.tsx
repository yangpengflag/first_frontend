import { render, screen } from "@testing-library/react";
import { beforeAll, describe, it, expect } from "vitest";
import type { Spot } from "@/lib/places/types";

import { SPOTS_MOCK } from "@/lib/places/mocks";
import { getSpotNeighbors } from "@/lib/places";
import { SpotDetail } from "./SpotDetail";

const related = [{ id: "p1", title: "Around Chengdu", slug: "around-chengdu" }];

describe("SpotDetail", () => {
  const base = SPOTS_MOCK.find((s) => s.slug === "chengdu-panda-base")!;
  const spot: Spot = { ...base, cityName: "Chengdu" };
  let neighbors: Spot[] = [];
  beforeAll(async () => {
    neighbors = await getSpotNeighbors(spot.slug);
  });

  it("renders bilingual title, city link, description and rating", () => {
    const { container } = render(
      <SpotDetail spot={spot} neighbors={neighbors} related={related} />
    );
    expect(
      screen.getByRole("heading", { name: "Chengdu Panda Base", level: 1 })
    ).toBeInTheDocument();
    expect(container.textContent).toContain("成都大熊猫繁育研究基地");
    expect(container.textContent).toContain(spot.descriptionEn);

    const cityLink = screen
      .getAllByRole("link")
      .find((l) => l.getAttribute("href") === "/cities/chengdu");
    expect(cityLink).toBeTruthy();
    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
  });

  it("renders external map links (Google + Amap)", () => {
    render(<SpotDetail spot={spot} neighbors={neighbors} related={related} />);
    const mapLinks = screen
      .getAllByRole("link")
      .filter((l) => /google|amap/i.test(l.getAttribute("href") ?? ""));
    expect(mapLinks).toHaveLength(2);
  });

  it("renders nearby POI from the same city", () => {
    render(<SpotDetail spot={spot} neighbors={neighbors} related={related} />);
    expect(screen.getByText(/Nearby in Chengdu/i)).toBeInTheDocument();
    expect(screen.getByText("Kuanzhai Alley")).toBeInTheDocument();
  });

  it("falls back to Chinese description when English is missing", () => {
    const noEn = { ...spot, descriptionEn: "", descriptionZh: "中文介绍" };
    render(<SpotDetail spot={noEn} neighbors={[]} related={[]} />);
    expect(screen.getByText("中文介绍")).toBeInTheDocument();
  });
});
