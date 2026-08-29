import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { tokenStore } from "@/lib/auth/tokens";
import { AuthSessionProvider } from "@/lib/auth/session";

import { NavBar } from "./nav-bar";

const { me, logout, replace } = vi.hoisted(() => ({
  me: vi.fn(),
  logout: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({
  authApi: { me, logout },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

const user = {
  id: "u-1",
  email: "a@b.com",
  displayName: "Tester",
  avatarUrl: null,
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00Z",
};

function renderWithProvider(node: React.ReactNode) {
  return render(<AuthSessionProvider>{node}</AuthSessionProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  tokenStore.clear();
});

describe("NavBar", () => {
  it("3.1 已登录显示昵称 + 登出入口", async () => {
    tokenStore.set("access-1", "refresh-1");
    me.mockResolvedValue(user);

    renderWithProvider(<NavBar />);

    expect(await screen.findByText("Tester")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登出" })).toBeInTheDocument();
    expect(screen.queryByText("登录")).not.toBeInTheDocument();
  });

  it("3.1 未登录显示登录 / 注册入口", async () => {
    renderWithProvider(<NavBar />);

    expect(await screen.findByText("登录")).toBeInTheDocument();
    expect(screen.getByText("注册")).toBeInTheDocument();
    expect(screen.queryByText("Tester")).not.toBeInTheDocument();
  });

  it("3.3 加载中渲染中性态（仅品牌，无登录态控件）", () => {
    tokenStore.set("access-1", "refresh-1");
    me.mockReturnValue(new Promise(() => {})); // 校验中

    renderWithProvider(<NavBar />);

    // 首帧：loading → 不渲染昵称，也不渲染 登录/注册
    expect(screen.queryByText("Tester")).not.toBeInTheDocument();
    expect(screen.queryByText("登录")).not.toBeInTheDocument();
  });
});
