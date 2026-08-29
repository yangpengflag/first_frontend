import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { tokenStore } from "@/lib/auth/tokens";
import { AuthSessionProvider } from "@/lib/auth/session";

import { AuthGuard, RedirectIfAuthenticated } from "./auth-guard";

const { me, logout, replace, getPathname } = vi.hoisted(() => ({
  me: vi.fn(),
  logout: vi.fn(),
  replace: vi.fn(),
  getPathname: () => "/profile",
}));

vi.mock("@/lib/auth/api", () => ({
  authApi: { me, logout },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => getPathname(),
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

describe("AuthGuard (me 驱动)", () => {
  it("2.1 未登录 → 跳 /login?redirect=<path>", async () => {
    renderWithProvider(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login?redirect=%2Fprofile");
    });
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument();
  });

  it("2.1 已登录 → 渲染 children", async () => {
    tokenStore.set("access-1", "refresh-1");
    me.mockResolvedValue(user);

    renderWithProvider(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>
    );

    expect(await screen.findByText("受保护内容")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("2.1 校验中（loading）→ 不渲染受保护内容", () => {
    tokenStore.set("access-1", "refresh-1");
    me.mockReturnValue(new Promise(() => {})); // 永挂起，模拟校验中

    renderWithProvider(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>
    );

    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument();
  });
});

describe("RedirectIfAuthenticated (me 驱动)", () => {
  it("2.4 已登录 → 跳首页", async () => {
    tokenStore.set("access-1", "refresh-1");
    me.mockResolvedValue(user);

    renderWithProvider(
      <RedirectIfAuthenticated>
        <div>登录表单</div>
      </RedirectIfAuthenticated>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/");
    });
    expect(screen.queryByText("登录表单")).not.toBeInTheDocument();
  });

  it("2.4 未登录 → 渲染 children", async () => {
    renderWithProvider(
      <RedirectIfAuthenticated>
        <div>登录表单</div>
      </RedirectIfAuthenticated>
    );

    expect(await screen.findByText("登录表单")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
