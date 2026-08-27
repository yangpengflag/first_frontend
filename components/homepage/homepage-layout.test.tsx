import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HomepageLayout } from "./homepage-layout";
import { RegionState } from "./region-state";

describe("HomepageLayout", () => {
  it("renders hero, platformNav, destinations, community in order", () => {
    render(
      <HomepageLayout
        hero={<div>HERO</div>}
        platformNav={<div>PLATFORM</div>}
        destinations={<div>DEST</div>}
        community={<div>COMMUNITY</div>}
      />
    );

    const hero = screen.getByText("HERO");
    const platform = screen.getByText("PLATFORM");
    const dest = screen.getByText("DEST");
    const community = screen.getByText("COMMUNITY");

    // compareDocumentPosition 返回位掩码；FOLLOWING = 4 表示前者在后者之前
    const order = [
      hero.compareDocumentPosition(platform),
      platform.compareDocumentPosition(dest),
      dest.compareDocumentPosition(community),
    ];
    expect(order.every((v) => (v & Node.DOCUMENT_POSITION_FOLLOWING) === 4)).toBe(true);
  });

  it("wraps content regions in section[data-region] with max-w container", () => {
    const { container } = render(
      <HomepageLayout
        hero={<div>HERO</div>}
        platformNav={<div>PLATFORM</div>}
        destinations={<div>DEST</div>}
      />
    );
    const regions = container.querySelectorAll("section[data-region]");
    expect(regions.length).toBe(2);
    expect(regions[0].getAttribute("data-region")).toBe("platform-nav");
    expect(regions[1].getAttribute("data-region")).toBe("destinations");
    // 外层容器含 max-w-6xl
    const wrapper = container.querySelector(".max-w-6xl");
    expect(wrapper).not.toBeNull();
  });
});

describe("RegionState", () => {
  it("loading renders skeleton grid (aria-busy)", () => {
    const { container } = render(<RegionState status="loading" />);
    expect(container.querySelector('[data-testid="region-loading"]')).not.toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("empty renders guidance copy", () => {
    render(
      <RegionState
        status="empty"
        emptyTitle="No destinations"
        emptyDescription="Try another region"
      />
    );
    expect(screen.getByTestId("region-empty")).toBeInTheDocument();
    expect(screen.getByText("No destinations")).toBeInTheDocument();
    expect(screen.getByText("Try another region")).toBeInTheDocument();
  });

  it("error renders retry button wired to onRetry", () => {
    const onRetry = vi.fn();
    render(<RegionState status="error" onRetry={onRetry} />);
    const btn = screen.getByRole("button", { name: /try again/i });
    btn.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("content renders children", () => {
    render(
      <RegionState status="content">
        <p>real content</p>
      </RegionState>
    );
    expect(screen.getByText("real content")).toBeInTheDocument();
  });
});
