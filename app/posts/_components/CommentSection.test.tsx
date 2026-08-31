import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthSessionProvider } from "@/lib/auth/session";
import { authApi } from "@/lib/auth/api";
import { tokenStore } from "@/lib/auth/tokens";
import { commentsApi } from "@/lib/comments/api";
import { CommentSection } from "./CommentSection";

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
vi.mock("@/lib/comments/api", () => ({
  commentsApi: { list: vi.fn(), replies: vi.fn(), create: vi.fn(), remove: vi.fn() },
}));

const MOCK_USER = {
  id: "u1",
  email: "a@b.c",
  status: "ACTIVE",
  display_name: "Me",
  created_at: "2024-01-01T00:00:00Z",
};

const COMMENT = {
  id: "c1",
  post_id: "p1",
  user_id: "u1",
  author_name: "Alice",
  content: "第一条评论",
  created_at: "2024-05-01T10:00:00Z",
  reply_count: 0,
};

function renderWithSession(authenticated: boolean) {
  vi.mocked(tokenStore.getAccessToken).mockReturnValue(authenticated ? "tok" : null);
  vi.mocked(authApi.me).mockResolvedValue(MOCK_USER as never);
  return render(
      <AuthSessionProvider>
        <CommentSection postId="p1" />
      </AuthSessionProvider>,
  );
}

beforeEach(() => {
  mockPush.mockClear();
  vi.clearAllMocks();
});

describe("CommentSection", () => {
  it("登录后加载并渲染顶层评论", async () => {
    vi.mocked(commentsApi.list).mockResolvedValue({
      content: [COMMENT],
      last: true,
      size: 20,
    });
    renderWithSession(true);

    expect(await screen.findByText("第一条评论")).toBeInTheDocument();
  });

  it("空列表展示空态", async () => {
    vi.mocked(commentsApi.list).mockResolvedValue({
      content: [],
      last: true,
      size: 20,
    });
    renderWithSession(true);

    expect(await screen.findByText("还没有评论，来抢沙发吧")).toBeInTheDocument();
  });

  it("发布顶层评论后列表出现新评论", async () => {
    vi.mocked(commentsApi.list).mockResolvedValue({
      content: [COMMENT],
      last: true,
      size: 20,
    });
    vi.mocked(commentsApi.create).mockResolvedValue({
      ...COMMENT,
      id: "c2",
      content: "我来了",
    });
    const user = userEvent.setup();
    renderWithSession(true);

    await screen.findByText("第一条评论");
    await user.type(screen.getByLabelText(/发表评论/), "我来了");
    await user.click(screen.getByRole("button", { name: "发布" }));

    expect(commentsApi.create).toHaveBeenCalledWith("p1", { content: "我来了" });
    await waitFor(() => expect(screen.getByText("我来了")).toBeInTheDocument());
  });

  it("列表加载失败展示错误与重试", async () => {
    vi.mocked(commentsApi.list).mockRejectedValueOnce(new Error("boom"));
    renderWithSession(true);

    expect(await screen.findByText("服务异常，请稍后重试")).toBeInTheDocument();
  });

  it("未登录展示登录 gate", async () => {
    renderWithSession(false);

    expect(await screen.findByText("登录后参与讨论")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "去登录" })).toHaveAttribute(
        "href",
        "/login?redirect=/posts/p1",
    );
  });

  it("展开回复并加载回复列表", async () => {
    vi.mocked(commentsApi.list).mockResolvedValue({
      content: [COMMENT],
      last: true,
      size: 20,
    });
    vi.mocked(commentsApi.replies).mockResolvedValue({
      content: [
        { ...COMMENT, id: "r1", content: "回复内容", parent_comment_id: "c1", user_id: "u2", author_name: "Bob" },
      ],
      last: true,
      size: 20,
    });
    const user = userEvent.setup();
    renderWithSession(true);

    await screen.findByText("第一条评论");
    await user.click(screen.getByRole("button", { name: "回复" }));
    expect(commentsApi.replies).toHaveBeenCalledWith("c1", 0, 20);
    expect(await screen.findByText(/回复内容/)).toBeInTheDocument();
  });

  it("发布评论先乐观插入，不等待网络", async () => {
    vi.mocked(commentsApi.list).mockResolvedValue({
      content: [],
      last: true,
      size: 20,
    });
    vi.mocked(commentsApi.create).mockReturnValue(new Promise(() => {})); // 不 resolve
    const user = userEvent.setup();
    renderWithSession(true);

    await screen.findByText("还没有评论，来抢沙发吧");
    await user.type(screen.getByLabelText(/发表评论/), "我来了");
    await user.click(screen.getByRole("button", { name: "发布" }));

    // 乐观：立即出现在列表（即使 create 未返回）
    expect(screen.getByText("我来了")).toBeInTheDocument();
  });

  it("发布失败回滚并提示", async () => {
    vi.mocked(commentsApi.list).mockResolvedValue({
      content: [],
      last: true,
      size: 20,
    });
    vi.mocked(commentsApi.create).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderWithSession(true);

    await screen.findByText("还没有评论，来抢沙发吧");
    await user.type(screen.getByLabelText(/发表评论/), "我来了");
    await user.click(screen.getByRole("button", { name: "发布" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "polite");
    expect(alert).toHaveTextContent("服务异常");
    // 回滚：评论消失，回到空态
    await waitFor(() => expect(screen.queryByText("我来了")).not.toBeInTheDocument());
    expect(screen.getByText("还没有评论，来抢沙发吧")).toBeInTheDocument();
  });
});
