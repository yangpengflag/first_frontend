import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { tokenStore } from "@/lib/auth/tokens";

import { AuthGuard, RedirectIfAuthenticated } from "./auth-guard";

const replace = vi.fn();
let pathname = "/profile";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => pathname,
}));

beforeEach(() => {
  vi.clearAllMocks();
  tokenStore.clear();
  pathname = "/profile";
});

describe("AuthGuard", () => {
  it("redirects to login with a redirect hint when unauthenticated", async () => {
    render(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login?redirect=%2Fprofile");
    });
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument();
  });

  it("renders children when a token is present", async () => {
    tokenStore.set("access-1", "refresh-1");

    render(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>
    );

    expect(await screen.findByText("受保护内容")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  /** 校验完成前不渲染，避免内容一闪而过。 */
  it("renders nothing until the check completes", () => {
    render(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>
    );

    // 首帧（effect 尚未执行）不应出现受保护内容
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument();
  });
});

describe("RedirectIfAuthenticated", () => {
  it("sends an authenticated user to the home page", async () => {
    tokenStore.set("access-1", "refresh-1");

    render(
      <RedirectIfAuthenticated>
        <div>登录表单</div>
      </RedirectIfAuthenticated>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/");
    });
    expect(screen.queryByText("登录表单")).not.toBeInTheDocument();
  });

  it("renders children for an anonymous visitor", async () => {
    render(
      <RedirectIfAuthenticated>
        <div>登录表单</div>
      </RedirectIfAuthenticated>
    );

    expect(await screen.findByText("登录表单")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
