import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthSessionProvider } from "@/lib/auth/session";
import { authApi } from "@/lib/auth/api";
import { tokenStore } from "@/lib/auth/tokens";
import { bookmarksApi } from "@/lib/bookmarks/api";
import { BookmarkButton } from "./BookmarkButton";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));
vi.mock("@/lib/auth/tokens", () => ({
  tokenStore: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(() => null),
    set: vi.fn(),
    clear: vi.fn(),
  },
}));
vi.mock("@/lib/auth/api", () => ({
  authApi: { me: vi.fn(), logout: vi.fn() },
}));
vi.mock("@/lib/bookmarks/api", () => ({
  bookmarksApi: { list: vi.fn(), status: vi.fn(), toggle: vi.fn() },
}));

const MOCK_USER = {
  id: "u1",
  email: "a@b.c",
  status: "ACTIVE",
  display_name: "Me",
  created_at: "2024-01-01T00:00:00Z",
};

function renderWithSession(authenticated: boolean) {
  vi.mocked(tokenStore.getAccessToken).mockReturnValue(authenticated ? "tok" : null);
  vi.mocked(authApi.me).mockResolvedValue(MOCK_USER as never);
  return render(
      <AuthSessionProvider>
        <BookmarkButton postId="p1" />
      </AuthSessionProvider>,
  );
}

beforeEach(() => {
  mockPush.mockClear();
  vi.clearAllMocks();
});

describe("BookmarkButton", () => {
  it("挂载时通过状态端点获取初始收藏态", async () => {
    vi.mocked(bookmarksApi.status).mockResolvedValue({ post_id: "p1", bookmarked: true });
    renderWithSession(true);

    const btn = await screen.findByRole("button", { name: /已收藏/ });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(bookmarksApi.status).toHaveBeenCalledWith("p1");
  });

  it("点击切换收藏并刷新图标态", async () => {
    vi.mocked(bookmarksApi.status).mockResolvedValue({ post_id: "p1", bookmarked: false });
    vi.mocked(bookmarksApi.toggle).mockResolvedValue({ post_id: "p1", bookmarked: true });
    const user = userEvent.setup();
    renderWithSession(true);

    await user.click(await screen.findByRole("button", { name: /收藏/ }));
    expect(bookmarksApi.toggle).toHaveBeenCalledWith("p1");
    await waitFor(() =>
        expect(screen.getByRole("button", { name: /已收藏/ })).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("状态查询失败展示错误与重试", async () => {
    vi.mocked(bookmarksApi.status).mockRejectedValueOnce(new Error("boom"));
    renderWithSession(true);

    expect(await screen.findByText("服务异常，请稍后重试")).toBeInTheDocument();
    expect(bookmarksApi.toggle).not.toHaveBeenCalled();
  });

  it("未登录点击跳转登录", async () => {
    const user = userEvent.setup();
    renderWithSession(false);

    // 未登录以中性态呈现（收藏按钮可见）
    const btn = await screen.findByRole("button", { name: /收藏/ });
    await user.click(btn);
    expect(mockPush).toHaveBeenCalledWith("/login?redirect=/posts/p1");
  });
});
