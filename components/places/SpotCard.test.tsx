import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SpotCard } from "./SpotCard";
import type { Spot } from "@/lib/places/types";

function makeSpot(overrides: Partial<Spot> = {}): Spot {
  return {
    slug: "beijing-forbidden-city",
    nameZh: "故宫",
    nameEn: "Forbidden City",
    citySlug: "beijing",
    cityName: "Beijing",
    category: "history",
    tags: [],
    addressEn: "",
    addressZh: "",
    lat: 0,
    lng: 0,
    coverImage: "",
    gallery: [],
    summaryEn: "An imperial palace at the heart of Beijing.",
    summaryZh: "",
    descriptionEn: "",
    descriptionZh: "",
    viewCount: 123,
    postCount: 0,
    rating: 4.9,
    featured: false,
    hiddenGem: false,
    ...overrides,
  };
}

describe("SpotCard", () => {
  describe("tags rendering", () => {
    it("renders every tag when there are 3 or fewer", () => {
      render(<SpotCard spot={makeSpot({ tags: ["UNESCO", "Must-see", "Museum"] })} />);
      expect(screen.getByText("UNESCO")).toBeInTheDocument();
      expect(screen.getByText("Must-see")).toBeInTheDocument();
      expect(screen.getByText("Museum")).toBeInTheDocument();
    });

    it("collapses tags beyond the first 3 into a +N badge", () => {
      render(
        <SpotCard
          spot={makeSpot({ tags: ["UNESCO", "Must-see", "Museum", "Photo", "Family"] })}
        />
      );
      expect(screen.getByText("UNESCO")).toBeInTheDocument();
      expect(screen.getByText("Must-see")).toBeInTheDocument();
      expect(screen.getByText("Museum")).toBeInTheDocument();
      // 第 4 个及以后的 tag 不应单独渲染
      expect(screen.queryByText("Photo")).not.toBeInTheDocument();
      expect(screen.queryByText("Family")).not.toBeInTheDocument();
      // +N 折叠标记（5 - 3 = 2）
      expect(screen.getByText("+2")).toBeInTheDocument();
    });

    it("renders no tag row when tags is empty", () => {
      const { container } = render(<SpotCard spot={makeSpot({ tags: [] })} />);
      expect(screen.queryByText("UNESCO")).not.toBeInTheDocument();
      expect(screen.queryByText(/\+\d+/)).not.toBeInTheDocument();
      // 标签行容器不应存在（避免空态占位）
      expect(container.querySelector('[data-testid="spot-tags"]')).toBeNull();
    });
  });
});
