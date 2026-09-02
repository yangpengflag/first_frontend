import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/cities",
}));

import CitiesPage from "./page";

describe("CitiesPage", () => {
  it("renders heading and city cards", async () => {
    render(await CitiesPage({ searchParams: {} }));
    expect(screen.getByRole("heading", { name: /目的地城市/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link").length).toBeGreaterThanOrEqual(6);
  });

  it("renders first page ordered by name", async () => {
    render(await CitiesPage({ searchParams: {} }));
    // 8 城取前 6：Chengdu 在首字母序最前，应出现在首屏
    expect(screen.getByText("Chengdu")).toBeInTheDocument();
  });

  it("shows empty state when no city matches", async () => {
    render(await CitiesPage({ searchParams: { page: "99" } }));
    expect(screen.getByText("暂无城市数据")).toBeInTheDocument();
  });

  it("shows pagination nav when multiple pages", async () => {
    render(await CitiesPage({ searchParams: {} }));
    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
  });
});
