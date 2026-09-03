import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthSessionProvider } from "@/lib/auth/session";
import { authApi } from "@/lib/auth/api";
import { tokenStore } from "@/lib/auth/tokens";
import { SpotCommentSection } from "./SpotCommentSection";

const { api } = vi.hoisted(() => ({
  api: { list: vi.fn(), replies: vi.fn(), create: vi.fn(), remove: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/auth/tokens", () => ({
  tokenStore: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(() => null),
    set: vi.fn(),
    clear: vi.fn(),
  },
}));
vi.mock("@/lib/auth/api", () => ({ authApi: { me: vi.fn(), logout: vi.fn() } }));
vi.mock("@/lib/spot-comments/api", () => ({
  spotCommentsApi: { list: vi.fn(), replies: vi.fn(), create: vi.fn(), remove: vi.fn() },
  makeSpotCommentApi: vi.fn(() => api),
}));
vi.mock("@/lib/spot-comments/messages", () => ({
  describeSpotCommentError: () => "服务异常，请稍后重试",
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
  spot_slug: "s1",
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
      <SpotCommentSection slug="s1" />
    </AuthSessionProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SpotCommentSection", () => {
  it("登录后加载并渲染顶层评论", async () => {
    api.list.mockResolvedValue({ content: [COMMENT], last: true, size: 20 });
    renderWithSession(true);

    expect(await screen.findByText("第一条评论")).toBeInTheDocument();
  });

  it("空列表展示空态", async () => {
    api.list.mockResolvedValue({ content: [], last: true, size: 20 });
    renderWithSession(true);

    expect(await screen.findByText("还没有评论，来抢沙发吧")).toBeInTheDocument();
  });

  it("发布顶层评论后列表出现新评论", async () => {
    api.list.mockResolvedValue({ content: [COMMENT], last: true, size: 20 });
    api.create.mockResolvedValue({ ...COMMENT, id: "c2", content: "我来了" });
    const user = userEvent.setup();
    renderWithSession(true);

    await screen.findByText("第一条评论");
    await user.type(screen.getByLabelText(/发表评论/), "我来了");
    await user.click(screen.getByRole("button", { name: "发布" }));

    expect(api.create).toHaveBeenCalledWith("我来了");
    await waitFor(() => expect(screen.getByText("我来了")).toBeInTheDocument());
  });

  it("发布失败回滚并提示", async () => {
    api.list.mockResolvedValue({ content: [], last: true, size: 20 });
    api.create.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderWithSession(true);

    await screen.findByText("还没有评论，来抢沙发吧");
    await user.type(screen.getByLabelText(/发表评论/), "我来了");
    await user.click(screen.getByRole("button", { name: "发布" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("服务异常");
    await waitFor(() => expect(screen.queryByText("我来了")).not.toBeInTheDocument());
  });

  it("未登录展示登录 gate", async () => {
    renderWithSession(false);
    expect(await screen.findByText("登录后参与讨论")).toBeInTheDocument();
  });

  it("展开回复并加载回复列表", async () => {
    api.list.mockResolvedValue({ content: [COMMENT], last: true, size: 20 });
    api.replies.mockResolvedValue({
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
    expect(api.replies).toHaveBeenCalledWith("c1", 0, 20);
    expect(await screen.findByText(/回复内容/)).toBeInTheDocument();
  });
});
