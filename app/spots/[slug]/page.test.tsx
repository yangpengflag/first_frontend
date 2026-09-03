import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { AuthSessionProvider } from "@/lib/auth/session";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
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

import SpotPage from "./page";
import { SPOTS_MOCK } from "@/lib/places/mocks";

describe("SpotPage", () => {
  it("calls notFound() for an unknown slug", async () => {
    await expect(
      SpotPage({ params: { slug: "does-not-exist" } }),
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
  });

  it("renders the detail for a valid slug", async () => {
    const spot = SPOTS_MOCK[0];
    const { container } = render(
      <AuthSessionProvider>{await SpotPage({ params: { slug: spot.slug } })}</AuthSessionProvider>,
    );
    expect(container.textContent).toContain(spot.nameEn);
  });

  it("wires gallery, bookmark and comment section for a valid slug", async () => {
    const spot = SPOTS_MOCK[0];
    render(
      <AuthSessionProvider>{await SpotPage({ params: { slug: spot.slug } })}</AuthSessionProvider>,
    );

    // 画廊：gallery 数据优先渲染图片（alt = 景点英文名）
    expect(screen.getAllByAltText(spot.nameEn).length).toBeGreaterThanOrEqual(1);

    // 评论区标题挂载（通用 CommentThread 注入景点评论 API）
    expect(screen.getByText("评论 / Comments")).toBeInTheDocument();

    // 景点收藏按钮挂载（未登录呈中性态）
    expect(await screen.findByRole("button", { name: /收藏/ })).toBeInTheDocument();
  });
});
