import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { tokenStore } from "@/lib/auth/tokens";
import { AuthApiError, NetworkError, type UserResponse } from "@/lib/auth/types";

import { AuthSessionProvider, useAuthSession } from "./session";

const { me, logout, replace } = vi.hoisted(() => ({
  me: vi.fn(),
  logout: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({
  authApi: {
    me,
    logout,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

const user: UserResponse = {
  id: "u-1",
  email: "a@b.com",
  display_name: "Tester",
  avatar_url: null,
  status: "ACTIVE",
  created_at: "2026-01-01T00:00:00Z",
};

function Probe() {
  const { status, user } = useAuthSession();
  return (
    <div>
      <span data-testid="status">{status}</span>
      {user && <span data-testid="name">{user.display_name}</span>}
    </div>
  );
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<AuthSessionProvider>{ui}</AuthSessionProvider>);
}

const SESSION_ENDING_CODES = [
  "UNAUTHENTICATED",
  "TOKEN_INVALIDATED",
  "ACCOUNT_DELETED",
  "ACCOUNT_LOCKED",
  "EMAIL_NOT_VERIFIED",
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  tokenStore.clear();
  localStorage.clear();
});

describe("AuthSessionProvider", () => {
  it("1.1 无 token 时直接进入未登录态，且不调用 me", async () => {
    renderWithProvider(<Probe />);

    expect(await screen.findByTestId("status")).toHaveTextContent("unauthenticated");
    expect(me).not.toHaveBeenCalled();
  });

  it("1.1 有 token 且 me 返回 200 时进入已登录态并填充用户", async () => {
    tokenStore.set("access-1", "refresh-1");
    me.mockResolvedValue(user);

    renderWithProvider(<Probe />);

    expect(await screen.findByTestId("status")).toHaveTextContent("authenticated");
    expect(await screen.findByTestId("name")).toHaveTextContent("Tester");
    expect(me).toHaveBeenCalledTimes(1);
  });

  it.each(SESSION_ENDING_CODES)(
    "1.2 me() 返回 %s 时清除令牌并置未登录态",
    async (code) => {
      tokenStore.set("access-1", "refresh-1");
      me.mockRejectedValue(new AuthApiError(401, code as never));

      renderWithProvider(<Probe />);

      expect(await screen.findByTestId("status")).toHaveTextContent("unauthenticated");
      expect(tokenStore.getAccessToken()).toBeNull();
    }
  );

  it("1.2 网络失败时保留令牌，不清除（可重试态）", async () => {
    tokenStore.set("access-1", "refresh-1");
    me.mockRejectedValue(new NetworkError());

    renderWithProvider(<Probe />);

    expect(await screen.findByTestId("status")).toHaveTextContent("unauthenticated");
    expect(tokenStore.getAccessToken()).toBe("access-1");
  });

  it("1.5 不在 URL query / 日志中泄露令牌", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    tokenStore.set("super-secret-token", "refresh-1");
    me.mockResolvedValue(user);

    renderWithProvider(<Probe />);

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    expect(window.location.search).not.toContain("super-secret-token");
    expect(spy).not.toHaveBeenCalledWith(expect.stringContaining("super-secret-token"));
    spy.mockRestore();
  });
});
