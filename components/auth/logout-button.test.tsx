import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { tokenStore } from "@/lib/auth/tokens";
import { AuthSessionProvider, useAuthSession } from "@/lib/auth/session";

import { LogoutButton } from "./logout-button";

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
  display_name: "Tester",
  avatar_url: null,
  status: "ACTIVE",
  created_at: "2026-01-01T00:00:00Z",
};

function Probe() {
  const { status } = useAuthSession();
  return <span data-testid="status">{status}</span>;
}

beforeEach(() => {
  vi.clearAllMocks();
  tokenStore.clear();
});

describe("LogoutButton", () => {
  it("4.1 登出 → 调 logout() + 清除令牌 + 跳登录 + 回到未登录态", async () => {
    tokenStore.set("access-1", "refresh-1");
    me.mockResolvedValue(user);
    logout.mockResolvedValue(undefined);

    render(
      <AuthSessionProvider>
        <Probe />
        <LogoutButton />
      </AuthSessionProvider>
    );

    // 先进入已登录态
    expect(await screen.findByTestId("status")).toHaveTextContent("authenticated");

    await userEvent.click(screen.getByRole("button", { name: "登出" }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
    expect(logout).toHaveBeenCalledTimes(1);
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
  });
});
