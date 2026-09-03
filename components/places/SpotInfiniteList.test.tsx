import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { SpotInfiniteList } from "./SpotInfiniteList";
import type { Spot } from "@/lib/places/types";

const fetchSpotsMock = vi.fn();
vi.mock("@/lib/places/client", () => ({
  fetchSpots: (...args: unknown[]) => fetchSpotsMock(...args),
}));

// jsdom 无 IntersectionObserver：记录实例并 observe 后异步自动 fire（覆盖哨兵触底续拉）
const ioInstances: MockIntersectionObserver[] = [];
class MockIntersectionObserver {
  private cb: IntersectionObserverCallback;
  private disconnected = false;
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
    ioInstances.push(this);
  }
  observe = vi.fn(() => {
    if (this.disconnected) return;
    setTimeout(() => {
      if (this.disconnected) return;
      this.cb(
        [{ isIntersecting: true } as IntersectionObserverEntry] as unknown as IntersectionObserverEntry[],
        this as unknown as IntersectionObserver
      );
    }, 0);
  });
  unobserve = vi.fn();
  disconnect = vi.fn(() => {
    this.disconnected = true;
  });
  trigger(isIntersecting = true) {
    this.cb(
      [{ isIntersecting } as IntersectionObserverEntry] as unknown as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver
    );
  }
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

function makeSpot(slug: string): Spot {
  return {
    slug,
    nameZh: slug,
    nameEn: slug,
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
    summaryEn: "",
    summaryZh: "",
    descriptionEn: "",
    descriptionZh: "",
    viewCount: 0,
    postCount: 0,
    rating: null,
    featured: false,
    hiddenGem: false,
  };
}

function pageOf(items: Spot[], over: Record<string, unknown> = {}) {
  return { items, page: 1, size: items.length, total: items.length, totalPages: 1, ...over };
}

beforeEach(() => {
  fetchSpotsMock.mockReset();
  ioInstances.length = 0;
});

describe("SpotInfiniteList", () => {
  it("首屏使用 initialItems 直出，不额外 fetch（hydration 一致，design R1）", () => {
    const items = [makeSpot("a"), makeSpot("b")];
    render(
      <SpotInfiniteList initialItems={items} initialHasMore={false} initialPage={1} initialQuery={{}} />
    );
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
    expect(fetchSpotsMock).not.toHaveBeenCalled();
  });

  it("哨兵触底触发 page=2 请求并追加结果", async () => {
    fetchSpotsMock.mockResolvedValueOnce(pageOf([makeSpot("c"), makeSpot("d")], { total: 4 }));
    render(
      <SpotInfiniteList
        initialItems={[makeSpot("a"), makeSpot("b")]}
        initialHasMore
        initialPage={1}
        initialQuery={{}}
      />
    );
    await screen.findByText("a");
    await waitFor(() => expect(fetchSpotsMock).toHaveBeenCalled());
    expect(fetchSpotsMock).toHaveBeenCalledWith(expect.objectContaining({ page: 2, size: 6 }));
    await waitFor(() => expect(screen.getByText("c")).toBeInTheDocument());
    expect(screen.getByText("d")).toBeInTheDocument();
  });

  it("空 initialItems 显示空态引导", () => {
    render(
      <SpotInfiniteList initialItems={[]} initialHasMore={false} initialPage={1} initialQuery={{}} />
    );
    expect(screen.getByText("没有符合条件的景点")).toBeInTheDocument();
  });

  it("续拉失败显示行内重试", async () => {
    fetchSpotsMock.mockRejectedValueOnce(new Error("boom"));
    render(
      <SpotInfiniteList
        initialItems={[makeSpot("a")]}
        initialHasMore
        initialPage={1}
        initialQuery={{}}
      />
    );
    await screen.findByText("a");
    await waitFor(() =>
      expect(screen.getByTestId("spot-list-loadmore-error")).toBeInTheDocument()
    );
  });

  it("续拉后仍有更多则到底前显示结束提示", async () => {
    // 第二页仍 hasMore（total=10，已加载 4，2*6=12 > 10 为 false → 到底）
    fetchSpotsMock.mockResolvedValueOnce(pageOf([makeSpot("c"), makeSpot("d")], { total: 10 }));
    render(
      <SpotInfiniteList
        initialItems={[makeSpot("a"), makeSpot("b")]}
        initialHasMore
        initialPage={1}
        initialQuery={{}}
      />
    );
    await screen.findByText("a");
    await waitFor(() => expect(screen.getByText("c")).toBeInTheDocument());
    expect(screen.getByTestId("spot-list-end")).toBeInTheDocument();
  });
});
