import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthApiError } from "@/lib/auth/types";
import { AuthSessionProvider } from "@/lib/auth/session";
import { PostDetail } from "./PostDetail";

const getMock = vi.fn();
vi.mock("@/lib/posts/api", () => ({
  postsApi: { getById: (...args: unknown[]) => getMock(...args) },
}));
vi.mock("next/navigation", () => ({
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
vi.mock("@/lib/auth/api", () => ({
  authApi: { me: vi.fn(), logout: vi.fn() },
}));

beforeEach(() => {
  getMock.mockReset();
});

describe("PostDetail", () => {
  it("成功渲染标题与净化后的正文（剥离 script）", async () => {
    getMock.mockResolvedValue({
      id: "p1",
      title: "My trip",
      content: "<script>alert('xss')</script>\n# Hello World",
      status: "PUBLISHED",
      author_name: "Alice",
      created_at: "2026-08-30T10:00:00Z",
      tags: ["hiking"],
    });
    const { container } = render(
        <AuthSessionProvider>
          <PostDetail id="p1" />
        </AuthSessionProvider>,
    );

    expect(await screen.findByRole("heading", { name: /Hello World/ })).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });

  it("404 渲染 Not Found 态并提供返回", async () => {
    getMock.mockRejectedValue(new AuthApiError(404, "POST_NOT_FOUND"));
    render(
        <AuthSessionProvider>
          <PostDetail id="missing" />
        </AuthSessionProvider>,
    );

    expect(await screen.findByText("攻略不存在或已下架")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /返回列表/ })).toHaveAttribute("href", "/posts");
  });

  it("错误态显示文案并提供重试", async () => {
    getMock.mockRejectedValue(new Error("boom"));
    render(
        <AuthSessionProvider>
          <PostDetail id="x" />
        </AuthSessionProvider>,
    );

    expect(await screen.findByText("服务异常，请稍后重试")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "重试" }));
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2));
  });
});
